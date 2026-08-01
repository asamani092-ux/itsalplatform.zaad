"use client";

import { usePathname } from "next/navigation";
import { getModuleTitle } from "@/lib/modules/registry";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function DashboardHeader() {
  const pathname = usePathname();
  const title = getModuleTitle(pathname);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-surface-border bg-surface px-6 py-4">
      <div>
        <p className="text-[11px] text-brand-gray">منصة الاتصال المؤسسي</p>
        <h1 className="text-lg font-bold text-primary">{title}</h1>
      </div>
      <NotificationBell />
    </header>
  );
}
