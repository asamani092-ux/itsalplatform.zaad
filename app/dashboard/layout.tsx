import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { getEnabledModules } from "@/lib/modules/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const modules = await getEnabledModules();

  return (
    <div dir="rtl" className="min-h-screen bg-surface-muted">
      <DashboardSidebar modules={modules} />
      <div className="me-64 flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
