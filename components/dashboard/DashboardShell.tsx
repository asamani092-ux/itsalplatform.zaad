"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { PlatformModuleState } from "@/lib/modules/registry";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

export default function DashboardShell({
  modules,
  children,
}: {
  modules: PlatformModuleState[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div
      className="zad-shell"
      data-sidebar-collapsed={collapsed ? "true" : "false"}
    >
      {mobileOpen && (
        <div
          className="zad-drawer-overlay lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <DashboardSidebar
        modules={modules}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="zad-shell__main">
        <DashboardHeader onOpenNav={() => setMobileOpen(true)} />
        <main className="zad-shell__content">{children}</main>
      </div>
    </div>
  );
}
