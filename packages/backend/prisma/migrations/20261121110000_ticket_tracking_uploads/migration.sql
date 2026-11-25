-- 提交人从“联系方式”收敛为姓名
ALTER TABLE "Ticket" RENAME COLUMN "contact" TO "reporterName";

-- 公开进度页使用不可枚举的随机 token
ALTER TABLE "Ticket" ADD COLUMN "publicToken" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "claimedAt" TIMESTAMP(3);

UPDATE "Ticket"
SET "publicToken" = md5(random()::text || id)
WHERE "publicToken" IS NULL;

ALTER TABLE "Ticket" ALTER COLUMN "publicToken" SET NOT NULL;
CREATE UNIQUE INDEX "Ticket_publicToken_key" ON "Ticket"("publicToken");

UPDATE "Ticket"
SET "claimedAt" = "updatedAt"
WHERE "status" IN ('CLAIMED', 'RESOLVED', 'CLOSED')
  AND "claimedAt" IS NULL;

-- 匿名提交的附件没有登录用户
ALTER TABLE "TicketAttachment" DROP CONSTRAINT "TicketAttachment_uploadedBy_fkey";
ALTER TABLE "TicketAttachment" ALTER COLUMN "uploadedBy" DROP NOT NULL;
ALTER TABLE "TicketAttachment"
  ADD CONSTRAINT "TicketAttachment_uploadedBy_fkey"
  FOREIGN KEY ("uploadedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
