"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseApiResponse } from "@/components/lib/api-types";
import { formatRelativeTimeAr } from "@/lib/utils/relative-time";
import { IconBell } from "@/components/shared/icons";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const payload = await parseApiResponse<{
        notifications: NotificationItem[];
        unreadCount: number;
      }>(res);
      if (!res.ok || !payload.success) return;
      setItems(payload.data.notifications.slice(0, 20));
      setUnreadCount(payload.data.unreadCount);
    } catch {
      // Silent — polling should not spam UI
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      void load();
    }, 30_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function markAllRead() {
    setLoading(true);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "PATCH" });
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function openNotification(item: NotificationItem) {
    if (!item.readAt) {
      await fetch(`/api/notifications/${item.id}/read`, { method: "PATCH" });
    }
    setOpen(false);
    await load();
    if (item.link) router.push(item.link);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="relative rounded-lg p-2 text-primary hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary/20"
        aria-label="الإشعارات"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <IconBell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--zaad-danger)] px-1 text-[10px] font-bold text-[var(--action-primary-text)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="card absolute end-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] space-y-2 p-3 shadow-md">
          <div className="flex items-center justify-between gap-2 border-b border-surface-border pb-2">
            <p className="text-sm font-bold text-primary">الإشعارات</p>
            <button
              type="button"
              className="text-xs font-semibold text-primary underline disabled:opacity-50"
              disabled={loading || unreadCount === 0}
              onClick={() => void markAllRead()}
            >
              تحديد الكل كمقروء
            </button>
          </div>

          {items.length === 0 ? (
            <div className="py-8 text-center text-sm text-brand-gray">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-primary">
                ✓
              </div>
              لا توجد إشعارات
            </div>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full gap-2 rounded-lg px-2 py-2 text-start hover:bg-surface-muted"
                    onClick={() => void openNotification(item)}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        item.readAt ? "bg-brand-gray/40" : "bg-primary"
                      }`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-primary">
                        {item.title}
                      </span>
                      <span className="line-clamp-2 block text-xs text-brand-gray">
                        {item.body}
                      </span>
                      <span className="mt-1 block text-[10px] text-brand-gray">
                        {formatRelativeTimeAr(item.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
