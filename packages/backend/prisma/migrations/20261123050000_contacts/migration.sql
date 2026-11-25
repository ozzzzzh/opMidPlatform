-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '联系人',
    "systemName" TEXT NOT NULL,
    "systemShortName" TEXT,
    "category" TEXT,
    "systemUrl" TEXT,
    "unit" TEXT,
    "businessDept" TEXT,
    "landline" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contact_systemName_sortOrder_idx" ON "Contact"("systemName", "sortOrder");

-- CreateIndex
CREATE INDEX "Contact_name_idx" ON "Contact"("name");

-- CreateIndex
CREATE INDEX "Contact_category_idx" ON "Contact"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_systemName_name_key" ON "Contact"("systemName", "name");

