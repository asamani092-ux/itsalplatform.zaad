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
    <div dir="rtl" className="min-h-[100dvh] bg-surface-muted">
      <DashboardSidebar modules={modules} />
      <div className="flex min-h-[100dvh] flex-col lg:me-64">
        <DashboardHeader />
        <main className="flex-1 overflow-x-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
