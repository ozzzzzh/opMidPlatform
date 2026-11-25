-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_submitterId_fkey";

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "contact" TEXT,
ALTER COLUMN "submitterId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TicketSequence" (
    "date" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TicketSequence_pkey" PRIMARY KEY ("date")
);

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
