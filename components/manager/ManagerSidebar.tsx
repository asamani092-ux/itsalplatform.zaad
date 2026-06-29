"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/manager", label: "لوحة KPI" },
  { href: "/manager/kanban", label: "Kanban" },
  { href: "/manager/team", label: "الفريق" },
  { href: "/manager/settings", label: "الإعدادات" },
  { href: "/manager/settings/preview", label: "معاينة النموذج" },
] as const;

export default function ManagerSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-full flex-col gap-1 border-b border-surface-border bg-surface p-4 lg:min-h-screen lg:w-56 lg:border-b-0 lg:border-l">
      <div className="mb-4">
        <p className="text-xs text-brand-gray">جمعية الزاد</p>
        <p className="font-bold text-primary">مركز التحكم</p>
      </div>
      <nav className="flex flex-wrap gap-2 lg:flex-col">
        {NAV.map((item) => {
          const active =
            item.href === "/manager"
              ? pathname === "/manager"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-primary text-white"
                  : "text-primary hover:bg-surface-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-4">
        <button
          type="button"
          className="btn-secondary w-full text-sm"
          onClick={() => void handleLogout()}
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
