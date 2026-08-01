-- AlterTable
ALTER TABLE "HospitalityBooking" ADD COLUMN "requestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "HospitalityBooking_requestId_key" ON "HospitalityBooking"("requestId");

-- CreateIndex
CREATE INDEX "HospitalityBooking_requestId_idx" ON "HospitalityBooking"("requestId");

-- AddForeignKey
ALTER TABLE "HospitalityBooking" ADD CONSTRAINT "HospitalityBooking_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CommunicationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
