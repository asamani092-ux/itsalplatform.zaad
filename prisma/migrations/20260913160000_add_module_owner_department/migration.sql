-- AlterTable
ALTER TABLE "PlatformModule" ADD COLUMN "ownerDepartmentId" TEXT;

-- CreateIndex
CREATE INDEX "PlatformModule_ownerDepartmentId_idx" ON "PlatformModule"("ownerDepartmentId");

-- AddForeignKey
ALTER TABLE "PlatformModule" ADD CONSTRAINT "PlatformModule_ownerDepartmentId_fkey" FOREIGN KEY ("ownerDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
