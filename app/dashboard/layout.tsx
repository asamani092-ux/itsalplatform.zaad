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

  const visibleModules =
    session?.role === "RECEPTION"
      ? modules.filter((m) => m.key === "reception")
      : modules;

  return (
    <div dir="rtl">
      <DashboardShell modules={visibleModules}>{children}</DashboardShell>
    </div>
  );
}
