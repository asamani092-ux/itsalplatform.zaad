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

function ModuleIcon({ paths }: { paths: readonly string[] }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className="shrink-0"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
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
    router.push("/");
    router.refresh();
  }

  function isActive(href: string): boolean {
    const base = href.split("?")[0];
    if (base === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(base);
  }

  return (
    <aside className="sticky top-0 z-40 border-b border-surface-border bg-surface lg:fixed lg:inset-y-0 lg:end-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-s">
      <div className="flex items-center justify-between gap-3 border-b border-surface-border p-4 lg:block">
        <div>
          <BrandLogo size="sm" />
          <p className="mt-2 hidden text-xs text-brand-gray lg:block">الاتصال المؤسسي</p>
        </div>
        <button
          type="button"
          className="zad-touch btn-secondary text-sm lg:hidden"
          onClick={() => void handleLogout()}
        >
          خروج
        </button>
      </div>

      <nav
        className="flex gap-2 overflow-x-auto p-3 lg:flex-1 lg:flex-col lg:gap-4 lg:overflow-y-auto"
        aria-label="وحدات المنصة"
      >
        {CATEGORY_ORDER.map((category) => {
          const items = modules.filter((m) => m.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category} className="flex shrink-0 gap-2 lg:block lg:space-y-1">
              <p className="hidden px-3 text-[10px] font-bold uppercase text-brand-gray lg:block">
                {CATEGORY_LABELS[category]}
              </p>
              {items.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`zad-touch inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive(item.href)
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-brand-gray hover:bg-surface-muted"
                  }`}
                >
                  <ModuleIcon paths={MODULE_ICON_PATHS[item.icon]} />
                  <span className="min-w-0 whitespace-nowrap lg:truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="hidden border-t border-surface-border p-3 lg:block">
        <button
          type="button"
          className="zad-touch w-full bg-transparent px-3 py-2 text-sm text-[var(--zaad-danger)] transition-colors hover:bg-surface-muted"
          onClick={() => void handleLogout()}
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
