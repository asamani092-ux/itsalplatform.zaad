export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "لوحة KPI", exact: true },
  { href: "/dashboard/kanban", label: "Kanban" },
  { href: "/dashboard/team", label: "الفريق" },
  { href: "/dashboard/settings", label: "الإعدادات" },
] as const;

export function getDashboardPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "لوحة المؤشرات";
  if (pathname.startsWith("/dashboard/kanban")) return "Kanban";
  if (pathname.startsWith("/dashboard/team")) return "إدارة الفريق";
  if (pathname.startsWith("/dashboard/settings/preview")) return "معاينة النموذج";
  if (pathname.startsWith("/dashboard/settings")) return "الإعدادات";
  return "مركز التحكم";
}
