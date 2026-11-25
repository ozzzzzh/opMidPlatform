import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';

interface CredentialInput {
  name: string;
  account?: string | null;
  password: string;
}

const prisma = new PrismaClient();

async function readInputs(): Promise<CredentialInput[]> {
  const filePath = process.argv[2];
  if (filePath) {
    return JSON.parse(await readFile(filePath, 'utf8')) as CredentialInput[];
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as CredentialInput[];
}

async function main(): Promise<void> {
  const inputs = await readInputs();
  let updated = 0;
  let skipped = 0;

  for (const input of inputs) {
    if (!input.name) {
      skipped += 1;
      continue;
    }

    const subsystem = await prisma.subsystem.findFirst({ where: { name: input.name } });
    if (!subsystem) {
      skipped += 1;
      continue;
    }

    const password = input.password?.trim();
    await prisma.subsystem.update({
      where: { id: subsystem.id },
      data: {
        ...(input.account ? { accountHint: input.account } : {}),
        ...(password ? { password, passwordUpdatedAt: new Date() } : {}),
      },
    });
    updated += 1;
  }

  console.log(`子系统账号密码导入完成：更新 ${updated} 条，跳过 ${skipped} 条。`);
}

main()
  .catch((error: unknown) => {
    console.error('[subsystem-credentials] 失败：', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
