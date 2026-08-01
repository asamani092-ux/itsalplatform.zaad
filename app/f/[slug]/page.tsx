import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DynamicSubmitForm from "@/components/public/DynamicSubmitForm";
import PublicSubmitShell from "@/components/public/PublicSubmitShell";
import { getFormBySlug } from "@/lib/forms/server";
import { isModuleEnabled } from "@/lib/modules/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const form = await getFormBySlug(slug);
  return {
    title: form ? `${form.pageSubtitle} — ${form.pageTitle}` : "نموذج طلب",
    description: form?.introText || "نموذج تقديم طلب — جمعية الزاد",
  };
}

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const form = await getFormBySlug(slug);
  if (!form) notFound();

  const moduleEnabled = await isModuleEnabled("request-forms");

  if (!moduleEnabled || !form.isPublished) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted p-6">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-surface-border bg-surface p-6 text-center shadow-sm">
          <span className="badge-warning">استقبال الطلبات متوقف</span>
          <h1 className="text-lg font-bold text-primary">{form.pageTitle}</h1>
          <p className="text-sm text-brand-gray">
            هذا النموذج غير متاح حالياً. يرجى المحاولة لاحقاً أو التواصل مع قسم الاتصال
            المؤسسي.
          </p>
          <Link href="/" className="btn-secondary inline-flex">
            العودة لبوابة المنصة
          </Link>
        </div>
      </div>
    );
  }

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
    <PublicSubmitShell
      title={form.pageTitle}
      subtitle={form.pageSubtitle}
      introText={form.introText}
    >
      <DynamicSubmitForm
        slug={slug}
        initialDepartments={departments}
        initialRequestTypes={requestTypes}
        settings={form}
        pinnedDepartmentId={form.departmentId}
        pinnedRequestTypeId={form.requestTypeId}
      />
    </PublicSubmitShell>
  );
}
