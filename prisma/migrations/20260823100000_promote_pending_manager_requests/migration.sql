UPDATE "CommunicationRequest"
SET
  "status" = 'Approved_Pending_Assignment',
  "approvedAt" = COALESCE("approvedAt", NOW())
WHERE "status" = 'Pending_Manager';

ALTER TABLE "CommunicationRequest"
ALTER COLUMN "status" SET DEFAULT 'Approved_Pending_Assignment';
