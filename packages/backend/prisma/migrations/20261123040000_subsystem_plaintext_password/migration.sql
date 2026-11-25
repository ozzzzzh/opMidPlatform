-- AlterTable
ALTER TABLE "Subsystem" ADD COLUMN     "password" TEXT,
ADD COLUMN     "passwordUpdatedAt" TIMESTAMP(3),
DROP COLUMN "credentialCipher",
DROP COLUMN "credentialUpdatedAt";
