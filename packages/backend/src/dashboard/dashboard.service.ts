import { Injectable } from '@nestjs/common';
import { Prisma, TicketCategory, TicketStatus } from '@prisma/client';
import { SafeUser } from '../common/types/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_STATUSES = [TicketStatus.OPEN, TicketStatus.CLAIMED];

const DASHBOARD_TICKET_SELECT = {
  id: true,
  ticketNo: true,
  title: true,
  status: true,
  priority: true,
  expectedAt: true,
  createdAt: true,
  updatedAt: true,
  reporterName: true,
  assignee: { select: { displayName: true } },
} satisfies Prisma.TicketSelect;

type DashboardTicketRow = Prisma.TicketGetPayload<{ select: typeof DASHBOARD_TICKET_SELECT }>;

function shanghaiDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function shanghaiDayStart(date: Date): Date {
  return new Date(`${shanghaiDateKey(date)}T00:00:00+08:00`);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async report(actor: SafeUser) {
    const now = new Date();
    const todayStart = shanghaiDayStart(now);
    const dueSoonEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const agingThreshold = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const staleThreshold = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const dateKeys: string[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      dateKeys.push(shanghaiDateKey(new Date(now.getTime() - offset * 24 * 60 * 60 * 1000)));
    }
    const rangeStart = new Date(`${dateKeys[0]}T00:00:00+08:00`);

    const [
      today,
      open,
      claimed,
      resolvedToday,
      overdue,
      dueSoon,
      superUrgent,
      avgRows,
      categoryGroups,
      createdRows,
      resolvedRows,
      myQueue,
      attention,
      recent,
      workloadGroups,
    ] = await Promise.all([
      this.prisma.ticket.count({ where: { createdAt: { gte: todayStart, lte: now } } }),
      this.prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
      this.prisma.ticket.count({ where: { status: TicketStatus.CLAIMED } }),
      this.prisma.ticket.count({ where: { resolvedAt: { gte: todayStart, lte: now } } }),
      this.prisma.ticket.count({
        where: { status: { in: ACTIVE_STATUSES }, expectedAt: { lt: now } },
      }),
      this.prisma.ticket.count({
        where: {
          status: { in: ACTIVE_STATUSES },
          expectedAt: { gte: now, lte: dueSoonEnd },
        },
      }),
      this.prisma.ticket.count({
        where: { status: { in: ACTIVE_STATUSES }, priority: 'SUPER_URGENT' },
      }),
      this.prisma.$queryRaw<Array<{ avgHours: number | null }>>`
        SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600)::float AS "avgHours"
        FROM "Ticket"
        WHERE "resolvedAt" >= ${rangeStart} AND "resolvedAt" <= ${now}
      `,
      this.prisma.ticket.groupBy({
        by: ['category'],
        where: { createdAt: { gte: rangeStart, lte: now } },
        orderBy: { category: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<Array<{ date: string; count: number }>>`
        SELECT to_char("createdAt" + interval '8 hours', 'YYYY-MM-DD') AS date,
               count(*)::int AS count
        FROM "Ticket"
        WHERE "createdAt" >= ${rangeStart} AND "createdAt" <= ${now}
        GROUP BY 1
      `,
      this.prisma.$queryRaw<Array<{ date: string; count: number }>>`
        SELECT to_char("resolvedAt" + interval '8 hours', 'YYYY-MM-DD') AS date,
               count(*)::int AS count
        FROM "Ticket"
        WHERE "resolvedAt" >= ${rangeStart} AND "resolvedAt" <= ${now}
        GROUP BY 1
      `,
      this.prisma.ticket.findMany({
        where: { assigneeId: actor.id, status: { in: ACTIVE_STATUSES } },
        select: DASHBOARD_TICKET_SELECT,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: 6,
      }),
      this.prisma.ticket.findMany({
        where: {
          status: { in: ACTIVE_STATUSES },
          OR: [
            { expectedAt: { lt: now } },
            { expectedAt: { gte: now, lte: dueSoonEnd } },
            { priority: 'SUPER_URGENT' },
            { status: TicketStatus.OPEN, createdAt: { lte: agingThreshold } },
            { status: TicketStatus.CLAIMED, updatedAt: { lte: staleThreshold } },
          ],
        },
        select: DASHBOARD_TICKET_SELECT,
        take: 40,
      }),
      this.prisma.ticket.findMany({
        select: DASHBOARD_TICKET_SELECT,
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.ticket.groupBy({
        by: ['assigneeId'],
        where: { status: { in: ACTIVE_STATUSES }, assigneeId: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const createdByDate = new Map(createdRows.map((row) => [row.date, row.count]));
    const resolvedByDate = new Map(resolvedRows.map((row) => [row.date, row.count]));

    const reasonsOf = (ticket: DashboardTicketRow): string[] => {
      const reasons: string[] = [];
      if (ticket.expectedAt && ticket.expectedAt < now) reasons.push('OVERDUE');
      if (ticket.priority === 'SUPER_URGENT') reasons.push('SUPER_URGENT');
      if (ticket.expectedAt && ticket.expectedAt >= now && ticket.expectedAt <= dueSoonEnd) {
        reasons.push('DUE_SOON');
      }
      if (ticket.status === TicketStatus.OPEN && ticket.createdAt <= agingThreshold) {
        reasons.push('UNASSIGNED_AGING');
      }
      if (ticket.status === TicketStatus.CLAIMED && ticket.updatedAt <= staleThreshold) {
        reasons.push('STALE');
      }
      return reasons;
    };

    const toTicket = (ticket: DashboardTicketRow) => ({
      id: ticket.id,
      ticketNo: ticket.ticketNo,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      expectedAt: ticket.expectedAt?.toISOString() ?? null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      reporterName: ticket.reporterName,
      assigneeName: ticket.assignee?.displayName ?? null,
      reasons: reasonsOf(ticket),
    });

    const severity = (ticket: { reasons: string[] }): number => {
      if (ticket.reasons.includes('OVERDUE')) return 0;
      if (ticket.reasons.includes('SUPER_URGENT')) return 1;
      if (ticket.reasons.includes('DUE_SOON')) return 2;
      if (ticket.reasons.includes('UNASSIGNED_AGING')) return 3;
      return 4;
    };
    const attentionTickets = attention
      .map((ticket) => toTicket(ticket))
      .filter((ticket) => ticket.reasons.length > 0)
      .sort((a, b) => {
        const offset = severity(a) - severity(b);
        if (offset !== 0) return offset;
        return b.createdAt.localeCompare(a.createdAt);
      })
      .slice(0, 8);

    const assigneeIds = workloadGroups
      .map((group) => group.assigneeId)
      .filter((id): id is string => Boolean(id));
    const users = await this.prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, displayName: true },
    });
    const userMap = new Map(users.map((user) => [user.id, user.displayName]));
    const workload = workloadGroups
      .map((group) => ({
        userId: group.assigneeId as string,
        displayName: userMap.get(group.assigneeId as string) ?? '未知用户',
        active: group._count._all,
      }))
      .sort((a, b) => b.active - a.active)
      .slice(0, 6);

    const avgResolutionHours =
      avgRows[0]?.avgHours === null || avgRows[0]?.avgHours === undefined
        ? null
        : Number(avgRows[0].avgHours);

    return {
      summary: {
        today,
        open,
        claimed,
        resolvedToday,
        overdue,
        dueSoon,
        superUrgent,
        avgResolutionHours,
      },
      trend: dateKeys.map((date) => ({
        date,
        submitted: createdByDate.get(date) ?? 0,
        resolved: resolvedByDate.get(date) ?? 0,
      })),
      categories: Object.values(TicketCategory).map((category) => ({
        category,
        count: categoryGroups.find((group) => group.category === category)?._count._all ?? 0,
      })),
      myQueue: myQueue.map((ticket) => toTicket(ticket)),
      attention: attentionTickets,
      recent: recent.map((ticket) => toTicket(ticket)),
      workload,
    };
  }
}
