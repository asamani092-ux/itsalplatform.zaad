"use client";

import { usePathname } from "next/navigation";
import { getModuleTitle } from "@/lib/modules/registry";
import NotificationBell from "@/components/notifications/NotificationBell";
import Breadcrumb from "@/components/ui/breadcrumb";
import BrandLogo from "@/components/shared/brand-logo";
import { IconButton } from "@/components/ui/icon-button";
import { IconMenu } from "@/components/shared/icons";

export default function DashboardHeader({
  onOpenNav,
}: {
  onOpenNav?: () => void;
}) {
  const pathname = usePathname();
  const title = getModuleTitle(pathname);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <IconButton
          label="فتح القائمة"
          icon={<IconMenu size={18} />}
          className="lg:hidden"
          onClick={onOpenNav}
        />
        <BrandLogo size="sm" className="hidden sm:block" />
        <div className="min-w-0 space-y-1">
          <Breadcrumb
            items={[
              { label: "المنصة", href: "/dashboard" },
              { label: title },
            ]}
          />
          <h1 className="truncate text-base font-bold text-primary sm:text-lg">{title}</h1>
        </div>
      </div>
      <NotificationBell />
    </header>
  );
}
