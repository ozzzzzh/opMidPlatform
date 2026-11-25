-- AlterTable
ALTER TABLE "Subsystem" ADD COLUMN     "accountHint" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "url" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Subsystem_visible_sortOrder_idx" ON "Subsystem"("visible", "sortOrder");
