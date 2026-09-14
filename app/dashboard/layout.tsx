import DashboardShell from "@/components/dashboard/DashboardShell";
import { getRouteSession } from "@/lib/auth/route-guard";
import { getVisibleModulesForViewer } from "@/lib/modules/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getRouteSession();

  let isReceptionDesk = false;
  if (session?.sub) {
    const employee = await prisma.commEmployee.findUnique({
      where: { id: session.sub },
      select: { isReceptionDesk: true },
    });
    isReceptionDesk = employee?.isReceptionDesk === true;
  }

  const visibleModules = session
    ? await getVisibleModulesForViewer({
        role: session.role,
        departmentId: session.departmentId,
        isReceptionDesk,
        deskAccess: session.deskAccess,
      })
    : [];

  return (
    <div dir="rtl">
      <DashboardShell modules={visibleModules}>{children}</DashboardShell>
    </div>
  );
}
