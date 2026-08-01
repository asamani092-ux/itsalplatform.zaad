import ModuleDisabled from "@/components/shared/module-disabled";
import RequestFormsManager from "@/components/dashboard/RequestFormsManager";
import { findModule } from "@/lib/modules/registry";
import { isModuleEnabled } from "@/lib/modules/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RequestFormsPage() {
  const enabled = await isModuleEnabled("request-forms");
  if (!enabled) {
    return <ModuleDisabled label={findModule("request-forms")?.label ?? "نماذج الطلبات"} />;
  }

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
        requiresVisitDate: true,
        departmentId: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <RequestFormsManager departments={departments} requestTypes={requestTypes} />
  );
}
