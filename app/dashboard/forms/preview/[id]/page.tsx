import Link from "next/link";
import { notFound } from "next/navigation";
import DynamicSubmitForm from "@/components/public/DynamicSubmitForm";
import PublicSubmitShell from "@/components/public/PublicSubmitShell";
import { getFormById } from "@/lib/forms/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FormPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const form = await getFormById(id);
  if (!form) notFound();

  const [departments, requestTypes] = await Promise.all([
    prisma.department.findMany({
      where: { isActive: true, ...(form.departmentId ? { id: form.departmentId } : {}) },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.requestType.findMany({
      where: {
        isActive: true,
        ...(form.requestTypeId ? { id: form.requestTypeId } : {}),
        ...(form.departmentId && !form.requestTypeId
          ? { departmentId: form.departmentId }
          : {}),
      },
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
    <div className="min-h-screen bg-surface-muted">
      <div className="border-b border-surface-border bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-primary">
            معاينة النموذج: {form.name}
          </p>
          <Link href="/dashboard/forms" className="btn-secondary text-xs">
            العودة للنماذج
          </Link>
        </div>
        <p className="mx-auto mt-1 max-w-lg text-xs text-brand-gray">
          وضع معاينة — الإرسال تجريبي ولن يُسجَّل كطلب حقيقي.
        </p>
      </div>
      <PublicSubmitShell
        title={form.pageTitle}
        subtitle={form.pageSubtitle}
        introText={form.introText}
      >
        <DynamicSubmitForm
          slug={form.slug}
          preview
          initialDepartments={departments}
          initialRequestTypes={requestTypes}
          settings={form}
          pinnedDepartmentId={form.departmentId}
          pinnedRequestTypeId={form.requestTypeId}
        />
      </PublicSubmitShell>
    </div>
  );
}
