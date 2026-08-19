"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";
import Skeleton from "@/components/ui/skeleton";

const ROOMS = ["قاعة الاجتماعات الكبرى", "قاعة التدريب", "قاعة الاستقبال", "قاعة الوسائط"];

interface BusySlot {
  startTime: string;
  endTime: string;
  requesterName?: string;
}

const gregoryLabel = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const hijriLabel = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
  day: "numeric",
  month: "short",
});

function parseLocalISODate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function RoomAvailabilityCalendar({
  room: controlledRoom,
  date: controlledDate,
  onRoomChange,
  onDateChange,
  className = "",
}: {
  room?: string;
  date?: string;
  onRoomChange?: (room: string) => void;
  onDateChange?: (date: string) => void;
  className?: string;
}) {
  const [room, setRoom] = useState(controlledRoom ?? ROOMS[0]);
  const [date, setDate] = useState(controlledDate ?? "");
  const [slots, setSlots] = useState<BusySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (controlledRoom !== undefined) setRoom(controlledRoom);
  }, [controlledRoom]);

  useEffect(() => {
    if (controlledDate !== undefined) setDate(controlledDate);
  }, [controlledDate]);

  const load = useCallback(async () => {
    if (!room || !date) {
      setSlots([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ room, date });
      const res = await fetchWithTimeout(
        `/api/public/hospitality/availability?${params}`,
      );
      const payload = await parseApiResponse<{ slots: BusySlot[] }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل التوفر"));
      }
      setSlots(payload.data.slots);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [room, date]);

  useEffect(() => {
    void load();
  }, [load]);

  const parsed = date ? parseLocalISODate(date) : null;

  return (
    <div className={`card space-y-3 p-4 ${className}`}>
      <div>
        <h3 className="text-sm font-bold text-primary">توفر القاعة</h3>
        <p className="text-xs text-brand-gray">
          اختر القاعة والتاريخ لعرض الأوقات المحجوزة
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="label-field" htmlFor="availability-room">
            القاعة
          </label>
          <select
            id="availability-room"
            className="input-field w-full"
            value={room}
            onChange={(e) => {
              setRoom(e.target.value);
              onRoomChange?.(e.target.value);
            }}
          >
            {ROOMS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="label-field" htmlFor="availability-date">
            التاريخ
          </label>
          <input
            id="availability-date"
            type="date"
            className="input-field w-full"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              onDateChange?.(e.target.value);
            }}
          />
        </div>
      </div>

      {parsed && (
        <p className="text-xs text-brand-gray">
          <span>{gregoryLabel.format(parsed)}</span>
          <span className="mx-1">·</span>
          <span>{hijriLabel.format(parsed)}</span>
        </p>
      )}

      {error && (
        <p className="text-sm text-[var(--zaad-danger)]" role="alert">
          {error}
        </p>
      )}

      {!date ? (
        <p className="text-sm text-brand-gray">اختر تاريخاً لعرض الأوقات المشغولة</p>
      ) : loading ? (
        <Skeleton lines={3} />
      ) : slots.length === 0 ? (
        <p className="text-sm text-brand-gray">
          لا توجد حجوزات في هذا اليوم — القاعة متاحة
        </p>
      ) : (
        <ul className="space-y-2" aria-label="الأوقات المحجوزة">
          {slots.map((slot, i) => (
            <li
              key={`${slot.startTime}-${slot.endTime}-${i}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--zaad-primary)_15%,transparent)] px-3 py-2"
            >
              <span className="text-sm font-semibold text-primary" dir="ltr">
                {slot.startTime} — {slot.endTime}
              </span>
              <span className="badge-warning text-[0.65rem]">مشغول</span>
              {slot.requesterName && (
                <span className="w-full text-xs text-brand-gray sm:w-auto">
                  {slot.requesterName}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
