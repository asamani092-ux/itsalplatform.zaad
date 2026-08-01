import type { Metadata } from "next";
import DynamicSubmitForm from "@/components/public/DynamicSubmitForm";
import PublicSubmitShell from "@/components/public/PublicSubmitShell";
import { getFormSettings } from "@/lib/form-settings/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تقديم طلب — منصة قسم الاتصال المؤسسي",
  description: "نموذج تقديم طلب لقسم الاتصال المؤسسي — جمعية الزاد",
};

export default async function RequestPage() {
  const [departments, requestTypes, formSettings] = await Promise.all([
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
  ]);

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
