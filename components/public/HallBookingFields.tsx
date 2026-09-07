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

const DURATION_OPTIONS = [1, 2, 3, 4, 5];

interface Slot {
  startTime: string;
  endTime: string;
}

export interface HallBookingSelection {
  roomName: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
}

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function HallBookingFields({
  onSelect,
  initialRoomName = "",
  initialMeetingDate = "",
  initialDurationHours = 1,
  className = "",
}: {
  onSelect: (selection: HallBookingSelection | null) => void;
  initialRoomName?: string;
  initialMeetingDate?: string;
  initialDurationHours?: number;
  className?: string;
}) {
  const todayIso = toLocalISODate(new Date());
  const [rooms, setRooms] = useState<string[]>(FALLBACK_ROOMS);
  const [roomName, setRoomName] = useState(initialRoomName);
  const [meetingDate, setMeetingDate] = useState(initialMeetingDate || todayIso);
  const [durationHours, setDurationHours] = useState(initialDurationHours);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchWithTimeout("/api/public/hospitality/calendar");
        const payload = await parseApiResponse<{ rooms: string[] }>(res);
        if (!payload.success) return;
        const next =
          Array.isArray(payload.data.rooms) && payload.data.rooms.length > 0
            ? payload.data.rooms.map(String).filter(Boolean)
            : FALLBACK_ROOMS;
        setRooms(next);
        setRoomName((prev) => (prev && next.includes(prev) ? prev : next[0] ?? ""));
      } catch {
        // keep FALLBACK_ROOMS
      }
    })();
  }, []);

  const loadSlots = useCallback(async () => {
    if (!roomName || !meetingDate) {
      setSlots([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        room: roomName,
        date: meetingDate,
        durationHours: String(durationHours),
      });
      const res = await fetchWithTimeout(`/api/public/hospitality/availability?${params}`);
      const payload = await parseApiResponse<{ availableSlots?: Slot[] }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل المواعيد المتاحة"));
      }
      setSlots(payload.data.availableSlots ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [roomName, meetingDate, durationHours]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  // Selection resets whenever the room/date/duration inputs change.
  useEffect(() => {
    setSelectedSlot(null);
    onSelect(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, meetingDate, durationHours]);

  const slotKey = useCallback((s: Slot) => `${s.startTime}-${s.endTime}`, []);

  const selectedKey = useMemo(
    () => (selectedSlot ? slotKey(selectedSlot) : null),
    [selectedSlot, slotKey],
  );

  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot);
    onSelect({
      roomName,
      meetingDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationHours,
    });
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="label-field" htmlFor="hall-room">
            القاعة
          </label>
          <select
            id="hall-room"
            className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          >
            {rooms.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="label-field" htmlFor="hall-date">
            التاريخ
          </label>
          <input
            id="hall-date"
            type="date"
            className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
            min={todayIso}
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="label-field" htmlFor="hall-duration">
            المدة (ساعات)
          </label>
          <select
            id="hall-duration"
            className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
            value={durationHours}
            onChange={(e) => setDurationHours(Number(e.target.value))}
          >
            {DURATION_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? "ساعة" : "ساعات"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-primary">المواعيد المتاحة</p>
        {error && (
          <p className="text-sm text-[var(--zaad-danger)]" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <Skeleton lines={2} />
        ) : slots.length === 0 ? (
          <p className="text-sm text-brand-gray">
            لا توجد مواعيد متاحة لهذه القاعة والمدة في هذا اليوم — جرّب تاريخاً آخر أو مدة أقصر.
          </p>
        ) : (
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
            role="listbox"
            aria-label="المواعيد المتاحة"
          >
            {slots.map((slot) => {
              const isSelected = selectedKey === slotKey(slot);
              return (
                <button
                  key={slotKey(slot)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectSlot(slot)}
                  className={`rounded-lg border p-2.5 text-center text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/20 ${
                    isSelected
                      ? "border-[var(--zaad-primary)] bg-[color-mix(in_srgb,var(--zaad-primary)_12%,transparent)] text-primary"
                      : "border-surface-border text-brand-gray hover:border-[var(--zaad-primary)] hover:text-primary"
                  }`}
                  dir="ltr"
                >
                  {slot.startTime} — {slot.endTime}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
