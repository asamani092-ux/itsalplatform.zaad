import DashboardShell from "@/components/dashboard/DashboardShell";
import { getRouteSession } from "@/lib/auth/route-guard";
import { getEnabledModules } from "@/lib/modules/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [modules, session] = await Promise.all([
    getEnabledModules(),
    getRouteSession(),
  ]);

  // Desk-only employees (reception section) see just the reception module.
  // Grants management is a director-only tool, so hide it from section managers.
  const deskOnly =
    session?.role === "EMPLOYEE" && session?.deskAccess === true;
  const visibleModules = deskOnly
    ? modules.filter((m) => m.key === "reception")
    : modules.filter((m) => m.key !== "grants" || session?.role === "DIRECTOR");

  return (
    <div dir="rtl">
      <DashboardShell modules={visibleModules}>{children}</DashboardShell>
    </div>
  );
}
