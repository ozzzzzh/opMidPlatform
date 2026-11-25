-- CreateEnum
CREATE TYPE "KnowledgeKind" AS ENUM ('CARD', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "KnowledgeDocType" AS ENUM ('HANDBOOK', 'REFERENCE');

-- CreateEnum
CREATE TYPE "KnowledgeSpace" AS ENUM ('TERM', 'MEET', 'OFFICE', 'NET', 'BIZ', 'ASSET', 'OPS');

-- CreateEnum
CREATE TYPE "KnowledgeLinkSource" AS ENUM ('MANUAL', 'AUTO');

-- DropIndex
DROP INDEX "KnowledgeArticle_category_status_idx";

-- AlterTable
ALTER TABLE "KnowledgeArticle" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "docType" "KnowledgeDocType",
ADD COLUMN     "escalation" TEXT,
ADD COLUMN     "filename" TEXT,
ADD COLUMN     "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "kind" "KnowledgeKind" NOT NULL DEFAULT 'CARD',
ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "legacyPaths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "size" INTEGER,
ADD COLUMN     "sourceTicketNo" TEXT,
ADD COLUMN     "space" "KnowledgeSpace" NOT NULL,
ADD COLUMN     "steps" JSONB,
ADD COLUMN     "storedPath" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "symptom" TEXT,
ADD COLUMN     "system" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "content" DROP NOT NULL,
ALTER COLUMN "category" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TicketKnowledgeLink" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "source" "KnowledgeLinkSource" NOT NULL DEFAULT 'MANUAL',
ALTER COLUMN "autoLinked" SET DEFAULT false;

-- CreateTable
CREATE TABLE "KnowledgeAttachment" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeRevision" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "editorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSequence" (
    "space" "KnowledgeSpace" NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KnowledgeSequence_pkey" PRIMARY KEY ("space")
);

-- CreateIndex
CREATE INDEX "KnowledgeAttachment_articleId_sortOrder_idx" ON "KnowledgeAttachment"("articleId", "sortOrder");

-- CreateIndex
CREATE INDEX "KnowledgeRevision_articleId_createdAt_idx" ON "KnowledgeRevision"("articleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeRevision_articleId_version_key" ON "KnowledgeRevision"("articleId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeArticle_code_key" ON "KnowledgeArticle"("code");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_space_status_kind_idx" ON "KnowledgeArticle"("space", "status", "kind");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_status_updatedAt_idx" ON "KnowledgeArticle"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_ownerId_idx" ON "KnowledgeArticle"("ownerId");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_searchText_trgm_idx" ON "KnowledgeArticle" USING gin ("searchText" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "KnowledgeArticle_title_trgm_idx" ON "KnowledgeArticle" USING gin ("title" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeAttachment" ADD CONSTRAINT "KnowledgeAttachment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeAttachment" ADD CONSTRAINT "KnowledgeAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeRevision" ADD CONSTRAINT "KnowledgeRevision_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeRevision" ADD CONSTRAINT "KnowledgeRevision_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketKnowledgeLink" ADD CONSTRAINT "TicketKnowledgeLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

