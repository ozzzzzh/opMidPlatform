import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CommentType } from '@prisma/client';
import { SafeUser } from '../common/types/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto, QueryContactDto, UpdateContactDto } from './dto/contact.dto';

function clean(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryContactDto) {
    const where: Prisma.ContactWhereInput = {};
    if (query.category) where.category = query.category;
    if (query.system) where.systemName = query.system;
    if (query.q) {
      const q = query.q;
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { systemName: { contains: q, mode: 'insensitive' } },
        { systemShortName: { contains: q, mode: 'insensitive' } },
        { role: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { unit: { contains: q, mode: 'insensitive' } },
        { businessDept: { contains: q, mode: 'insensitive' } },
        { mobile: { contains: q } },
        { landline: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, categoryRows, systemRows] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: [{ systemName: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.contact.findMany({
        where: { category: { not: null } },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
      this.prisma.contact.findMany({
        select: { systemName: true },
        distinct: ['systemName'],
        orderBy: { systemName: 'asc' },
      }),
    ]);

    return {
      items: items.map((item) => this.toPublic(item)),
      categories: categoryRows
        .map((row) => row.category)
        .filter((item): item is string => Boolean(item)),
      systems: systemRows.map((row) => row.systemName),
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.contact.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('联系人不存在');
    return this.toPublic(item);
  }

  async create(dto: CreateContactDto) {
    try {
      const item = await this.prisma.contact.create({
        data: {
          name: dto.name.trim(),
          role: clean(dto.role) ?? '联系人',
          systemName: dto.systemName.trim(),
          systemShortName: clean(dto.systemShortName) ?? null,
          category: clean(dto.category) ?? null,
          systemUrl: clean(dto.systemUrl) ?? null,
          unit: clean(dto.unit) ?? null,
          businessDept: clean(dto.businessDept) ?? null,
          landline: clean(dto.landline) ?? null,
          mobile: clean(dto.mobile) ?? null,
          email: clean(dto.email) ?? null,
          notes: clean(dto.notes) ?? null,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      return this.toPublic(item);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('该系统中已存在同名联系人');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateContactDto) {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('联系人不存在');

    try {
      const item = await this.prisma.contact.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.role !== undefined ? { role: clean(dto.role) ?? '联系人' } : {}),
          ...(dto.systemName !== undefined ? { systemName: dto.systemName.trim() } : {}),
          ...(dto.systemShortName !== undefined
            ? { systemShortName: clean(dto.systemShortName) }
            : {}),
          ...(dto.category !== undefined ? { category: clean(dto.category) } : {}),
          ...(dto.systemUrl !== undefined ? { systemUrl: clean(dto.systemUrl) } : {}),
          ...(dto.unit !== undefined ? { unit: clean(dto.unit) } : {}),
          ...(dto.businessDept !== undefined ? { businessDept: clean(dto.businessDept) } : {}),
          ...(dto.landline !== undefined ? { landline: clean(dto.landline) } : {}),
          ...(dto.mobile !== undefined ? { mobile: clean(dto.mobile) } : {}),
          ...(dto.email !== undefined ? { email: clean(dto.email) } : {}),
          ...(dto.notes !== undefined ? { notes: clean(dto.notes) } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
      return this.toPublic(item);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('该系统中已存在同名联系人');
      }
      throw error;
    }
  }

  async forTicket(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException('工单不存在');

    const links = await this.prisma.ticketContactLink.findMany({
      where: { ticketId },
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
    });
    return { linked: links.map((link) => this.toPublic(link.contact)) };
  }

  async linkTicket(ticketId: string, contactId: string, actor: SafeUser) {
    const [ticket, contact] = await Promise.all([
      this.prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } }),
      this.prisma.contact.findUnique({
        where: { id: contactId },
        select: { id: true, name: true, systemName: true },
      }),
    ]);
    if (!ticket) throw new NotFoundException('工单不存在');
    if (!contact) throw new NotFoundException('联系人不存在');

    const existing = await this.prisma.ticketContactLink.findUnique({
      where: { ticketId_contactId: { ticketId, contactId } },
      select: { id: true },
    });
    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.ticketContactLink.create({
          data: { ticketId, contactId, createdById: actor.id },
        }),
        this.prisma.ticketComment.create({
          data: {
            ticketId,
            authorId: actor.id,
            type: CommentType.SYSTEM,
            content: `${actor.displayName} 关联了联系人 ${contact.name}（${contact.systemName}）`,
          },
        }),
      ]);
    }
    return this.forTicket(ticketId);
  }

  async unlinkTicket(ticketId: string, contactId: string) {
    await this.prisma.ticketContactLink.deleteMany({ where: { ticketId, contactId } });
    return this.forTicket(ticketId);
  }

  async remove(id: string) {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('联系人不存在');
    await this.prisma.contact.delete({ where: { id } });
  }

  private toPublic(item: { createdAt: Date; updatedAt: Date; [key: string]: unknown }) {
    return {
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
