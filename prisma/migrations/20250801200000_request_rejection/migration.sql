-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'Rejected';

-- AlterTable
ALTER TABLE "CommunicationRequest" ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "rejectionReason" TEXT;
