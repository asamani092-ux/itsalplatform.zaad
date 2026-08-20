"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";
import Skeleton from "@/components/ui/skeleton";

const FALLBACK_ROOMS = [
  "قاعة الاجتماعات الكبرى",
  "قاعة التدريب",
  "قاعة الاستقبال",
  "قاعة الوسائط",
];

interface CalendarBooking {
  roomName: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
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

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const todayIso = toLocalISODate(new Date());
  const [rooms, setRooms] = useState<string[]>(FALLBACK_ROOMS);
  const [room, setRoom] = useState(controlledRoom ?? "");
  const [date, setDate] = useState(controlledDate ?? "");
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (controlledRoom !== undefined) setRoom(controlledRoom);
  }, [controlledRoom]);

  useEffect(() => {
    if (controlledDate !== undefined) setDate(controlledDate);
  }, [controlledDate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithTimeout("/api/public/hospitality/calendar");
      const payload = await parseApiResponse<{
        rooms: string[];
        bookings: CalendarBooking[];
      }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل الحجوزات"));
      }
      const nextRooms =
        Array.isArray(payload.data.rooms) && payload.data.rooms.length > 0
          ? payload.data.rooms.map(String).filter(Boolean)
          : FALLBACK_ROOMS;
      setRooms(nextRooms);
      setBookings(payload.data.bookings ?? []);
      setRoom((prev) => {
        if (controlledRoom) return controlledRoom;
        if (prev && nextRooms.includes(prev)) return prev;
        return "";
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [controlledRoom]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (b.meetingDate < todayIso) return false;
      if (room && b.roomName !== room) return false;
      if (date && b.meetingDate !== date) return false;
      return true;
    });
  }, [bookings, room, date, todayIso]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const b of visibleBookings) {
      const list = map.get(b.meetingDate) ?? [];
      list.push(b);
      map.set(b.meetingDate, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visibleBookings]);

  return (
    <div className={`card space-y-3 p-4 ${className}`}>
      <div>
        <h3 className="text-sm font-bold text-primary">الحجوزات القادمة</h3>
        <p className="text-xs text-brand-gray">
          عرض مختصر للقاعات والتواريخ والأوقات — بدون بيانات مقدّم الطلب
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
            <option value="">كل القاعات</option>
            {rooms.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="label-field" htmlFor="availability-date">
            التاريخ (اختياري)
          </label>
          <input
            id="availability-date"
            type="date"
            className="input-field w-full"
            min={todayIso}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              onDateChange?.(e.target.value);
            }}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--zaad-danger)]" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <Skeleton lines={3} />
      ) : groupedByDate.length === 0 ? (
        <p className="text-sm text-brand-gray">لا توجد حجوزات قادمة</p>
      ) : (
        <ul className="space-y-3" aria-label="الحجوزات القادمة">
          {groupedByDate.map(([day, dayBookings]) => {
            const parsed = parseLocalISODate(day);
            return (
              <li key={day} className="space-y-1.5">
                <button
                  type="button"
                  className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 text-start text-xs font-semibold text-primary"
                  onClick={() => {
                    setDate(day);
                    onDateChange?.(day);
                  }}
                >
                  {parsed ? (
                    <>
                      <span>{gregoryLabel.format(parsed)}</span>
                      <span className="font-normal text-brand-gray">·</span>
                      <span className="font-normal text-brand-gray">
                        {hijriLabel.format(parsed)}
                      </span>
                    </>
                  ) : (
                    <span dir="ltr">{day}</span>
                  )}
                </button>
                <ul className="space-y-1.5">
                  {dayBookings.map((b, i) => (
                    <li
                      key={`${b.roomName}-${b.startTime}-${b.endTime}-${i}`}
                      className="flex flex-col gap-0.5 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--zaad-primary)_15%,transparent)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                    >
                      <span className="text-xs font-semibold text-primary sm:text-sm">
                        {b.roomName}
                      </span>
                      <span
                        className="text-[0.7rem] text-brand-gray sm:text-xs"
                        dir="ltr"
                      >
                        {b.startTime} — {b.endTime}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
