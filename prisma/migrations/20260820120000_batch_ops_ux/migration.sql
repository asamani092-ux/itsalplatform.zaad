-- AlterTable CommEmployee
ALTER TABLE "CommEmployee" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

-- Backfill ReceptionVisitorLog before NOT NULL
UPDATE "ReceptionVisitorLog" SET "organization" = COALESCE("organization", '');
UPDATE "ReceptionVisitorLog" SET "reason" = COALESCE("reason", '');

ALTER TABLE "ReceptionVisitorLog" ADD COLUMN IF NOT EXISTS "visitType" TEXT;
ALTER TABLE "ReceptionVisitorLog" ADD COLUMN IF NOT EXISTS "visitTarget" TEXT;
ALTER TABLE "ReceptionVisitorLog" ADD COLUMN IF NOT EXISTS "visitTimeSlot" TEXT;

UPDATE "ReceptionVisitorLog" SET "visitType" = 'شخصي' WHERE "visitType" IS NULL;
UPDATE "ReceptionVisitorLog" SET "visitTarget" = COALESCE(NULLIF("reason", ''), 'زائر') WHERE "visitTarget" IS NULL OR "visitTarget" = '';
UPDATE "ReceptionVisitorLog" SET "visitTimeSlot" = 'الصباح' WHERE "visitTimeSlot" IS NULL;

ALTER TABLE "ReceptionVisitorLog" ALTER COLUMN "visitType" SET DEFAULT 'شخصي';
ALTER TABLE "ReceptionVisitorLog" ALTER COLUMN "visitType" SET NOT NULL;
ALTER TABLE "ReceptionVisitorLog" ALTER COLUMN "visitTarget" SET DEFAULT '';
ALTER TABLE "ReceptionVisitorLog" ALTER COLUMN "visitTarget" SET NOT NULL;
ALTER TABLE "ReceptionVisitorLog" ALTER COLUMN "visitTimeSlot" SET DEFAULT 'الصباح';
ALTER TABLE "ReceptionVisitorLog" ALTER COLUMN "visitTimeSlot" SET NOT NULL;
ALTER TABLE "ReceptionVisitorLog" ALTER COLUMN "organization" SET DEFAULT '';
ALTER TABLE "ReceptionVisitorLog" ALTER COLUMN "organization" SET NOT NULL;
ALTER TABLE "ReceptionVisitorLog" ALTER COLUMN "reason" SET DEFAULT '';

-- AlterTable HospitalityBooking
ALTER TABLE "HospitalityBooking" ALTER COLUMN "requesterPhone" SET DEFAULT '';
UPDATE "HospitalityBooking" SET "requesterPhone" = COALESCE("requesterPhone", '');
ALTER TABLE "HospitalityBooking" ADD COLUMN IF NOT EXISTS "cateringRequests" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "AttendanceEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AttendanceAttendee" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "checkedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceAttendee_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CommEmployee_departmentId_idx" ON "CommEmployee"("departmentId");
CREATE INDEX IF NOT EXISTS "ReceptionVisitorLog_visitType_idx" ON "ReceptionVisitorLog"("visitType");
CREATE INDEX IF NOT EXISTS "ReceptionVisitorLog_visitTimeSlot_idx" ON "ReceptionVisitorLog"("visitTimeSlot");
CREATE INDEX IF NOT EXISTS "AttendanceEvent_scheduledAt_idx" ON "AttendanceEvent"("scheduledAt");
CREATE INDEX IF NOT EXISTS "AttendanceEvent_kind_idx" ON "AttendanceEvent"("kind");
CREATE INDEX IF NOT EXISTS "AttendanceAttendee_eventId_idx" ON "AttendanceAttendee"("eventId");
CREATE INDEX IF NOT EXISTS "AttendanceAttendee_attended_idx" ON "AttendanceAttendee"("attended");

DO $$ BEGIN
  ALTER TABLE "CommEmployee" ADD CONSTRAINT "CommEmployee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "CommEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AttendanceAttendee" ADD CONSTRAINT "AttendanceAttendee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AttendanceEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
