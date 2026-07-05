"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DASHBOARD_NAV } from "@/components/dashboard/nav-config";

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 right-0 flex w-64 flex-col border-l border-surface-border bg-surface">
      <div className="border-b border-surface-border p-4">
        <p className="text-xs text-brand-gray">جمعية الزاد</p>
        <p className="font-bold text-primary">مركز التحكم</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {DASHBOARD_NAV.map((item) => {
          const active =
            "exact" in item && item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-brand-gray hover:bg-surface-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-surface-border p-3">
        <button
          type="button"
          className="w-full bg-transparent px-3 py-2 text-sm text-[var(--zaad-danger)] transition-colors hover:bg-surface-muted"
          onClick={() => void handleLogout()}
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
