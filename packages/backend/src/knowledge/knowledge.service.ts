import { randomBytes } from 'node:crypto';
import { access, copyFile, mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  KnowledgeKind,
  KnowledgeLinkSource,
  KnowledgeSpace,
  KnowledgeStatus,
  CommentType,
  Prisma,
} from '@prisma/client';
import { SafeUser } from '../common/types/authenticated-user.interface';
import { decodeUploadFilename } from '../common/utils/decode-filename';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateKnowledgeCardDto,
  CreateKnowledgeDocumentDto,
  QueryKnowledgeDto,
  UpdateKnowledgeCardDto,
} from './dto/knowledge.dto';
import { KNOWLEDGE_IMAGE_MIME } from './knowledge-upload';

export interface KnowledgeStep {
  title?: string;
  body: string;
}

type StoredFile = {
  storedPath: string;
  filename: string;
  mimeType: string;
  size: number;
};

const SAFE_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
} satisfies Prisma.UserSelect;

const ARTICLE_INCLUDE = {
  owner: { select: SAFE_USER_SELECT },
  author: { select: SAFE_USER_SELECT },
  _count: { select: { attachments: true, links: true } },
} satisfies Prisma.KnowledgeArticleInclude;

const DETAIL_INCLUDE = {
  ...ARTICLE_INCLUDE,
  attachments: {
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      caption: true,
      createdAt: true,
    },
  },
  links: {
    orderBy: { createdAt: 'desc' },
    select: {
      source: true,
      createdAt: true,
      ticket: {
        select: {
          id: true,
          ticketNo: true,
          title: true,
          status: true,
          reporterName: true,
          createdAt: true,
        },
      },
    },
  },
} satisfies Prisma.KnowledgeArticleInclude;

type ArticleWithMeta = Prisma.KnowledgeArticleGetPayload<{ include: typeof ARTICLE_INCLUDE }>;
type ArticleDetail = Prisma.KnowledgeArticleGetPayload<{ include: typeof DETAIL_INCLUDE }>;

const MIME_EXTENSION: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/markdown': '.md',
  'text/plain': '.txt',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function normalizeList(value: string[] | undefined): string[] {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function normalizeSteps(steps: KnowledgeStep[] | undefined): KnowledgeStep[] {
  return (steps ?? [])
    .map((step) => ({
      ...(step.title?.trim() ? { title: step.title.trim() } : {}),
      body: step.body.trim(),
    }))
    .filter((step) => step.body.length > 0);
}

function buildSearchText(input: {
  code: string;
  title: string;
  summary?: string | null;
  keywords?: string[];
  tags?: string[];
  system?: string | null;
  symptom?: string | null;
  steps?: string[];
  escalation?: string | null;
  content?: string | null;
  filename?: string | null;
}): string {
  return [
    input.code,
    input.title,
    input.summary,
    input.system,
    input.keywords?.join(' '),
    input.tags?.join(' '),
    input.symptom,
    input.steps?.join(' '),
    input.escalation,
    input.content,
    input.filename,
  ]
    .filter((item): item is string => typeof item === 'string' && item.length > 0)
    .join('\n')
    .toLowerCase();
}

function queryGroups(query: string): string[][] {
  const parts = query
    .trim()
    .split(/[\s,，、;；/|]+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 6);

  return parts.map((part) => {
    const variants = new Set<string>([part]);
    if (/[一-龥]/.test(part) && part.length > 2) {
      for (let index = 0; index < part.length - 1; index += 1) {
        variants.add(part.slice(index, index + 2));
      }
    }
    return [...variants].filter((variant) => variant.length >= 2).slice(0, 12);
  });
}

function flattenTerms(groups: string[][]): string[] {
  return [...new Set(groups.flat())];
}

@Injectable()
export class KnowledgeService {
  private readonly uploadDir: string;
  private readonly knowledgeDir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.uploadDir = resolve(config.get<string>('UPLOAD_DIR') ?? './uploads');
    this.knowledgeDir = join(this.uploadDir, 'knowledge');
  }

  async list(query: QueryKnowledgeDto) {
    const where = this.buildWhere(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.knowledgeArticle.findMany({
        where,
        include: ARTICLE_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.knowledgeArticle.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toSummary(item)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async meta() {
    const [spaceGroups, systems, tagRows] = await Promise.all([
      this.prisma.knowledgeArticle.groupBy({
        by: ['space'],
        orderBy: { space: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.knowledgeArticle.findMany({
        where: { system: { not: null } },
        select: { system: true },
        distinct: ['system'],
        orderBy: { system: 'asc' },
      }),
      this.prisma.knowledgeArticle.findMany({ select: { tags: true } }),
    ]);

    const tagSet = new Set<string>();
    for (const row of tagRows) {
      for (const tag of row.tags) tagSet.add(tag);
    }

    return {
      spaces: spaceGroups.map((group) => ({
        value: group.space,
        count: group._count._all,
      })),
      systems: systems.map((row) => row.system).filter((item): item is string => Boolean(item)),
      tags: [...tagSet].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    };
  }

  async findOne(idOrCode: string) {
    const article = await this.prisma.knowledgeArticle.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
      include: DETAIL_INCLUDE,
    });

    if (!article) {
      throw new NotFoundException('知识不存在');
    }

    // 直接更新浏览数，避免 Prisma 的 @updatedAt 把“查看”误记为“编辑”。
    void this.prisma
      .$executeRaw`UPDATE "KnowledgeArticle" SET "viewCount" = "viewCount" + 1 WHERE "id" = ${article.id}`.catch(
      () => undefined,
    );

    return this.toDetail(article);
  }

  async createCard(dto: CreateKnowledgeCardDto, actor: SafeUser) {
    const code = await this.nextCode(dto.space);
    const sourceTicket = dto.sourceTicketId
      ? await this.prisma.ticket.findUnique({
          where: { id: dto.sourceTicketId },
          select: { id: true, ticketNo: true },
        })
      : null;
    const status = dto.status ?? KnowledgeStatus.DRAFT;
    const steps = normalizeSteps(dto.steps);
    const searchText = buildSearchText({
      code,
      title: dto.title,
      summary: dto.summary,
      keywords: normalizeList(dto.keywords),
      tags: normalizeList(dto.tags),
      system: dto.system,
      symptom: dto.symptom,
      steps: steps.flatMap((step) => [step.title ?? '', step.body]),
      escalation: dto.escalation,
    });

    const article = await this.prisma.knowledgeArticle.create({
      data: {
        code,
        kind: KnowledgeKind.CARD,
        space: dto.space,
        system: dto.system?.trim() || null,
        title: dto.title.trim(),
        summary: dto.summary?.trim() || null,
        category: dto.category ?? null,
        tags: normalizeList(dto.tags),
        keywords: normalizeList(dto.keywords),
        symptom: dto.symptom?.trim() || null,
        steps: (steps.length > 0 ? steps : Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        escalation: dto.escalation?.trim() || null,
        status,
        publishedAt: status === KnowledgeStatus.PUBLISHED ? new Date() : null,
        authorId: actor.id,
        ownerId: dto.ownerId ?? actor.id,
        sourceTicketId: sourceTicket?.id ?? null,
        sourceTicketNo: sourceTicket?.ticketNo ?? null,
        needsReview: dto.needsReview ?? false,
        legacyPaths: normalizeList(dto.legacyPaths),
        searchText,
      },
      include: DETAIL_INCLUDE,
    });

    if (status === KnowledgeStatus.PUBLISHED) {
      await this.saveRevision(article.id, article.version, this.snapshot(article), actor.id);
      await this.syncSourceTicketLink(article.id, article.sourceTicketId, actor.id);
    }

    if (sourceTicket) {
      await this.copyTicketAttachments(article.id, sourceTicket.id);
    }

    return this.findOne(article.id);
  }

  async updateCard(id: string, dto: UpdateKnowledgeCardDto, actor: SafeUser) {
    const existing = await this.prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('知识不存在');
    }
    if (existing.kind !== KnowledgeKind.CARD) {
      throw new BadRequestException('长文档不支持在平台内编辑');
    }

    const status = dto.status ?? existing.status;
    const steps =
      dto.steps !== undefined ? normalizeSteps(dto.steps) : this.readSteps(existing.steps);
    const title = dto.title ?? existing.title;
    const summary = dto.summary !== undefined ? dto.summary : existing.summary;
    const keywords = dto.keywords !== undefined ? normalizeList(dto.keywords) : existing.keywords;
    const tags = dto.tags !== undefined ? normalizeList(dto.tags) : existing.tags;
    const system = dto.system !== undefined ? dto.system : existing.system;
    const symptom = dto.symptom !== undefined ? dto.symptom : existing.symptom;
    const escalation = dto.escalation !== undefined ? dto.escalation : existing.escalation;
    const version =
      existing.status === KnowledgeStatus.PUBLISHED ? existing.version + 1 : existing.version;

    const updated = await this.prisma.knowledgeArticle.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: title.trim() } : {}),
        ...(dto.space !== undefined ? { space: dto.space } : {}),
        ...(dto.system !== undefined ? { system: system?.trim() || null } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.tags !== undefined ? { tags } : {}),
        ...(dto.keywords !== undefined ? { keywords } : {}),
        ...(dto.summary !== undefined ? { summary: summary?.trim() || null } : {}),
        ...(dto.symptom !== undefined ? { symptom: symptom?.trim() || null } : {}),
        ...(dto.steps !== undefined
          ? {
              steps: (steps.length > 0
                ? steps
                : Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
            }
          : {}),
        ...(dto.escalation !== undefined ? { escalation: escalation?.trim() || null } : {}),
        ...(dto.status !== undefined ? { status } : {}),
        ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId } : {}),
        ...(dto.needsReview !== undefined ? { needsReview: dto.needsReview } : {}),
        ...(dto.legacyPaths !== undefined ? { legacyPaths: normalizeList(dto.legacyPaths) } : {}),
        ...(status === KnowledgeStatus.PUBLISHED && !existing.publishedAt
          ? { publishedAt: new Date() }
          : {}),
        ...(status === KnowledgeStatus.PUBLISHED ? { version } : {}),
        searchText: buildSearchText({
          code: existing.code,
          title,
          summary,
          keywords,
          tags,
          system,
          symptom,
          steps: steps.flatMap((step) => [step.title ?? '', step.body]),
          escalation,
        }),
      },
      include: DETAIL_INCLUDE,
    });

    if (status === KnowledgeStatus.PUBLISHED) {
      await this.saveRevision(updated.id, updated.version, this.snapshot(updated), actor.id);
      await this.syncSourceTicketLink(updated.id, updated.sourceTicketId, actor.id);
    }

    return this.findOne(updated.id);
  }

  async publishCard(id: string, actor: SafeUser) {
    return this.updateCard(id, { status: KnowledgeStatus.PUBLISHED }, actor);
  }

  async archiveCard(id: string) {
    const article = await this.prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('知识不存在');
    await this.prisma.knowledgeArticle.update({
      where: { id },
      data: { status: KnowledgeStatus.ARCHIVED },
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: { id },
      include: { attachments: { select: { storedPath: true } } },
    });
    if (!article) throw new NotFoundException('知识不存在');

    await this.prisma.knowledgeArticle.delete({ where: { id } });
    const files = article.attachments.map((item) => item.storedPath);
    if (article.storedPath) files.push(article.storedPath);
    await this.removeStoredFiles(files);
  }

  async createDocument(
    dto: CreateKnowledgeDocumentDto,
    file: Express.Multer.File | undefined,
    actor: SafeUser,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文档');
    }

    const stored = await this.storeFile(file);
    const code = await this.nextCode(dto.space);
    const searchText = buildSearchText({
      code,
      title: dto.title,
      summary: dto.summary,
      keywords: normalizeList(dto.keywords),
      tags: normalizeList(dto.tags),
      system: dto.system,
      filename: stored.filename,
    });

    try {
      const article = await this.prisma.knowledgeArticle.create({
        data: {
          code,
          kind: KnowledgeKind.DOCUMENT,
          docType: dto.docType,
          space: dto.space,
          system: dto.system?.trim() || null,
          title: dto.title.trim(),
          summary: dto.summary?.trim() || null,
          category: dto.category ?? null,
          tags: normalizeList(dto.tags),
          keywords: normalizeList(dto.keywords),
          status: KnowledgeStatus.PUBLISHED,
          publishedAt: new Date(),
          authorId: actor.id,
          ownerId: dto.ownerId ?? actor.id,
          filename: stored.filename,
          storedPath: stored.storedPath,
          mimeType: stored.mimeType,
          size: stored.size,
          searchText,
        },
        include: DETAIL_INCLUDE,
      });

      await this.saveRevision(article.id, article.version, this.snapshot(article), actor.id);
      return this.findOne(article.id);
    } catch (error) {
      await this.removeStoredFiles([stored.storedPath]);
      throw error;
    }
  }

  async updateDocument(id: string, dto: Partial<CreateKnowledgeDocumentDto>, actor: SafeUser) {
    const existing = await this.prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('知识不存在');
    if (existing.kind !== KnowledgeKind.DOCUMENT) {
      throw new BadRequestException('仅长文档支持该操作');
    }

    const title = dto.title ?? existing.title;
    const summary = dto.summary !== undefined ? dto.summary : existing.summary;
    const keywords = dto.keywords !== undefined ? normalizeList(dto.keywords) : existing.keywords;
    const tags = dto.tags !== undefined ? normalizeList(dto.tags) : existing.tags;
    const system = dto.system !== undefined ? dto.system : existing.system;

    const updated = await this.prisma.knowledgeArticle.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: title.trim() } : {}),
        ...(dto.docType !== undefined ? { docType: dto.docType } : {}),
        ...(dto.space !== undefined ? { space: dto.space } : {}),
        ...(dto.system !== undefined ? { system: system?.trim() || null } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.tags !== undefined ? { tags } : {}),
        ...(dto.keywords !== undefined ? { keywords } : {}),
        ...(dto.summary !== undefined ? { summary: summary?.trim() || null } : {}),
        ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId } : {}),
        searchText: buildSearchText({
          code: existing.code,
          title,
          summary,
          keywords,
          tags,
          system,
          filename: existing.filename,
        }),
      },
      include: DETAIL_INCLUDE,
    });

    await this.saveRevision(updated.id, updated.version, this.snapshot(updated), actor.id);
    return this.findOne(updated.id);
  }

  async replaceDocumentFile(id: string, file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('请选择要上传的文档');
    const existing = await this.prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('知识不存在');
    if (existing.kind !== KnowledgeKind.DOCUMENT) {
      throw new BadRequestException('仅长文档支持该操作');
    }

    const stored = await this.storeFile(file);
    try {
      const updated = await this.prisma.knowledgeArticle.update({
        where: { id },
        data: {
          filename: stored.filename,
          storedPath: stored.storedPath,
          mimeType: stored.mimeType,
          size: stored.size,
          version: { increment: 1 },
          searchText: buildSearchText({
            code: existing.code,
            title: existing.title,
            summary: existing.summary,
            keywords: existing.keywords,
            tags: existing.tags,
            system: existing.system,
            filename: stored.filename,
          }),
        },
        include: DETAIL_INCLUDE,
      });
      if (existing.storedPath) {
        await this.removeStoredFiles([existing.storedPath]);
      }
      return this.toDetail(updated);
    } catch (error) {
      await this.removeStoredFiles([stored.storedPath]);
      throw error;
    }
  }

  async getDocumentFile(id: string) {
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: { id },
      select: {
        filename: true,
        storedPath: true,
        mimeType: true,
        kind: true,
      },
    });
    if (!article || article.kind !== KnowledgeKind.DOCUMENT || !article.storedPath) {
      throw new NotFoundException('文档不存在');
    }

    const filePath = join(this.uploadDir, article.storedPath);
    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('文档文件不存在');
    }
    return { article, filePath };
  }

  async addAttachments(id: string, files: Express.Multer.File[], actor: SafeUser) {
    if (files.length === 0) throw new BadRequestException('请选择要上传的图片');
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!article) throw new NotFoundException('知识不存在');

    const stored: StoredFile[] = [];
    try {
      for (const file of files) {
        if (!KNOWLEDGE_IMAGE_MIME.has(file.mimetype)) {
          throw new BadRequestException('仅支持 PNG、JPEG、WebP、GIF 图片');
        }
        stored.push(await this.storeFile(file));
      }

      const maxSort = await this.prisma.knowledgeAttachment.aggregate({
        where: { articleId: id },
        _max: { sortOrder: true },
      });
      const startOrder = (maxSort._max.sortOrder ?? -1) + 1;

      await this.prisma.knowledgeAttachment.createMany({
        data: stored.map((file, index) => ({
          articleId: id,
          filename: file.filename,
          storedPath: file.storedPath,
          mimeType: file.mimeType,
          size: file.size,
          sortOrder: startOrder + index,
          uploadedBy: actor.id,
        })),
      });
    } catch (error) {
      await this.removeStoredFiles(stored.map((file) => file.storedPath));
      throw error;
    }

    return this.findOne(id);
  }

  async removeAttachment(id: string) {
    const attachment = await this.prisma.knowledgeAttachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('图片不存在');
    await this.prisma.knowledgeAttachment.delete({ where: { id } });
    await this.removeStoredFiles([attachment.storedPath]);
  }

  async getAttachmentFile(id: string) {
    const attachment = await this.prisma.knowledgeAttachment.findUnique({
      where: { id },
      select: { filename: true, storedPath: true, mimeType: true },
    });
    if (!attachment) throw new NotFoundException('图片不存在');

    const filePath = join(this.uploadDir, attachment.storedPath);
    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('图片文件不存在');
    }
    return { attachment, filePath };
  }

  async suggest(query: string, limit = 5) {
    const groups = queryGroups(query);
    const terms = flattenTerms(groups);
    if (terms.length === 0) return [];

    const where: Prisma.KnowledgeArticleWhereInput = {
      status: KnowledgeStatus.PUBLISHED,
      kind: KnowledgeKind.CARD,
      OR: terms.map((term) => ({
        searchText: { contains: term, mode: 'insensitive' as const },
      })),
    };

    const articles = await this.prisma.knowledgeArticle.findMany({
      where,
      include: ARTICLE_INCLUDE,
      take: 100,
      orderBy: { updatedAt: 'desc' },
    });

    return articles
      .map((article) => ({ article, score: this.score(article, terms) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => this.toSummary(item.article));
  }

  async forTicket(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, title: true, description: true },
    });
    if (!ticket) throw new NotFoundException('工单不存在');

    const linkedRows = await this.prisma.ticketKnowledgeLink.findMany({
      where: { ticketId },
      include: { article: { include: ARTICLE_INCLUDE } },
      orderBy: { createdAt: 'desc' },
    });
    const linked = linkedRows.map((row) => this.toSummary(row.article));
    const linkedIds = new Set(linked.map((item) => item.id));
    const suggestions = (
      await this.suggest(`${ticket.title} ${ticket.description.slice(0, 300)}`)
    ).filter((item) => !linkedIds.has(item.id));

    return { linked, suggestions };
  }

  async linkTicket(ticketId: string, articleId: string, actor: SafeUser) {
    const [ticket, article] = await Promise.all([
      this.prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } }),
      this.prisma.knowledgeArticle.findUnique({
        where: { id: articleId },
        select: { id: true, code: true, title: true },
      }),
    ]);
    if (!ticket) throw new NotFoundException('工单不存在');
    if (!article) throw new NotFoundException('知识不存在');

    const existing = await this.prisma.ticketKnowledgeLink.findUnique({
      where: { ticketId_articleId: { ticketId, articleId } },
      select: { id: true },
    });
    if (existing) return this.forTicket(ticketId);

    await this.prisma.$transaction([
      this.prisma.ticketKnowledgeLink.create({
        data: {
          ticketId,
          articleId,
          source: KnowledgeLinkSource.MANUAL,
          autoLinked: false,
          createdById: actor.id,
        },
      }),
      this.prisma.ticketComment.create({
        data: {
          ticketId,
          authorId: actor.id,
          type: CommentType.SYSTEM,
          content: `${actor.displayName} 关联了知识 ${article.code} ${article.title}`,
        },
      }),
    ]);

    return this.forTicket(ticketId);
  }

  async unlinkTicket(ticketId: string, articleId: string, actor: SafeUser) {
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: { id: articleId },
      select: { code: true, title: true },
    });
    const existing = await this.prisma.ticketKnowledgeLink.findUnique({
      where: { ticketId_articleId: { ticketId, articleId } },
      select: { id: true },
    });
    if (!existing) return this.forTicket(ticketId);

    const actions: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.ticketKnowledgeLink.delete({
        where: { ticketId_articleId: { ticketId, articleId } },
      }),
    ];
    if (article) {
      actions.push(
        this.prisma.ticketComment.create({
          data: {
            ticketId,
            authorId: actor.id,
            type: CommentType.SYSTEM,
            content: `${actor.displayName} 取消关联知识 ${article.code} ${article.title}`,
          },
        }),
      );
    }
    await this.prisma.$transaction(actions);

    return this.forTicket(ticketId);
  }

  private buildWhere(query: QueryKnowledgeDto): Prisma.KnowledgeArticleWhereInput {
    const and: Prisma.KnowledgeArticleWhereInput[] = [];
    const groups = query.q ? queryGroups(query.q) : [];
    for (const group of groups) {
      and.push({
        OR: group.flatMap((term) => [
          { searchText: { contains: term, mode: 'insensitive' as const } },
          { code: { contains: term, mode: 'insensitive' as const } },
        ]),
      });
    }

    if (query.space) and.push({ space: query.space });
    if (query.system) and.push({ system: query.system });
    if (query.kind) and.push({ kind: query.kind });
    if (query.status) and.push({ status: query.status });
    if (query.tag) and.push({ tags: { has: query.tag } });

    return and.length > 0 ? { AND: and } : {};
  }

  private score(article: ArticleWithMeta, terms: string[]): number {
    const title = article.title.toLowerCase();
    const keywords = article.keywords.map((item) => item.toLowerCase());
    const tags = article.tags.map((item) => item.toLowerCase());
    const system = (article.system ?? '').toLowerCase();
    const summary = (article.summary ?? '').toLowerCase();
    const searchText = article.searchText;
    const code = article.code.toLowerCase();

    let score = 0;
    for (const term of terms) {
      const needle = term.toLowerCase();
      if (code === needle) score += 20;
      if (title.includes(needle)) score += 8;
      if (keywords.some((keyword) => keyword.includes(needle))) score += 6;
      if (tags.some((tag) => tag.includes(needle))) score += 4;
      if (system.includes(needle)) score += 3;
      if (summary.includes(needle)) score += 2;
      if (searchText.includes(needle)) score += 1;
    }
    if (article.needsReview) score -= 2;
    score += Math.min(article._count.links, 5);
    return score;
  }

  private readSteps(steps: Prisma.JsonValue | null): KnowledgeStep[] {
    if (!Array.isArray(steps)) return [];
    return steps.flatMap((step) => {
      if (!step || typeof step !== 'object') return [];
      const record = step as Record<string, unknown>;
      if (typeof record.body !== 'string') return [];
      return [
        {
          ...(typeof record.title === 'string' && record.title ? { title: record.title } : {}),
          body: record.body,
        },
      ];
    });
  }

  private async nextCode(space: KnowledgeSpace): Promise<string> {
    const rows = await this.prisma.$queryRaw<Array<{ value: number }>>`
      INSERT INTO "KnowledgeSequence" ("space", "value")
      VALUES (${space}::"KnowledgeSpace", 1)
      ON CONFLICT ("space") DO UPDATE SET "value" = "KnowledgeSequence"."value" + 1
      RETURNING "value"
    `;
    const value = Number(rows[0]?.value ?? 1);
    return `KB-${space}-${String(value).padStart(3, '0')}`;
  }

  private async storeFile(file: Express.Multer.File): Promise<StoredFile> {
    await mkdir(this.knowledgeDir, { recursive: true });
    const originalName = decodeUploadFilename(file.originalname);
    const extension = MIME_EXTENSION[file.mimetype] ?? extname(originalName).toLowerCase();
    const storedPath = `knowledge/${randomBytes(18).toString('hex')}${extension}`;
    await writeFile(join(this.uploadDir, storedPath), file.buffer);
    return {
      storedPath,
      filename: originalName.slice(0, 255),
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  private async removeStoredFiles(paths: string[]): Promise<void> {
    await Promise.all(
      paths.map((storedPath) => unlink(join(this.uploadDir, storedPath)).catch(() => undefined)),
    );
  }

  private async copyTicketAttachments(articleId: string, ticketId: string): Promise<void> {
    const attachments = await this.prisma.ticketAttachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
    if (attachments.length === 0) return;

    await mkdir(this.knowledgeDir, { recursive: true });
    const rows: Array<{
      storedPath: string;
      filename: string;
      mimeType: string;
      size: number;
    }> = [];

    for (const attachment of attachments) {
      const source = join(this.uploadDir, basename(attachment.storedPath));
      const extension = MIME_EXTENSION[attachment.mimeType ?? ''] ?? extname(attachment.filename);
      const storedPath = `knowledge/${randomBytes(18).toString('hex')}${extension}`;
      try {
        await copyFile(source, join(this.uploadDir, storedPath));
      } catch {
        continue;
      }
      let size = attachment.size;
      try {
        size = (await stat(join(this.uploadDir, storedPath))).size;
      } catch {
        // Keep the original size when stat fails.
      }
      rows.push({
        storedPath,
        filename: attachment.filename,
        mimeType: attachment.mimeType ?? 'application/octet-stream',
        size,
      });
    }

    if (rows.length === 0) return;

    await this.prisma.knowledgeAttachment.createMany({
      data: rows.map((row, index) => ({
        articleId,
        filename: row.filename,
        storedPath: row.storedPath,
        mimeType: row.mimeType,
        size: row.size,
        sortOrder: index,
      })),
    });
  }

  private async syncSourceTicketLink(
    articleId: string,
    sourceTicketId: string | null,
    actorId: string,
  ): Promise<void> {
    if (!sourceTicketId) return;
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: sourceTicketId },
      select: { id: true },
    });
    if (!ticket) return;

    await this.prisma.ticketKnowledgeLink.upsert({
      where: { ticketId_articleId: { ticketId: sourceTicketId, articleId } },
      update: {},
      create: {
        ticketId: sourceTicketId,
        articleId,
        source: KnowledgeLinkSource.AUTO,
        autoLinked: true,
        createdById: actorId,
      },
    });
  }

  private snapshot(article: ArticleDetail): Prisma.InputJsonValue {
    return {
      code: article.code,
      kind: article.kind,
      docType: article.docType,
      space: article.space,
      system: article.system,
      title: article.title,
      summary: article.summary,
      category: article.category,
      tags: article.tags,
      keywords: article.keywords,
      symptom: article.symptom,
      steps: (article.steps ?? []) as Prisma.InputJsonValue,
      escalation: article.escalation,
      status: article.status,
      version: article.version,
      publishedAt: article.publishedAt?.toISOString() ?? null,
      lastVerifiedAt: article.lastVerifiedAt?.toISOString() ?? null,
      sourceTicketId: article.sourceTicketId,
      sourceTicketNo: article.sourceTicketNo,
    };
  }

  private async saveRevision(
    articleId: string,
    version: number,
    snapshot: Prisma.InputJsonValue,
    editorId: string,
  ): Promise<void> {
    await this.prisma.knowledgeRevision.upsert({
      where: { articleId_version: { articleId, version } },
      update: { snapshot },
      create: { articleId, version, snapshot, editorId },
    });
  }

  private toSummary(article: ArticleWithMeta) {
    return {
      id: article.id,
      code: article.code,
      kind: article.kind,
      docType: article.docType,
      space: article.space,
      system: article.system,
      title: article.title,
      summary: article.summary,
      category: article.category,
      tags: article.tags,
      keywords: article.keywords,
      status: article.status,
      needsReview: article.needsReview,
      owner: article.owner,
      sourceTicketId: article.sourceTicketId,
      sourceTicketNo: article.sourceTicketNo,
      version: article.version,
      publishedAt: article.publishedAt?.toISOString() ?? null,
      lastVerifiedAt: article.lastVerifiedAt?.toISOString() ?? null,
      updatedAt: article.updatedAt.toISOString(),
      attachmentCount: article._count.attachments,
      linkedTicketCount: article._count.links,
      file:
        article.kind === KnowledgeKind.DOCUMENT && article.filename
          ? {
              filename: article.filename,
              mimeType: article.mimeType,
              size: article.size ?? 0,
            }
          : null,
    };
  }

  private toDetail(article: ArticleDetail) {
    return {
      ...this.toSummary(article),
      symptom: article.symptom,
      steps: this.readSteps(article.steps),
      escalation: article.escalation,
      content: article.content,
      attachments: article.attachments.map((attachment) => ({
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        caption: attachment.caption,
        createdAt: attachment.createdAt.toISOString(),
      })),
      linkedTickets: article.links.map((link) => ({
        id: link.ticket.id,
        ticketNo: link.ticket.ticketNo,
        title: link.ticket.title,
        status: link.ticket.status,
        reporterName: link.ticket.reporterName,
        createdAt: link.ticket.createdAt.toISOString(),
        source: link.source,
        linkedAt: link.createdAt.toISOString(),
      })),
    };
  }
}
