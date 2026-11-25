-- Super Urgent 彩蛋优先级
ALTER TYPE "Priority" ADD VALUE IF NOT EXISTS 'SUPER_URGENT';

-- 工单号 + 查询码作为可长期保存的公开查询凭证
ALTER TABLE "Ticket" ADD COLUMN "accessCode" TEXT;

UPDATE "Ticket"
SET "accessCode" = upper(substring(md5(random()::text || id), 1, 10))
WHERE "accessCode" IS NULL;

ALTER TABLE "Ticket" ALTER COLUMN "accessCode" SET NOT NULL;
CREATE UNIQUE INDEX "Ticket_accessCode_key" ON "Ticket"("accessCode");
