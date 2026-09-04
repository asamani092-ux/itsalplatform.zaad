-- CreateTable
CREATE TABLE "ReceptionVisitorLog" (
    "id" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorPhone" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "organization" TEXT,
    "visitAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,
    "requestId" TEXT,
    "markedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceptionVisitorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceptionVisitorLog_visitAt_idx" ON "ReceptionVisitorLog"("visitAt");

-- CreateIndex
CREATE INDEX "ReceptionVisitorLog_departmentId_idx" ON "ReceptionVisitorLog"("departmentId");

-- CreateIndex
CREATE INDEX "ReceptionVisitorLog_requestId_idx" ON "ReceptionVisitorLog"("requestId");

-- CreateIndex
CREATE INDEX "ReceptionVisitorLog_visitorPhone_idx" ON "ReceptionVisitorLog"("visitorPhone");

-- CreateIndex
CREATE INDEX "ReceptionVisitorLog_createdAt_idx" ON "ReceptionVisitorLog"("createdAt");

-- AddForeignKey
ALTER TABLE "ReceptionVisitorLog" ADD CONSTRAINT "ReceptionVisitorLog_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionVisitorLog" ADD CONSTRAINT "ReceptionVisitorLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CommunicationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionVisitorLog" ADD CONSTRAINT "ReceptionVisitorLog_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "CommEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
