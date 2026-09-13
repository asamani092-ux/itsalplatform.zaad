import ModuleDisabled from "@/components/shared/module-disabled";
import ReceptionDesk from "@/components/dashboard/ReceptionDesk";
import { getRouteSession } from "@/lib/auth/route-guard";
import { findModule } from "@/lib/modules/registry";
import {
  canAccessReception,
  isModuleEnabled,
} from "@/lib/modules/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReceptionDashboardPage() {
  const enabled = await isModuleEnabled("reception");
  if (!enabled) {
    return (
      <ModuleDisabled label={findModule("reception")?.label ?? "شاشة الاستقبال"} />
    );
  }

  const session = await getRouteSession();
  if (!session) redirect("/");

  const employee = await prisma.commEmployee.findUnique({
    where: { id: session.sub },
    select: { isReceptionDesk: true, departmentId: true, role: true },
  });

  const allowed = await canAccessReception({
    role: employee?.role ?? session.role,
    departmentId: employee?.departmentId ?? session.departmentId,
    isReceptionDesk: employee?.isReceptionDesk === true,
    deskAccess: session.deskAccess,
  });
  if (!allowed) redirect("/dashboard");

  return <ReceptionDesk />;
}
