"use client";

import { usePathname } from "next/navigation";
import { getModuleTitle } from "@/lib/modules/registry";
import NotificationBell from "@/components/notifications/NotificationBell";
import Breadcrumb from "@/components/ui/breadcrumb";

export default function DashboardHeader() {
  const pathname = usePathname();
  const title = getModuleTitle(pathname);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
      <div className="min-w-0 space-y-1">
        <Breadcrumb
          items={[
            { label: "المنصة", href: "/dashboard" },
            { label: title },
          ]}
        />
        <h1 className="truncate text-base font-bold text-primary sm:text-lg">{title}</h1>
      </div>
      <NotificationBell />
    </header>
  );
}
