-- CreateEnum
CREATE TYPE "VisitScheduleStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ReceptionScheduledVisit" (
    "id" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorPhone" TEXT NOT NULL DEFAULT '',
    "organization" TEXT NOT NULL DEFAULT '',
    "visitType" TEXT NOT NULL DEFAULT '',
    "visitTarget" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "visitTimeSlot" TEXT NOT NULL DEFAULT '',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "VisitScheduleStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "requestId" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "visitorLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceptionScheduledVisit_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AttendanceAttendee" ADD COLUMN "visitorLogId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ReceptionScheduledVisit_requestId_key" ON "ReceptionScheduledVisit"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceptionScheduledVisit_visitorLogId_key" ON "ReceptionScheduledVisit"("visitorLogId");

-- CreateIndex
CREATE INDEX "ReceptionScheduledVisit_scheduledAt_idx" ON "ReceptionScheduledVisit"("scheduledAt");

-- CreateIndex
CREATE INDEX "ReceptionScheduledVisit_status_idx" ON "ReceptionScheduledVisit"("status");

-- CreateIndex
CREATE INDEX "ReceptionScheduledVisit_source_idx" ON "ReceptionScheduledVisit"("source");

-- CreateIndex
CREATE INDEX "ReceptionScheduledVisit_createdById_idx" ON "ReceptionScheduledVisit"("createdById");

-- CreateIndex
CREATE INDEX "ReceptionScheduledVisit_approvedById_idx" ON "ReceptionScheduledVisit"("approvedById");

-- CreateIndex
CREATE INDEX "AttendanceAttendee_visitorLogId_idx" ON "AttendanceAttendee"("visitorLogId");

-- AddForeignKey
ALTER TABLE "ReceptionScheduledVisit" ADD CONSTRAINT "ReceptionScheduledVisit_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CommunicationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionScheduledVisit" ADD CONSTRAINT "ReceptionScheduledVisit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "CommEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionScheduledVisit" ADD CONSTRAINT "ReceptionScheduledVisit_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "CommEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionScheduledVisit" ADD CONSTRAINT "ReceptionScheduledVisit_visitorLogId_fkey" FOREIGN KEY ("visitorLogId") REFERENCES "ReceptionVisitorLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAttendee" ADD CONSTRAINT "AttendanceAttendee_visitorLogId_fkey" FOREIGN KEY ("visitorLogId") REFERENCES "ReceptionVisitorLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
