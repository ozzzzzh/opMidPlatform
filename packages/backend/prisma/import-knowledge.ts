import { randomBytes } from 'node:crypto';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import {
  KnowledgeKind,
  KnowledgeStatus,
  KnowledgeSpace,
  Prisma,
  PrismaClient,
  Role,
} from '@prisma/client';
import { knowledgeCards, knowledgeDocuments } from './knowledge-seed-data';

const prisma = new PrismaClient();
const uploadDir = resolve(process.env.UPLOAD_DIR ?? './uploads');
const knowledgeDir = join(uploadDir, 'knowledge');
const sourceDir = resolve(
  process.argv[2] ?? process.env.KNOWLEDGE_SOURCE_DIR ?? '../../驻点服务运维宝典',
);

interface Heading {
  level: number;
  title: string;
  line: number;
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
    input.filename,
  ]
    .filter((item): item is string => typeof item === 'string' && item.length > 0)
    .join('\n')
    .toLowerCase();
}

function parseHeadings(lines: string[]): Heading[] {
  const headings: Heading[] = [];
  lines.forEach((line, index) => {
    const match = /^(#{1,6})\s+(.*)$/.exec(line);
    if (match) {
      headings.push({ level: match[1].length, title: match[2].trim(), line: index });
    }
  });
  return headings;
}

function headingImages(lines: string[], headings: Heading[], index: number): string[] {
  const heading = headings[index];
  const next = headings.slice(index + 1).find((candidate) => candidate.level <= heading.level);
  const end = next?.line ?? lines.length;
  const images: string[] = [];
  for (let line = heading.line + 1; line < end; line += 1) {
    const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(lines[line])) !== null) {
      images.push(match[2].trim());
    }
  }
  return images;
}

async function main(): Promise<void> {
  const admin =
    (await prisma.user.findFirst({ where: { role: Role.ADMIN, active: true } })) ??
    (await prisma.user.findFirst({ where: { active: true } }));
  if (!admin) throw new Error('No active user found for knowledge import');

  await mkdir(knowledgeDir, { recursive: true });

  let cardsCreated = 0;
  let docsCreated = 0;
  const codeToId = new Map<string, string>();

  for (const seed of knowledgeCards) {
    const existing = await prisma.knowledgeArticle.findUnique({ where: { code: seed.code } });
    if (existing) {
      codeToId.set(seed.code, existing.id);
      continue;
    }

    const steps = seed.steps;
    const article = await prisma.knowledgeArticle.create({
      data: {
        code: seed.code,
        kind: KnowledgeKind.CARD,
        space: seed.space,
        system: seed.system,
        title: seed.title,
        summary: seed.summary,
        category: seed.category,
        tags: seed.tags,
        keywords: seed.keywords,
        symptom: seed.symptom,
        steps: steps as unknown as Prisma.InputJsonValue,
        escalation: seed.escalation ?? null,
        status: KnowledgeStatus.PUBLISHED,
        publishedAt: new Date(),
        authorId: admin.id,
        ownerId: admin.id,
        needsReview: seed.needsReview ?? false,
        legacyPaths: seed.legacyPaths,
        searchText: buildSearchText({
          code: seed.code,
          title: seed.title,
          summary: seed.summary,
          keywords: seed.keywords,
          tags: seed.tags,
          system: seed.system,
          symptom: seed.symptom,
          steps: steps.flatMap((step) => [step.title ?? '', step.body]),
          escalation: seed.escalation ?? null,
        }),
      },
      select: { id: true },
    });
    codeToId.set(seed.code, article.id);
    cardsCreated += 1;
  }

  for (const seed of knowledgeDocuments) {
    const existing = await prisma.knowledgeArticle.findUnique({ where: { code: seed.code } });
    if (existing) {
      codeToId.set(seed.code, existing.id);
      continue;
    }

    const source = join(process.cwd(), 'prisma', 'knowledge-docs', seed.fileName);
    const buffer = await readFile(source);
    const storedPath = `knowledge/${randomBytes(18).toString('hex')}.md`;
    await writeFile(join(uploadDir, storedPath), buffer);
    const fileStat = await stat(join(uploadDir, storedPath));

    const article = await prisma.knowledgeArticle.create({
      data: {
        code: seed.code,
        kind: KnowledgeKind.DOCUMENT,
        docType: seed.docType,
        space: seed.space,
        system: seed.system,
        title: seed.title,
        summary: seed.summary,
        tags: seed.tags,
        keywords: seed.keywords,
        status: KnowledgeStatus.PUBLISHED,
        publishedAt: new Date(),
        authorId: admin.id,
        ownerId: admin.id,
        filename: seed.fileName,
        storedPath,
        mimeType: 'text/markdown',
        size: fileStat.size,
        searchText: buildSearchText({
          code: seed.code,
          title: seed.title,
          summary: seed.summary,
          keywords: seed.keywords,
          tags: seed.tags,
          system: seed.system,
          filename: seed.fileName,
        }),
      },
      select: { id: true },
    });
    codeToId.set(seed.code, article.id);
    docsCreated += 1;
  }

  let imagesCopied = 0;
  try {
    const markdownPath = join(sourceDir, '驻点服务运维宝典.md');
    const markdown = await readFile(markdownPath, 'utf8');
    const lines = markdown.split(/\r?\n/);
    const headings = parseHeadings(lines);

    for (const seed of knowledgeCards) {
      const articleId = codeToId.get(seed.code);
      if (!articleId || seed.legacyPaths.length === 0) continue;

      const imagePaths = new Set<string>();
      for (const legacyPath of seed.legacyPaths) {
        headings.forEach((heading, index) => {
          if (heading.title !== legacyPath) return;
          for (const image of headingImages(lines, headings, index)) {
            imagePaths.add(image);
          }
        });
      }

      for (const rawPath of imagePaths) {
        const decoded = decodeURIComponent(rawPath);
        const sourceFile = join(sourceDir, decoded);
        const baseName = decoded.split('/').pop() ?? decoded;
        const already = await prisma.knowledgeAttachment.findFirst({
          where: { articleId, filename: baseName },
          select: { id: true },
        });
        if (already) continue;

        const extension = extname(baseName) || '.png';
        const storedPath = `knowledge/${randomBytes(18).toString('hex')}${extension}`;
        try {
          await copyFile(sourceFile, join(uploadDir, storedPath));
        } catch {
          continue;
        }
        const fileStat = await stat(join(uploadDir, storedPath));
        await prisma.knowledgeAttachment.create({
          data: {
            articleId,
            filename: baseName,
            storedPath,
            mimeType: extension === '.png' ? 'image/png' : 'image/jpeg',
            size: fileStat.size,
            uploadedBy: admin.id,
          },
        });
        imagesCopied += 1;
      }
    }
  } catch (error) {
    console.warn('跳过图片导入：', (error as Error).message);
  }

  const articles = await prisma.knowledgeArticle.findMany({
    select: { code: true, space: true },
  });
  const sequences = await prisma.knowledgeSequence.findMany();
  const existing = new Map(sequences.map((item) => [item.space, item.value]));
  const maxBySpace = new Map<KnowledgeSpace, number>();
  for (const article of articles) {
    const match = /-(\d+)$/.exec(article.code);
    if (!match) continue;
    const value = Number(match[1]);
    if (value > (maxBySpace.get(article.space) ?? 0)) {
      maxBySpace.set(article.space, value);
    }
  }
  for (const [space, value] of maxBySpace) {
    const current = existing.get(space) ?? 0;
    if (value > current) {
      await prisma.knowledgeSequence.upsert({
        where: { space },
        update: { value },
        create: { space, value },
      });
    }
  }

  console.log(
    `知识导入完成：新增场景卡 ${cardsCreated}，新增长文档 ${docsCreated}，图片 ${imagesCopied}。已存在条目已跳过。`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
