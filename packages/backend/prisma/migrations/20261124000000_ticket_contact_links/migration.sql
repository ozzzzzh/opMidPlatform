-- CreateTable
CREATE TABLE "TicketContactLink" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketContactLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketContactLink_contactId_idx" ON "TicketContactLink"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketContactLink_ticketId_contactId_key" ON "TicketContactLink"("ticketId", "contactId");

-- AddForeignKey
ALTER TABLE "TicketContactLink" ADD CONSTRAINT "TicketContactLink_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketContactLink" ADD CONSTRAINT "TicketContactLink_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketContactLink" ADD CONSTRAINT "TicketContactLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

