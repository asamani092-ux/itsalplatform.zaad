-- AlterTable
ALTER TABLE "RequestForm" ADD COLUMN IF NOT EXISTS "successNextSteps" TEXT NOT NULL DEFAULT '';
