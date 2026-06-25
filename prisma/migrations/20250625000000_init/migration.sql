-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('Pending_Manager', 'Approved_Pending_Assignment', 'In_Progress', 'Completed', 'Archived');

-- CreateTable
CREATE TABLE "CommEmployee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationRequest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requiredDate" TIMESTAMP(3) NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "managerEmail" TEXT NOT NULL,
    "approvalToken" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'Pending_Manager',
    "assignedEmployeeId" TEXT,
    "managerApprovedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentHistory" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "note" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fromStatus" "RequestStatus",
    "toStatus" "RequestStatus" NOT NULL,
    "changedBy" TEXT,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalityBooking" (
    "id" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterPhone" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "attendeesCount" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalityBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommEmployee_email_key" ON "CommEmployee"("email");

-- CreateIndex
CREATE INDEX "CommEmployee_isActive_idx" ON "CommEmployee"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationRequest_approvalToken_key" ON "CommunicationRequest"("approvalToken");

-- CreateIndex
CREATE INDEX "CommunicationRequest_status_idx" ON "CommunicationRequest"("status");

-- CreateIndex
CREATE INDEX "CommunicationRequest_approvalToken_idx" ON "CommunicationRequest"("approvalToken");

-- CreateIndex
CREATE INDEX "CommunicationRequest_assignedEmployeeId_idx" ON "CommunicationRequest"("assignedEmployeeId");

-- CreateIndex
CREATE INDEX "CommunicationRequest_createdAt_idx" ON "CommunicationRequest"("createdAt");

-- CreateIndex
CREATE INDEX "AssignmentHistory_requestId_idx" ON "AssignmentHistory"("requestId");

-- CreateIndex
CREATE INDEX "AssignmentHistory_employeeId_idx" ON "AssignmentHistory"("employeeId");

-- CreateIndex
CREATE INDEX "StatusHistory_requestId_idx" ON "StatusHistory"("requestId");

-- CreateIndex
CREATE INDEX "StatusHistory_toStatus_idx" ON "StatusHistory"("toStatus");

-- CreateIndex
CREATE INDEX "HospitalityBooking_meetingDate_idx" ON "HospitalityBooking"("meetingDate");

-- CreateIndex
CREATE INDEX "MediaDocument_category_idx" ON "MediaDocument"("category");

-- CreateIndex
CREATE INDEX "MediaDocument_isActive_idx" ON "MediaDocument"("isActive");

-- AddForeignKey
ALTER TABLE "CommunicationRequest" ADD CONSTRAINT "CommunicationRequest_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "CommEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentHistory" ADD CONSTRAINT "AssignmentHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CommunicationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentHistory" ADD CONSTRAINT "AssignmentHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CommEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CommunicationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
