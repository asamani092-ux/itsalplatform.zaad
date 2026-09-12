"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import BrandLogo from "@/components/shared/brand-logo";
import NotificationBell from "@/components/notifications/NotificationBell";
import { IconButton } from "@/components/ui/icon-button";
import { IconEdit, IconPower } from "@/components/shared/icons";

export default function EmployeeHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const onProfile = pathname.startsWith("/employee/profile");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border bg-surface px-4 py-3 sm:px-6">
      <Link href="/employee" className="flex items-center gap-3">
        <BrandLogo size="sm" />
        <div>
          <p className="text-xs text-brand-gray">جمعية الزاد</p>
          <h1 className="text-base font-bold text-primary sm:text-lg">مساحة الموظف</h1>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <IconButton
          label="تعديل البيانات"
          icon={<IconEdit size={18} />}
          tone={onProfile ? "primary" : "neutral"}
          onClick={() => router.push("/employee/profile")}
        />
        <IconButton
          label="تسجيل الخروج"
          icon={<IconPower size={18} />}
          tone="danger"
          onClick={() => void handleLogout()}
        />
      </div>
    </header>
  );
}
