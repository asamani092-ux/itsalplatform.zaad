"use client";

import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { IconX } from "@/components/shared/icons";

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-panel card space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h3 id="confirm-dialog-title" className="text-lg font-bold text-primary">
            {title}
          </h3>
          <IconButton label="إغلاق" icon={<IconX size={18} />} onClick={onCancel} />
        </div>
        {body && <div className="text-sm text-brand-gray">{body}</div>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={
              destructive
                ? "btn-secondary flex-1 border-[var(--zaad-danger)] text-[var(--zaad-danger)]"
                : "btn-primary flex-1"
            }
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "جاري التنفيذ..." : confirmLabel}
          </button>
          <button
            type="button"
            className="btn-secondary flex-1"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
