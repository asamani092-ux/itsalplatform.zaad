-- AlterTable
ALTER TABLE "CommunicationRequest" ADD COLUMN "approvalTokenExpiresAt" TIMESTAMP(3);

-- Backfill existing rows
UPDATE "CommunicationRequest"
SET "approvalTokenExpiresAt" = "createdAt" + INTERVAL '7 days'
WHERE "approvalTokenExpiresAt" IS NULL;
