import DashboardShell from "@/components/dashboard/DashboardShell";
import { getEnabledModules } from "@/lib/modules/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const modules = await getEnabledModules();

  return (
    <div dir="rtl">
      <DashboardShell modules={modules}>{children}</DashboardShell>
    </div>
  );
}
