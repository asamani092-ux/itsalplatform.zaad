-- CreateTable
CREATE TABLE "PlatformModule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformModule_key_key" ON "PlatformModule"("key");

-- CreateIndex
CREATE INDEX "PlatformModule_isEnabled_idx" ON "PlatformModule"("isEnabled");

-- CreateIndex
CREATE INDEX "PlatformModule_sortOrder_idx" ON "PlatformModule"("sortOrder");

-- AlterTable
ALTER TABLE "FormSettings" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
