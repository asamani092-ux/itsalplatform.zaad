-- CreateEnum AdministrationKind
DO $$ BEGIN
  CREATE TYPE "AdministrationKind" AS ENUM ('INTERNAL', 'EXTERNAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable Administration
CREATE TABLE IF NOT EXISTS "Administration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "managerEmail" TEXT NOT NULL,
    "kind" "AdministrationKind" NOT NULL DEFAULT 'EXTERNAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Administration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Administration_slug_key" ON "Administration"("slug");
CREATE INDEX IF NOT EXISTS "Administration_isActive_idx" ON "Administration"("isActive");
CREATE INDEX IF NOT EXISTS "Administration_kind_idx" ON "Administration"("kind");

-- AlterTable Department: link to Administration
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "administrationId" TEXT;
CREATE INDEX IF NOT EXISTS "Department_administrationId_idx" ON "Department"("administrationId");

-- AlterTable CommunicationRequest: requester administration + derived manager email
ALTER TABLE "CommunicationRequest" ADD COLUMN IF NOT EXISTS "requesterManagerEmail" TEXT;
ALTER TABLE "CommunicationRequest" ADD COLUMN IF NOT EXISTS "requesterAdministrationId" TEXT;
CREATE INDEX IF NOT EXISTS "CommunicationRequest_requesterAdministrationId_idx" ON "CommunicationRequest"("requesterAdministrationId");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "Department" ADD CONSTRAINT "Department_administrationId_fkey" FOREIGN KEY ("administrationId") REFERENCES "Administration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunicationRequest" ADD CONSTRAINT "CommunicationRequest_requesterAdministrationId_fkey" FOREIGN KEY ("requesterAdministrationId") REFERENCES "Administration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
