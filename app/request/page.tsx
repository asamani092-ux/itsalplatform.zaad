import type { Metadata } from "next";
import Link from "next/link";
import DynamicSubmitForm from "@/components/public/DynamicSubmitForm";
import PublicSubmitShell from "@/components/public/PublicSubmitShell";
import { getFormSettings } from "@/lib/form-settings/server";
import { isModuleEnabled } from "@/lib/modules/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تقديم طلب — منصة الاتصال المؤسسي",
  description: "نموذج تقديم طلب لقسم الاتصال المؤسسي — جمعية الزاد",
};

export default async function RequestPage() {
  const [departments, requestTypes, formSettings, moduleEnabled] = await Promise.all([
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.requestType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        requiresVisitDate: true,
        departmentId: true,
      },
      orderBy: { name: "asc" },
    }),
    getFormSettings(),
    isModuleEnabled("request-form"),
  ]);

  if (!moduleEnabled || !formSettings.isPublished) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted p-6">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-surface-border bg-surface p-6 text-center shadow-sm">
          <span className="badge-warning">استقبال الطلبات متوقف</span>
          <h1 className="text-lg font-bold text-primary">{formSettings.pageTitle}</h1>
          <p className="text-sm text-brand-gray">
            نموذج تقديم الطلبات غير متاح حالياً. يرجى المحاولة لاحقاً أو التواصل مع قسم
            الاتصال المؤسسي.
          </p>
          <Link href="/" className="btn-secondary inline-flex">
            العودة لبوابة المنصة
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PublicSubmitShell
      title={formSettings.pageTitle}
      subtitle={formSettings.pageSubtitle}
      introText={formSettings.introText}
    >
      <DynamicSubmitForm
        slug="communications"
        initialDepartments={departments}
        initialRequestTypes={requestTypes}
        settings={formSettings}
      />
    </PublicSubmitShell>
  );
}
