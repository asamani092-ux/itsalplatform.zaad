"use client";

import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { IconX } from "@/components/shared/icons";

export default function SlideOver({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <div className="zad-drawer-overlay" onClick={onClose} aria-hidden />
      <aside
        className="zad-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-over-title"
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2 id="slide-over-title" className="text-lg font-bold text-primary">
            {title}
          </h2>
          <IconButton label="إغلاق" icon={<IconX size={18} />} onClick={onClose} />
        </div>
        {children}
      </aside>
    </>
  );
}
