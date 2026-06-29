import DynamicSubmitForm from "@/components/public/DynamicSubmitForm";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardSettingsPreviewPage() {
  const [departments, requestTypes] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/settings"
          className="text-xs text-brand-gray underline"
        >
          ← الإعدادات
        </Link>
        <p className="mt-2 text-sm text-brand-gray">
          عرض حي لنموذج التقديم كما يراه الموظفون — بناءً على الإعدادات الحالية
        </p>
      </div>
      <DynamicSubmitForm
        slug="communications"
        preview
        initialDepartments={departments}
        initialRequestTypes={requestTypes}
      />
    </div>
  );
}
