-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('EMPLOYEE', 'MANAGER');

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "managerEmail" TEXT NOT NULL,
    "receptionToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "requiresVisitDate" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingRule" (
    "id" TEXT NOT NULL,
    "requestTypeId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutingRule_pkey" PRIMARY KEY ("id")
);

-- AlterTable CommEmployee
ALTER TABLE "CommEmployee" ADD COLUMN "phoneNumber" TEXT;
ALTER TABLE "CommEmployee" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "CommEmployee" ADD COLUMN "role" "EmployeeRole" NOT NULL DEFAULT 'EMPLOYEE';

-- Backfill employees with placeholder auth fields
UPDATE "CommEmployee" c
SET
  "phoneNumber" = '0500000' || LPAD(sub.rn::text, 4, '0'),
  "passwordHash" = '$2a$10$placeholder.hash.will.be.replaced.by.seed'
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
  FROM "CommEmployee"
) sub
WHERE c.id = sub.id;

ALTER TABLE "CommEmployee" ALTER COLUMN "phoneNumber" SET NOT NULL;
ALTER TABLE "CommEmployee" ALTER COLUMN "passwordHash" SET NOT NULL;

-- Seed default department and request type for existing requests
INSERT INTO "Department" ("id", "name", "slug", "managerEmail", "receptionToken", "isActive", "createdAt", "updatedAt")
VALUES ('dept_default', 'قسم عام', 'general', 'manager@zaad.org', 'reception-default-token', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "RequestType" ("id", "name", "slug", "description", "requiresVisitDate", "isActive", "departmentId", "createdAt", "updatedAt")
VALUES ('rtype_default', 'طلب عام', 'general-request', 'نوع طلب افتراضي للطلبات السابقة', false, true, 'dept_default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable CommunicationRequest
ALTER TABLE "CommunicationRequest" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "CommunicationRequest" ADD COLUMN "requestTypeId" TEXT;
ALTER TABLE "CommunicationRequest" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "CommunicationRequest" ADD COLUMN "proofFileUrl" TEXT;
ALTER TABLE "CommunicationRequest" ADD COLUMN "visitDate" TIMESTAMP(3);
ALTER TABLE "CommunicationRequest" ADD COLUMN "visitAttended" BOOLEAN;
ALTER TABLE "CommunicationRequest" ADD COLUMN "visitMarkedAt" TIMESTAMP(3);

-- Migrate managerApprovedAt -> approvedAt
UPDATE "CommunicationRequest" SET "approvedAt" = "managerApprovedAt" WHERE "managerApprovedAt" IS NOT NULL;
UPDATE "CommunicationRequest" SET "departmentId" = 'dept_default', "requestTypeId" = 'rtype_default' WHERE "departmentId" IS NULL;

ALTER TABLE "CommunicationRequest" ALTER COLUMN "departmentId" SET NOT NULL;
ALTER TABLE "CommunicationRequest" ALTER COLUMN "requestTypeId" SET NOT NULL;

ALTER TABLE "CommunicationRequest" DROP COLUMN "managerApprovedAt";

-- CreateIndex
CREATE UNIQUE INDEX "Department_slug_key" ON "Department"("slug");
CREATE UNIQUE INDEX "Department_receptionToken_key" ON "Department"("receptionToken");
CREATE INDEX "Department_isActive_idx" ON "Department"("isActive");

CREATE UNIQUE INDEX "RequestType_slug_key" ON "RequestType"("slug");
CREATE INDEX "RequestType_isActive_idx" ON "RequestType"("isActive");
CREATE INDEX "RequestType_departmentId_idx" ON "RequestType"("departmentId");

CREATE UNIQUE INDEX "RoutingRule_requestTypeId_employeeId_key" ON "RoutingRule"("requestTypeId", "employeeId");
CREATE INDEX "RoutingRule_requestTypeId_idx" ON "RoutingRule"("requestTypeId");
CREATE INDEX "RoutingRule_employeeId_idx" ON "RoutingRule"("employeeId");

CREATE UNIQUE INDEX "CommEmployee_phoneNumber_key" ON "CommEmployee"("phoneNumber");
CREATE INDEX "CommEmployee_role_idx" ON "CommEmployee"("role");

CREATE INDEX "CommunicationRequest_departmentId_idx" ON "CommunicationRequest"("departmentId");
CREATE INDEX "CommunicationRequest_requestTypeId_idx" ON "CommunicationRequest"("requestTypeId");
CREATE INDEX "CommunicationRequest_visitDate_idx" ON "CommunicationRequest"("visitDate");

-- AddForeignKey
ALTER TABLE "RequestType" ADD CONSTRAINT "RequestType_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoutingRule" ADD CONSTRAINT "RoutingRule_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "RequestType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoutingRule" ADD CONSTRAINT "RoutingRule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CommEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunicationRequest" ADD CONSTRAINT "CommunicationRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunicationRequest" ADD CONSTRAINT "CommunicationRequest_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "RequestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
