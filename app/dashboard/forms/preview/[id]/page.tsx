import Link from "next/link";
import { notFound } from "next/navigation";
import ModuleDisabled from "@/components/shared/module-disabled";
import DynamicSubmitForm from "@/components/public/DynamicSubmitForm";
import { findModule } from "@/lib/modules/registry";
import { isModuleEnabled } from "@/lib/modules/server";
import { getFormById } from "@/lib/forms/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FormPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const enabled = await isModuleEnabled("request-forms");
  if (!enabled) {
    return <ModuleDisabled label={findModule("request-forms")?.label ?? "نماذج الطلبات"} />;
  }

  const { id } = await params;
  const form = await getFormById(id);
  if (!form) notFound();

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-brand-gray">معاينة حقيقية للنموذج</p>
          <h2 className="text-lg font-bold text-primary">{form.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/forms" className="btn-secondary text-sm">
            العودة للنماذج
          </Link>
          <Link
            href={`/f/${form.slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-sm"
          >
            فتح الرابط العام
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-surface-border bg-surface p-2 sm:p-4">
        <DynamicSubmitForm
          slug={form.slug}
          preview
          initialDepartments={departments}
          initialRequestTypes={requestTypes}
          settings={form}
          pinnedDepartmentId={form.departmentId}
          pinnedRequestTypeId={form.requestTypeId}
        />
      </div>
    </div>
  );
}
