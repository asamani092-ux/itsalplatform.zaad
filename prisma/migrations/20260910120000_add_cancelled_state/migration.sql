-- AlterEnum RequestStatus: add Cancelled state (distinct from Rejected for reports/notifications)
DO $$ BEGIN
  ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'Cancelled';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CommunicationRequest cancellation fields
ALTER TABLE "CommunicationRequest" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "CommunicationRequest" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
