import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Subsystem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubsystemDto, QuerySubsystemDto, UpdateSubsystemDto } from './dto/subsystem.dto';

function clean(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanTags(tags: string[] | undefined): string[] | undefined {
  if (tags === undefined) return undefined;
  return tags.map((tag) => tag.trim()).filter(Boolean);
}

@Injectable()
export class SubsystemsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QuerySubsystemDto) {
    const where: Prisma.SubsystemWhereInput = {};
    if (query.category) where.category = query.category;
    if (query.q) {
      const q = query.q;
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { accountHint: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { tags: { has: q } },
      ];
    }

    const [items, categoryRows, tagRows] = await Promise.all([
      this.prisma.subsystem.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.subsystem.findMany({
        where: { category: { not: null } },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
      this.prisma.subsystem.findMany({ select: { tags: true } }),
    ]);

    const tagSet = new Set<string>();
    for (const row of tagRows) {
      for (const tag of row.tags) tagSet.add(tag);
    }

    return {
      items: items.map((item) => this.toPublic(item)),
      categories: categoryRows
        .map((row) => row.category)
        .filter((item): item is string => Boolean(item)),
      tags: [...tagSet].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.subsystem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('子系统不存在');
    return this.toPublic(item);
  }

  async create(dto: CreateSubsystemDto) {
    const password = dto.password?.trim();
    const item = await this.prisma.subsystem.create({
      data: {
        name: dto.name.trim(),
        description: clean(dto.description) ?? null,
        notes: clean(dto.notes) ?? null,
        accountHint: clean(dto.accountHint) ?? null,
        password: password || null,
        passwordUpdatedAt: password ? new Date() : null,
        icon: clean(dto.icon) ?? null,
        url: clean(dto.url) ?? null,
        category: clean(dto.category) ?? null,
        tags: cleanTags(dto.tags) ?? [],
        sortOrder: dto.sortOrder ?? 0,
        visible: dto.visible ?? true,
      },
    });
    return this.toPublic(item);
  }

  async update(id: string, dto: UpdateSubsystemDto) {
    const existing = await this.prisma.subsystem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('子系统不存在');

    const password = dto.password?.trim();
    const item = await this.prisma.subsystem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: clean(dto.description) } : {}),
        ...(dto.notes !== undefined ? { notes: clean(dto.notes) } : {}),
        ...(dto.accountHint !== undefined ? { accountHint: clean(dto.accountHint) } : {}),
        ...(dto.clearCredential ? { password: null, passwordUpdatedAt: null } : {}),
        ...(password ? { password, passwordUpdatedAt: new Date() } : {}),
        ...(dto.icon !== undefined ? { icon: clean(dto.icon) } : {}),
        ...(dto.url !== undefined ? { url: clean(dto.url) } : {}),
        ...(dto.category !== undefined ? { category: clean(dto.category) } : {}),
        ...(dto.tags !== undefined ? { tags: cleanTags(dto.tags) } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.visible !== undefined ? { visible: dto.visible } : {}),
      },
    });
    return this.toPublic(item);
  }

  async remove(id: string) {
    const existing = await this.prisma.subsystem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('子系统不存在');
    await this.prisma.subsystem.delete({ where: { id } });
  }

  private toPublic(item: Subsystem) {
    return {
      ...item,
      hasPassword: Boolean(item.password),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      passwordUpdatedAt: item.passwordUpdatedAt?.toISOString() ?? null,
    };
  }
}
