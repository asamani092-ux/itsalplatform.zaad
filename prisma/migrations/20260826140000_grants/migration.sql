-- CreateEnum GrantStatus / GrantStageStatus
DO $$ BEGIN
  CREATE TYPE "GrantStatus" AS ENUM ('Open', 'Closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GrantStageStatus" AS ENUM ('Pending', 'Done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable Grant
CREATE TABLE IF NOT EXISTS "Grant" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "donorName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "stageCount" INTEGER NOT NULL DEFAULT 0,
    "status" "GrantStatus" NOT NULL DEFAULT 'Open',
    "departmentId" TEXT,
    "createdById" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Grant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Grant_status_idx" ON "Grant"("status");
CREATE INDEX IF NOT EXISTS "Grant_departmentId_idx" ON "Grant"("departmentId");
CREATE INDEX IF NOT EXISTS "Grant_createdAt_idx" ON "Grant"("createdAt");

-- CreateTable GrantStage
CREATE TABLE IF NOT EXISTS "GrantStage" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "dueDate" TIMESTAMP(3),
    "status" "GrantStageStatus" NOT NULL DEFAULT 'Pending',
    "note" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrantStage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GrantStage_grantId_idx" ON "GrantStage"("grantId");
CREATE INDEX IF NOT EXISTS "GrantStage_status_idx" ON "GrantStage"("status");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "Grant" ADD CONSTRAINT "Grant_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Grant" ADD CONSTRAINT "Grant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "CommEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GrantStage" ADD CONSTRAINT "GrantStage_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "Grant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
