import { randomBytes } from 'node:crypto';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommentType, Prisma, Priority, TicketSource, TicketStatus } from '@prisma/client';
import { SafeUser } from '../common/types/authenticated-user.interface';
import { decodeUploadFilename } from '../common/utils/decode-filename';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffTicketDto } from './dto/create-staff-ticket.dto';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';

const SAFE_USER_BRIEF = {
  id: true,
  username: true,
  displayName: true,
} satisfies Prisma.UserSelect;

const TICKET_LIST_INCLUDE = {
  assignee: { select: SAFE_USER_BRIEF },
  submitter: { select: SAFE_USER_BRIEF },
  _count: { select: { comments: true } },
} satisfies Prisma.TicketInclude;

const TICKET_DETAIL_INCLUDE = {
  ...TICKET_LIST_INCLUDE,
  comments: {
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: SAFE_USER_BRIEF },
    },
  },
  attachments: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
  },
} satisfies Prisma.TicketInclude;

const MIME_EXTENSION: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const TRACKING_SELECT = {
  ticketNo: true,
  title: true,
  category: true,
  priority: true,
  status: true,
  reporterName: true,
  createdAt: true,
  expectedAt: true,
  claimedAt: true,
  resolvedAt: true,
  closedAt: true,
  resolution: true,
  updatedAt: true,
  assignee: {
    select: { displayName: true },
  },
} satisfies Prisma.TicketSelect;

function generateAccessCode(length = 10): string {
  const bytes = randomBytes(length);
  let code = '';
  for (const byte of bytes) {
    code += ACCESS_CODE_ALPHABET[byte % ACCESS_CODE_ALPHABET.length];
  }
  return code;
}

interface StoredUpload {
  storedPath: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface TicketSummary {
  open: number;
  claimed: number;
  resolved: number;
  closed: number;
  today: number;
  total: number;
  overdue: number;
  dueSoon: number;
  unassignedAging: number;
}

function shanghaiDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item) => item.type === type)?.value ?? '';

  return `${part('year')}${part('month')}${part('day')}`;
}

function deriveTitle(description: string): string {
  const firstLine = description.split(/\r?\n/).find((line) => line.trim()) ?? description;
  const firstSentence = firstLine.split(/[。！？!?；;]/)[0]?.trim() || firstLine.trim();
  return firstSentence.length > 40 ? `${firstSentence.slice(0, 40)}…` : firstSentence;
}

function shanghaiDayStart(now: Date = new Date()): Date {
  const key = shanghaiDateKey(now);
  return new Date(`${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}T00:00:00+08:00`);
}

@Injectable()
export class TicketsService {
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.uploadDir = resolve(config.get<string>('UPLOAD_DIR') ?? './uploads');
  }

  async create(dto: CreateTicketDto, files: Express.Multer.File[] = []) {
    return this.createTicket(dto, files);
  }

  async createStaff(
    dto: CreateStaffTicketDto,
    files: Express.Multer.File[] = [],
    actor?: SafeUser,
  ) {
    const assignee = dto.assignToMe && actor ? actor : undefined;
    const ticket = await this.createTicket(dto, files, assignee);
    return this.findOne(ticket.id);
  }

  private async createTicket(
    dto: CreateTicketDto,
    files: Express.Multer.File[],
    assignee?: SafeUser,
  ) {
    const description = dto.description.trim();
    const title = dto.title?.trim() || deriveTitle(description);
    const publicToken = randomBytes(18).toString('base64url');
    const accessCode = generateAccessCode();
    const expectedAt = dto.expectedAt ? new Date(dto.expectedAt) : null;

    if (expectedAt && expectedAt.getTime() <= Date.now()) {
      throw new BadRequestException('期望完成时间必须晚于当前时间');
    }

    const storedFiles = await this.storeFiles(files);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const dateKey = shanghaiDateKey();
        const rows = await tx.$queryRaw<Array<{ value: number }>>`
          INSERT INTO "TicketSequence" ("date", "value")
          VALUES (${dateKey}, 1)
          ON CONFLICT ("date") DO UPDATE SET "value" = "TicketSequence"."value" + 1
          RETURNING "value"
        `;
        const sequence = Number(rows[0]?.value ?? 1);
        const ticketNo = `T-${dateKey}-${String(sequence).padStart(4, '0')}`;

        const ticket = await tx.ticket.create({
          data: {
            ticketNo,
            title,
            category: dto.category,
            description,
            priority: dto.priority ?? Priority.MEDIUM,
            source: dto.source ?? TicketSource.WEB,
            reporterName: dto.reporterName,
            publicToken,
            accessCode,
            expectedAt,
            ...(assignee
              ? {
                  status: TicketStatus.CLAIMED,
                  assigneeId: assignee.id,
                  claimedAt: new Date(),
                }
              : {}),
          },
          select: {
            id: true,
            ticketNo: true,
            title: true,
            category: true,
            status: true,
            priority: true,
            source: true,
            reporterName: true,
            publicToken: true,
            accessCode: true,
            expectedAt: true,
            createdAt: true,
          },
        });

        if (storedFiles.length > 0) {
          await tx.ticketAttachment.createMany({
            data: storedFiles.map((file) => ({
              ticketId: ticket.id,
              filename: file.filename,
              storedPath: file.storedPath,
              mimeType: file.mimeType,
              size: file.size,
            })),
          });
        }

        if (assignee) {
          await tx.ticketComment.create({
            data: {
              ticketId: ticket.id,
              authorId: assignee.id,
              type: CommentType.SYSTEM,
              content: `${assignee.displayName} 创建并认领了工单`,
            },
          });
        }

        return ticket;
      });
    } catch (error) {
      await this.removeStoredFiles(storedFiles);
      throw error;
    }
  }

  async addAttachments(id: string, files: Express.Multer.File[], actor: SafeUser) {
    if (files.length === 0) {
      throw new BadRequestException('请选择要上传的图片');
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }

    const storedFiles = await this.storeFiles(files);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.ticketAttachment.createMany({
          data: storedFiles.map((file) => ({
            ticketId: id,
            filename: file.filename,
            storedPath: file.storedPath,
            mimeType: file.mimeType,
            size: file.size,
            uploadedBy: actor.id,
          })),
        });

        await tx.ticketComment.create({
          data: {
            ticketId: id,
            authorId: actor.id,
            type: CommentType.SYSTEM,
            content: `${actor.displayName} 上传了 ${storedFiles.length} 张图片`,
          },
        });
      });
    } catch (error) {
      await this.removeStoredFiles(storedFiles);
      throw error;
    }

    return this.findOne(id);
  }

  private async storeFiles(files: Express.Multer.File[]): Promise<StoredUpload[]> {
    if (files.length === 0) return [];

    await mkdir(this.uploadDir, { recursive: true });

    const stored: StoredUpload[] = [];
    try {
      for (const file of files) {
        const extension = MIME_EXTENSION[file.mimetype] ?? '';
        const storedPath = `${randomBytes(18).toString('hex')}${extension}`;
        await writeFile(join(this.uploadDir, storedPath), file.buffer);
        stored.push({
          storedPath,
          filename: decodeUploadFilename(file.originalname).slice(0, 255),
          mimeType: file.mimetype,
          size: file.size,
        });
      }
    } catch (error) {
      await this.removeStoredFiles(stored);
      throw error;
    }

    return stored;
  }

  private async removeStoredFiles(files: StoredUpload[]): Promise<void> {
    await Promise.all(
      files.map((file) => unlink(join(this.uploadDir, file.storedPath)).catch(() => undefined)),
    );
  }

  async list(query: QueryTicketsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const baseWhere: Prisma.TicketWhereInput = {};

    if (query.keyword) {
      baseWhere.OR = [
        { ticketNo: { contains: query.keyword, mode: 'insensitive' } },
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { description: { contains: query.keyword, mode: 'insensitive' } },
        { reporterName: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    if (query.category) baseWhere.category = query.category;
    if (query.priority) baseWhere.priority = query.priority;
    if (query.source) baseWhere.source = query.source;
    if (query.assigneeId) baseWhere.assigneeId = query.assigneeId;
    if (query.from || query.to) {
      baseWhere.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const now = new Date();
    const dueSoonEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const agingThreshold = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const activeStatuses = [TicketStatus.OPEN, TicketStatus.CLAIMED];
    const attentionWhere: Prisma.TicketWhereInput =
      query.attention === 'overdue'
        ? { status: { in: activeStatuses }, expectedAt: { lt: now } }
        : query.attention === 'dueSoon'
          ? { status: { in: activeStatuses }, expectedAt: { gte: now, lte: dueSoonEnd } }
          : query.attention === 'unassignedAging'
            ? { status: TicketStatus.OPEN, createdAt: { lte: agingThreshold } }
            : {};

    const where: Prisma.TicketWhereInput = {
      ...baseWhere,
      ...(query.status ? { status: query.status } : {}),
      ...attentionWhere,
    };
    const todayStart = shanghaiDayStart();

    const [items, total, statusGroups, baseTotal, today, overdue, dueSoon, unassignedAging] =
      await this.prisma.$transaction([
        this.prisma.ticket.findMany({
          where,
          include: TICKET_LIST_INCLUDE,
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.ticket.count({ where }),
        this.prisma.ticket.groupBy({
          by: ['status'],
          where: baseWhere,
          orderBy: { status: 'asc' },
          _count: { _all: true },
        }),
        this.prisma.ticket.count({ where: baseWhere }),
        this.prisma.ticket.count({
          where: { ...baseWhere, createdAt: { gte: todayStart } },
        }),
        this.prisma.ticket.count({
          where: { ...baseWhere, status: { in: activeStatuses }, expectedAt: { lt: now } },
        }),
        this.prisma.ticket.count({
          where: {
            ...baseWhere,
            status: { in: activeStatuses },
            expectedAt: { gte: now, lte: dueSoonEnd },
          },
        }),
        this.prisma.ticket.count({
          where: { ...baseWhere, status: TicketStatus.OPEN, createdAt: { lte: agingThreshold } },
        }),
      ]);

    const countByStatus = (status: TicketStatus): number => {
      const count = statusGroups.find((group) => group.status === status)?._count;
      return count && count !== true ? (count._all ?? 0) : 0;
    };

    const summary: TicketSummary = {
      open: countByStatus(TicketStatus.OPEN),
      claimed: countByStatus(TicketStatus.CLAIMED),
      resolved: countByStatus(TicketStatus.RESOLVED),
      closed: countByStatus(TicketStatus.CLOSED),
      today,
      total: baseTotal,
      overdue,
      dueSoon,
      unassignedAging,
    };

    return { items, total, page, pageSize, summary };
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: TICKET_DETAIL_INCLUDE,
    });

    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }

    return ticket;
  }

  async track(publicToken: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { publicToken },
      select: TRACKING_SELECT,
    });

    if (!ticket) {
      throw new NotFoundException('未找到工单进度');
    }

    return ticket;
  }

  async lookup(ticketNo: string, accessCode: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketNo },
      select: {
        ...TRACKING_SELECT,
        publicToken: true,
        accessCode: true,
      },
    });

    if (!ticket || ticket.accessCode !== accessCode) {
      throw new NotFoundException('工单号或查询码不正确');
    }

    const { accessCode: _accessCode, ...result } = ticket;
    return result;
  }

  async claim(id: string, actor: SafeUser) {
    await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
        select: { status: true },
      });

      if (!ticket) throw new NotFoundException('工单不存在');
      if (ticket.status !== TicketStatus.OPEN) {
        throw new BadRequestException('仅待认领的工单可以认领');
      }

      const updated = await tx.ticket.updateMany({
        where: { id, status: TicketStatus.OPEN },
        data: {
          status: TicketStatus.CLAIMED,
          assigneeId: actor.id,
          claimedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        throw new BadRequestException('工单状态已变化，请刷新后重试');
      }

      await tx.ticketComment.create({
        data: {
          ticketId: id,
          authorId: actor.id,
          type: CommentType.SYSTEM,
          content: `${actor.displayName} 认领了工单`,
        },
      });
    });

    return this.findOne(id);
  }

  async resolve(id: string, dto: ResolveTicketDto, actor: SafeUser) {
    await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
        select: { status: true },
      });

      if (!ticket) throw new NotFoundException('工单不存在');
      if (ticket.status !== TicketStatus.CLAIMED) {
        throw new BadRequestException('仅处理中的工单可以标记解决');
      }

      const updated = await tx.ticket.updateMany({
        where: { id, status: TicketStatus.CLAIMED },
        data: {
          status: TicketStatus.RESOLVED,
          resolution: dto.resolution,
          resolvedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        throw new BadRequestException('工单状态已变化，请刷新后重试');
      }

      await tx.ticketComment.create({
        data: {
          ticketId: id,
          authorId: actor.id,
          type: CommentType.SYSTEM,
          content: `${actor.displayName} 将工单标记为已解决`,
        },
      });
    });

    return this.findOne(id);
  }

  async close(id: string, actor: SafeUser) {
    await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id },
        select: { status: true },
      });

      if (!ticket) throw new NotFoundException('工单不存在');
      if (ticket.status === TicketStatus.CLOSED) {
        throw new BadRequestException('工单已关闭');
      }

      const updated = await tx.ticket.updateMany({
        where: { id, status: { not: TicketStatus.CLOSED } },
        data: { status: TicketStatus.CLOSED, closedAt: new Date() },
      });

      if (updated.count === 0) {
        throw new BadRequestException('工单状态已变化，请刷新后重试');
      }

      await tx.ticketComment.create({
        data: {
          ticketId: id,
          authorId: actor.id,
          type: CommentType.SYSTEM,
          content: `${actor.displayName} 关闭了工单`,
        },
      });
    });

    return this.findOne(id);
  }

  async addComment(id: string, dto: CreateTicketCommentDto, actor: SafeUser) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!ticket) throw new NotFoundException('工单不存在');
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('已关闭的工单不能继续评论');
    }

    return this.prisma.ticketComment.create({
      data: {
        ticketId: id,
        authorId: actor.id,
        type: CommentType.COMMENT,
        content: dto.content,
      },
      include: {
        author: { select: SAFE_USER_BRIEF },
      },
    });
  }

  async getAttachmentFile(attachmentId: string) {
    const attachment = await this.prisma.ticketAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        filename: true,
        storedPath: true,
        mimeType: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException('附件不存在');
    }

    const filePath = join(this.uploadDir, basename(attachment.storedPath));

    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('附件文件不存在');
    }

    return { attachment, filePath };
  }
}
