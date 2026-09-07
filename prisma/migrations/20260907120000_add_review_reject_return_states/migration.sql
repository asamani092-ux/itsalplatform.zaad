-- AlterEnum RequestStatus: add review / reject / return states
DO $$ BEGIN
  ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'Pending_Review';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'Returned';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'Rejected';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CommunicationRequest note + declaration fields
ALTER TABLE "CommunicationRequest" ADD COLUMN IF NOT EXISTS "completionDeclaredAt" TIMESTAMP(3);
ALTER TABLE "CommunicationRequest" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "CommunicationRequest" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;
ALTER TABLE "CommunicationRequest" ADD COLUMN IF NOT EXISTS "employeeNote" TEXT;
