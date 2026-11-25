import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';

interface ContactInput {
  name: string;
  role?: string;
  systemName: string;
  systemShortName?: string;
  category?: string;
  systemUrl?: string;
  unit?: string;
  businessDept?: string;
  landline?: string;
  mobile?: string;
  email?: string;
  notes?: string;
  sortOrder?: number;
}

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const filePath = process.argv[2];
  if (!filePath) throw new Error('请提供联系人 JSON 文件路径');
  const inputs = JSON.parse(await readFile(filePath, 'utf8')) as ContactInput[];

  let created = 0;
  let updated = 0;
  for (const input of inputs) {
    if (!input.name?.trim() || !input.systemName?.trim()) continue;

    const name = input.name.trim();
    const systemName = input.systemName.trim();
    const existing = await prisma.contact.findUnique({
      where: { systemName_name: { systemName, name } },
    });

    const data = {
      role: input.role?.trim() || '联系人',
      systemShortName: input.systemShortName?.trim() || null,
      category: input.category?.trim() || null,
      systemUrl: input.systemUrl?.trim() || null,
      unit: input.unit?.trim() || null,
      businessDept: input.businessDept?.trim() || null,
      landline: input.landline?.trim() || null,
      mobile: input.mobile?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
    };

    if (existing) {
      await prisma.contact.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.contact.create({ data: { name, systemName, ...data } });
      created += 1;
    }
  }

  console.log(`通讯录导入完成：新增 ${created} 位，更新 ${updated} 位。`);
}

main()
  .catch((error: unknown) => {
    console.error('[contacts] 失败：', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
