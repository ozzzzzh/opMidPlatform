import { Injectable } from '@nestjs/common';
import { Prisma, Priority, TicketCategory, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditDto } from './dto/query-audit.dto';

const STAFF_ACTIONS = ['TICKET_CLAIM', 'TICKET_RESOLVE', 'TICKET_CLOSE'] as const;

const TICKET_ACTIONS = [
  'TICKET_CREATE',
  'TICKET_CLAIM',
  'TICKET_RESOLVE',
  'TICKET_CLOSE',
  'TICKET_COMMENT',
] as const;

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.HARDWARE]: '硬件设备',
  [TicketCategory.SOFTWARE]: '办公软件',
  [TicketCategory.INTERNAL_SYSTEM]: '内部系统',
  [TicketCategory.ASSET_REQUEST]: '出库领用需求',
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: '待认领',
  [TicketStatus.CLAIMED]: '处理中',
  [TicketStatus.RESOLVED]: '已解决',
  [TicketStatus.CLOSED]: '已关闭',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.LOW]: '低',
  [Priority.MEDIUM]: '中',
  [Priority.HIGH]: '高',
  [Priority.URGENT]: '紧急',
  [Priority.SUPER_URGENT]: 'Super Urgent',
};

const CATEGORY_LABELS_EN: Record<TicketCategory, string> = {
  [TicketCategory.HARDWARE]: 'Hardware',
  [TicketCategory.SOFTWARE]: 'Software',
  [TicketCategory.INTERNAL_SYSTEM]: 'Internal system',
  [TicketCategory.ASSET_REQUEST]: 'Asset request',
};

const STATUS_LABELS_EN: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Open',
  [TicketStatus.CLAIMED]: 'In progress',
  [TicketStatus.RESOLVED]: 'Resolved',
  [TicketStatus.CLOSED]: 'Closed',
};

const PRIORITY_LABELS_EN: Record<Priority, string> = {
  [Priority.LOW]: 'Low',
  [Priority.MEDIUM]: 'Medium',
  [Priority.HIGH]: 'High',
  [Priority.URGENT]: 'Urgent',
  [Priority.SUPER_URGENT]: 'Super Urgent',
};

export interface AuditReport {
  range: {
    days: number;
    from: string;
    to: string;
  };
  summary: {
    submitted: number;
    today: number;
    pending: number;
    resolved: number;
    closed: number;
    superUrgent: number;
    avgResolutionHours: number | null;
    staffActions: number;
  };
  trend: Array<{ date: string; submitted: number; resolved: number }>;
  categories: Array<{ category: TicketCategory; count: number }>;
  staff: Array<{
    userId: string;
    username: string;
    displayName: string;
    claimed: number;
    resolved: number;
    closed: number;
    total: number;
  }>;
  recentActions: Array<{
    id: string;
    action: string;
    createdAt: Date;
    user: {
      id: string;
      username: string;
      displayName: string;
    } | null;
    ticket: {
      ticketNo: string;
      title: string;
      reporterName: string | null;
    } | null;
  }>;
}

interface ReportRange {
  days: number;
  dateKeys: string[];
  start: Date;
  now: Date;
}

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

function reportRange(days: number): ReportRange {
  const now = new Date();
  const dateKeys: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    dateKeys.push(shanghaiDateKey(new Date(now.getTime() - offset * 24 * 60 * 60 * 1000)));
  }

  return {
    days,
    dateKeys,
    start: new Date(`${dateKeys[0]}T00:00:00+08:00`),
    now,
  };
}

function formatDateTime(date: Date | null): string {
  if (!date) return '';
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export interface AuditRecordInput {
  userId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: Prisma.InputJsonValue;
  ip?: string | null;
  ticketId?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        detail: input.detail,
        ip: input.ip ?? null,
        ticketId: input.ticketId ?? null,
      },
    });
  }

  async list(query: QueryAuditDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.AuditLogWhereInput = {};

    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, username: true, displayName: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async report(days: number): Promise<AuditReport> {
    const range = reportRange(days);
    const todayStart = new Date(`${shanghaiDateKey(range.now)}T00:00:00+08:00`);
    const baseWhere: Prisma.TicketWhereInput = {
      createdAt: { gte: range.start, lte: range.now },
    };

    const [
      submitted,
      today,
      statusGroups,
      superUrgent,
      categoryGroups,
      createdRows,
      resolvedRows,
      avgRows,
      staffGroups,
      recentActions,
    ] = await Promise.all([
      this.prisma.ticket.count({ where: baseWhere }),
      this.prisma.ticket.count({
        where: { createdAt: { gte: todayStart, lte: range.now } },
      }),
      this.prisma.ticket.groupBy({
        by: ['status'],
        where: baseWhere,
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.ticket.count({
        where: { ...baseWhere, priority: Priority.SUPER_URGENT },
      }),
      this.prisma.ticket.groupBy({
        by: ['category'],
        where: baseWhere,
        orderBy: { category: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<Array<{ date: string; count: number }>>`
        SELECT to_char("createdAt" + interval '8 hours', 'YYYY-MM-DD') AS date,
               count(*)::int AS count
        FROM "Ticket"
        WHERE "createdAt" >= ${range.start} AND "createdAt" <= ${range.now}
        GROUP BY 1
        ORDER BY 1
      `,
      this.prisma.$queryRaw<Array<{ date: string; count: number }>>`
        SELECT to_char("resolvedAt" + interval '8 hours', 'YYYY-MM-DD') AS date,
               count(*)::int AS count
        FROM "Ticket"
        WHERE "resolvedAt" >= ${range.start} AND "resolvedAt" <= ${range.now}
        GROUP BY 1
        ORDER BY 1
      `,
      this.prisma.$queryRaw<Array<{ avgHours: number | null }>>`
        SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600)::float AS "avgHours"
        FROM "Ticket"
        WHERE "resolvedAt" >= ${range.start} AND "resolvedAt" <= ${range.now}
      `,
      this.prisma.auditLog.groupBy({
        by: ['userId', 'action'],
        where: {
          createdAt: { gte: range.start, lte: range.now },
          userId: { not: null },
          action: { in: [...STAFF_ACTIONS] },
        },
        orderBy: [{ userId: 'asc' }, { action: 'asc' }],
        _count: { _all: true },
      }),
      this.prisma.auditLog.findMany({
        where: {
          createdAt: { gte: range.start, lte: range.now },
          action: { in: [...TICKET_ACTIONS] },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: {
            select: { id: true, username: true, displayName: true },
          },
          ticket: {
            select: { ticketNo: true, title: true, reporterName: true },
          },
        },
      }),
    ]);

    const statusCount = (status: TicketStatus): number => {
      const count = statusGroups.find((group) => group.status === status)?._count;
      return count ? (count._all ?? 0) : 0;
    };

    const categoryCount = (category: TicketCategory): number => {
      const count = categoryGroups.find((group) => group.category === category)?._count;
      return count ? (count._all ?? 0) : 0;
    };

    const createdByDate = new Map(createdRows.map((row) => [row.date, row.count]));
    const resolvedByDate = new Map(resolvedRows.map((row) => [row.date, row.count]));

    const staffCounts = new Map<string, { claimed: number; resolved: number; closed: number }>();

    for (const group of staffGroups) {
      const userId = group.userId;
      if (!userId) continue;

      const count = group._count;
      const amount = count ? (count._all ?? 0) : 0;
      const current = staffCounts.get(userId) ?? {
        claimed: 0,
        resolved: 0,
        closed: 0,
      };

      if (group.action === 'TICKET_CLAIM') current.claimed += amount;
      if (group.action === 'TICKET_RESOLVE') current.resolved += amount;
      if (group.action === 'TICKET_CLOSE') current.closed += amount;
      staffCounts.set(userId, current);
    }

    const userIds = [...staffCounts.keys()];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, displayName: true },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));

    const staff = [...staffCounts.entries()]
      .map(([userId, counts]) => {
        const user = userMap.get(userId);
        return {
          userId,
          username: user?.username ?? '',
          displayName: user?.displayName ?? '未知用户',
          ...counts,
          total: counts.claimed + counts.resolved + counts.closed,
        };
      })
      .sort((a, b) => b.total - a.total);

    const avgResolutionHours =
      avgRows[0]?.avgHours === null || avgRows[0]?.avgHours === undefined
        ? null
        : Number(avgRows[0].avgHours);

    const open = statusCount(TicketStatus.OPEN);
    const claimed = statusCount(TicketStatus.CLAIMED);

    return {
      range: {
        days,
        from: range.start.toISOString(),
        to: range.now.toISOString(),
      },
      summary: {
        submitted,
        today,
        pending: open + claimed,
        resolved: statusCount(TicketStatus.RESOLVED),
        closed: statusCount(TicketStatus.CLOSED),
        superUrgent,
        avgResolutionHours,
        staffActions: staff.reduce((total, item) => total + item.total, 0),
      },
      trend: range.dateKeys.map((date) => ({
        date,
        submitted: createdByDate.get(date) ?? 0,
        resolved: resolvedByDate.get(date) ?? 0,
      })),
      categories: Object.values(TicketCategory).map((category) => ({
        category,
        count: categoryCount(category),
      })),
      staff,
      recentActions,
    };
  }

  async exportCsv(
    days: number,
    lang: 'zh' | 'en' = 'zh',
  ): Promise<{ filename: string; csv: string }> {
    const report = await this.report(days);
    const range = reportRange(days);
    const tickets = await this.prisma.ticket.findMany({
      where: { createdAt: { gte: range.start, lte: range.now } },
      include: {
        assignee: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const english = lang === 'en';
    const categoryLabels = english ? CATEGORY_LABELS_EN : CATEGORY_LABELS;
    const statusLabels = english ? STATUS_LABELS_EN : STATUS_LABELS;
    const priorityLabels = english ? PRIORITY_LABELS_EN : PRIORITY_LABELS;
    const text = english
      ? {
          title: 'IT Ticket Audit Report',
          range: 'Range (days)',
          from: 'From',
          to: 'To',
          generated: 'Generated at',
          summary: 'Summary',
          value: 'Value',
          submitted: 'Submitted',
          today: 'New today',
          pending: 'Pending',
          resolved: 'Resolved',
          closed: 'Closed',
          superUrgent: 'Super Urgent',
          avgHours: 'Avg. resolution (hours)',
          staffActions: 'Staff actions',
          trend: 'Daily trend',
          submittedCol: 'Submitted',
          resolvedCol: 'Resolved',
          categoryDist: 'Category distribution',
          count: 'Tickets',
          staffDist: 'Staff activity',
          staff: 'Staff',
          claimed: 'Claimed',
          resolvedAction: 'Resolved',
          closedAction: 'Closed',
          total: 'Total',
          ticketDetails: 'Ticket details',
          ticketNo: 'Ticket number',
          ticketTitle: 'Title',
          reporter: 'Reporter',
          category: 'Category',
          status: 'Status',
          priority: 'Priority',
          assignee: 'Assignee',
          createdAt: 'Created',
          expectedAt: 'Expected completion',
          claimedAt: 'Received',
          resolvedAt: 'Resolved at',
          closedAt: 'Closed at',
          resolution: 'Resolution',
        }
      : {
          title: 'IT 运维工单审计报告',
          range: '统计区间（天）',
          from: '开始时间',
          to: '结束时间',
          generated: '生成时间',
          summary: '汇总指标',
          value: '数值',
          submitted: '新增工单',
          today: '今日新增',
          pending: '待处理',
          resolved: '已解决',
          closed: '已关闭',
          superUrgent: 'Super Urgent',
          avgHours: '平均解决时长（小时）',
          staffActions: '服务处理动作数',
          trend: '每日趋势',
          submittedCol: '新增工单',
          resolvedCol: '解决工单',
          categoryDist: '问题类型',
          count: '工单数',
          staffDist: '服务人员',
          staff: '服务人员',
          claimed: '认领',
          resolvedAction: '解决',
          closedAction: '关闭',
          total: '合计',
          ticketDetails: '工单明细',
          ticketNo: '工单号',
          ticketTitle: '标题',
          reporter: '姓名',
          category: '类型',
          status: '状态',
          priority: '优先级',
          assignee: '处理人',
          createdAt: '创建时间',
          expectedAt: '期望完成时间',
          claimedAt: '查收时间',
          resolvedAt: '解决时间',
          closedAt: '关闭时间',
          resolution: '解决说明',
        };

    const lines: string[][] = [
      [text.title],
      [text.range, String(report.range.days)],
      [text.from, formatDateTime(new Date(report.range.from))],
      [text.to, formatDateTime(new Date(report.range.to))],
      [text.generated, formatDateTime(new Date())],
      [],
      [text.summary, text.value],
      [text.submitted, String(report.summary.submitted)],
      [text.today, String(report.summary.today)],
      [text.pending, String(report.summary.pending)],
      [text.resolved, String(report.summary.resolved)],
      [text.closed, String(report.summary.closed)],
      [text.superUrgent, String(report.summary.superUrgent)],
      [
        text.avgHours,
        report.summary.avgResolutionHours === null
          ? '-'
          : report.summary.avgResolutionHours.toFixed(2),
      ],
      [text.staffActions, String(report.summary.staffActions)],
      [],
      [text.trend, text.submittedCol, text.resolvedCol],
      ...report.trend.map((item) => [item.date, String(item.submitted), String(item.resolved)]),
      [],
      [text.categoryDist, text.count],
      ...report.categories.map((item) => [categoryLabels[item.category], String(item.count)]),
      [],
      [text.staffDist, text.claimed, text.resolvedAction, text.closedAction, text.total],
      ...report.staff.map((item) => [
        item.displayName,
        String(item.claimed),
        String(item.resolved),
        String(item.closed),
        String(item.total),
      ]),
      [],
      [
        text.ticketNo,
        text.ticketTitle,
        text.reporter,
        text.category,
        text.status,
        text.priority,
        text.assignee,
        text.createdAt,
        text.expectedAt,
        text.claimedAt,
        text.resolvedAt,
        text.closedAt,
        text.resolution,
      ],
      ...tickets.map((ticket) => [
        ticket.ticketNo,
        ticket.title,
        ticket.reporterName ?? '',
        categoryLabels[ticket.category],
        statusLabels[ticket.status],
        priorityLabels[ticket.priority],
        ticket.assignee?.displayName ?? '',
        formatDateTime(ticket.createdAt),
        formatDateTime(ticket.expectedAt),
        formatDateTime(ticket.claimedAt),
        formatDateTime(ticket.resolvedAt),
        formatDateTime(ticket.closedAt),
        ticket.resolution ?? '',
      ]),
    ];

    const csv =
      String.fromCharCode(0xfeff) + lines.map((line) => line.map(csvCell).join(',')).join('\r\n');
    const filename = `it-audit-report-${report.range.days}d-${shanghaiDateKey(new Date()).replace(
      /-/g,
      '',
    )}${english ? '-en' : ''}.csv`;

    return { filename, csv };
  }
}
