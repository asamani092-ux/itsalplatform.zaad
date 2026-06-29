import DynamicSubmitForm from "@/components/public/DynamicSubmitForm";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function SubmitSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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
    <div className="page-shell min-h-screen">
      <header className="border-b border-surface-border bg-surface px-4 py-4">
        <Link href="/" className="text-xs text-brand-gray underline">
          ← الرئيسية
        </Link>
        <h1 className="mt-2 text-lg font-bold text-primary">تقديم طلب</h1>
      </header>
      <main className="page-container-narrow py-8">
        <DynamicSubmitForm
          slug={slug}
          initialDepartments={departments}
          initialRequestTypes={requestTypes}
        />
      </main>
    </div>
  );
}
