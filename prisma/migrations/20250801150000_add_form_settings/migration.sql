-- CreateTable
CREATE TABLE "FormSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "pageTitle" TEXT NOT NULL DEFAULT 'جمعية الزاد',
    "pageSubtitle" TEXT NOT NULL DEFAULT 'تقديم طلب',
    "introText" TEXT NOT NULL DEFAULT '',
    "submitLabel" TEXT NOT NULL DEFAULT 'تقديم الطلب',
    "successTitle" TEXT NOT NULL DEFAULT 'تم تقديم الطلب بنجاح',
    "successMessage" TEXT NOT NULL DEFAULT 'سيُرسل رابط الموافقة للمدير المباشر تلقائياً.',
    "fields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormSettings_key_key" ON "FormSettings"("key");

-- CreateIndex
CREATE INDEX "FormSettings_key_idx" ON "FormSettings"("key");
