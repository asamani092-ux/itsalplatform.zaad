-- Explicit per-employee reception desk capability (replaces department-token inference).
ALTER TABLE "CommEmployee" ADD COLUMN IF NOT EXISTS "isReceptionDesk" BOOLEAN NOT NULL DEFAULT false;
