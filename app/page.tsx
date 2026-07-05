import DynamicSubmitForm from "@/components/public/DynamicSubmitForm";
import PublicSubmitShell from "@/components/public/PublicSubmitShell";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
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
    <PublicSubmitShell>
      <DynamicSubmitForm
        slug="communications"
        initialDepartments={departments}
        initialRequestTypes={requestTypes}
      />
    </PublicSubmitShell>
  );
}
