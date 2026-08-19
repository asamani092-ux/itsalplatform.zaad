-- Phone optional for team members; email remains the unique login identifier.
ALTER TABLE "CommEmployee" ALTER COLUMN "phoneNumber" DROP NOT NULL;
