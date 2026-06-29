import DynamicSubmitForm from "@/components/public/DynamicSubmitForm";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function SettingsPreviewPage() {
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
    <main className="page-container space-y-6 py-8">
      <div>
        <Link href="/manager/settings" className="text-xs text-brand-gray underline">
          ← الإعدادات
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-primary">معاينة النموذج العام</h1>
        <p className="text-sm text-brand-gray">
          عرض حي لنموذج التقديم كما يراه الموظفون — بناءً على الإعدادات الحالية
        </p>
      </div>
      <DynamicSubmitForm
        slug="communications"
        preview
        initialDepartments={departments}
        initialRequestTypes={requestTypes}
      />
    </main>
  );
}
