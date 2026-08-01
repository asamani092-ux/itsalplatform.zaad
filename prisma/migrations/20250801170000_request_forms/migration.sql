-- CreateTable
CREATE TABLE "RequestForm" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "departmentId" TEXT,
    "requestTypeId" TEXT,
    "pageTitle" TEXT NOT NULL DEFAULT 'جمعية الزاد',
    "pageSubtitle" TEXT NOT NULL DEFAULT 'تقديم طلب',
    "introText" TEXT NOT NULL DEFAULT '',
    "submitLabel" TEXT NOT NULL DEFAULT 'تقديم الطلب',
    "successTitle" TEXT NOT NULL DEFAULT 'تم تقديم الطلب بنجاح',
    "successMessage" TEXT NOT NULL DEFAULT 'سيُرسل رابط الموافقة للمدير المباشر تلقائياً.',
    "fields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequestForm_slug_key" ON "RequestForm"("slug");

-- CreateIndex
CREATE INDEX "RequestForm_isPublished_idx" ON "RequestForm"("isPublished");

-- CreateIndex
CREATE INDEX "RequestForm_departmentId_idx" ON "RequestForm"("departmentId");

-- CreateIndex
CREATE INDEX "RequestForm_requestTypeId_idx" ON "RequestForm"("requestTypeId");

-- AddForeignKey
ALTER TABLE "RequestForm" ADD CONSTRAINT "RequestForm_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestForm" ADD CONSTRAINT "RequestForm_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "RequestType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate the singleton form settings into the first request form
INSERT INTO "RequestForm" (
    "id", "slug", "name", "isPublished", "isDefault",
    "pageTitle", "pageSubtitle", "introText", "submitLabel",
    "successTitle", "successMessage", "fields", "createdAt", "updatedAt"
)
SELECT
    'form_general',
    'general',
    'النموذج العام',
    COALESCE("isPublished", true),
    true,
    "pageTitle", "pageSubtitle", "introText", "submitLabel",
    "successTitle", "successMessage", "fields", "createdAt", CURRENT_TIMESTAMP
FROM "FormSettings"
WHERE "key" = 'default'
ON CONFLICT ("slug") DO NOTHING;

-- Ensure a default form exists even when no settings row was present
INSERT INTO "RequestForm" ("id", "slug", "name", "isPublished", "isDefault", "updatedAt")
SELECT 'form_general', 'general', 'النموذج العام', true, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "RequestForm" WHERE "slug" = 'general');

-- DropTable
DROP TABLE IF EXISTS "FormSettings";
