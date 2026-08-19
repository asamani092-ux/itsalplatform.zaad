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
import { IconButton } from "@/components/ui/icon-button";
import { IconChevron, IconPower, IconX } from "@/components/shared/icons";

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
  collapsed = false,
  mobileOpen = false,
  onToggleCollapse,
  onCloseMobile,
}: {
  modules: PlatformModuleState[];
  collapsed?: boolean;
  mobileOpen?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
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
    <aside
      className="zad-sidebar"
      data-open={mobileOpen ? "true" : "false"}
      aria-label="التنقّل الرئيسي"
    >
      <div className="zad-sidebar__brand">
        <div className="flex min-w-0 items-center gap-2">
          <BrandLogo size="sm" />
          <div className="zad-sidebar__brand-text">
            <p className="text-xs text-brand-gray">جمعية الزاد</p>
            <p className="truncate text-sm font-bold text-primary">الاتصال المؤسسي</p>
          </div>
        </div>
        <IconButton
          label="إغلاق القائمة"
          icon={<IconX size={18} />}
          className="lg:hidden"
          onClick={onCloseMobile}
        />
      </div>

      <nav id="dashboard-sidebar-nav" className="zad-sidebar__nav" aria-label="وحدات المنصة">
        {CATEGORY_ORDER.map((category) => {
          const items = modules.filter((m) => m.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category}>
              <p className="zad-sidebar__group-label">{CATEGORY_LABELS[category]}</p>
              <div className="space-y-1">
                {items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="zad-sidebar__link"
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      onClick={onCloseMobile}
                    >
                      <ModuleIcon paths={MODULE_ICON_PATHS[item.icon]} />
                      <span className="zad-sidebar__link-label">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="zad-sidebar__footer">
        <button
          type="button"
          className="zad-sidebar__collapse zad-sidebar__link w-full"
          aria-expanded={!collapsed}
          aria-controls="dashboard-sidebar-nav"
          onClick={onToggleCollapse}
        >
          <span
            className="inline-flex shrink-0"
            style={{
              transform: collapsed ? "scaleX(-1)" : "scaleX(1)",
            }}
            aria-hidden
          >
            <IconChevron size={18} />
          </span>
          <span className="zad-sidebar__link-label">
            {collapsed ? "توسيع القائمة" : "طي القائمة"}
          </span>
        </button>

        <button
          type="button"
          className="zad-sidebar__link w-full text-[var(--zaad-danger)]"
          title={collapsed ? "تسجيل الخروج" : undefined}
          onClick={() => void handleLogout()}
        >
          <IconPower size={18} />
          <span className="zad-sidebar__link-label">تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
