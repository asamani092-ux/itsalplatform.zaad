"use client";

import { usePathname } from "next/navigation";
import { getDashboardPageTitle } from "@/components/dashboard/nav-config";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function DashboardHeader() {
  const pathname = usePathname();
  const title = getDashboardPageTitle(pathname);

  return (
    <header className="flex items-center justify-between gap-4 border-b border-surface-border bg-surface px-6 py-4">
      <h1 className="text-lg font-bold text-primary">{title}</h1>
      <NotificationBell />
    </header>
  );
}
