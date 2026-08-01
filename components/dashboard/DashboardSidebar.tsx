"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CATEGORY_LABELS,
  MODULE_ICON_PATHS,
  type ModuleCategory,
  type PlatformModuleState,
} from "@/lib/modules/registry";
import BrandLogo from "@/components/shared/brand-logo";

const CATEGORY_ORDER: ModuleCategory[] = ["operations", "services", "admin"];

function ModuleIcon({ path }: { path: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d={path} />
    </svg>
  );
}

export default function DashboardSidebar({
  modules,
}: {
  modules: PlatformModuleState[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string): boolean {
    const base = href.split("?")[0];
    if (base === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(base);
  }

  return (
    <aside className="fixed inset-y-0 right-0 flex w-64 flex-col border-l border-surface-border bg-surface">
      <div className="border-b border-surface-border p-4">
        <BrandLogo size="sm" />
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {CATEGORY_ORDER.map((category) => {
          const items = modules.filter((m) => m.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase text-brand-gray">
                {CATEGORY_LABELS[category]}
              </p>
              {items.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive(item.href)
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-brand-gray hover:bg-surface-muted"
                  }`}
                >
                  <ModuleIcon path={MODULE_ICON_PATHS[item.icon]} />
                  <span className="min-w-0 truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-surface-border p-3">
        <button
          type="button"
          className="w-full bg-transparent px-3 py-2 text-sm text-[var(--tmkeen-danger)] transition-colors hover:bg-surface-muted"
          onClick={() => void handleLogout()}
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
