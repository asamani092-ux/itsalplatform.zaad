-- AlterEnum (idempotent-safe via DO block)
DO $$ BEGIN
  ALTER TYPE "RequestStatus" ADD VALUE 'Rejected';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "CommunicationRequest" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "CommunicationRequest" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
