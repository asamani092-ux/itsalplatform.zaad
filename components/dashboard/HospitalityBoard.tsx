"use client";

// Calendar render O(D+B): build day cells then bucket bookings by date.
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { timesOverlap } from "@/lib/hospitality/conflict";
import { IconButton } from "@/components/ui/icon-button";
import { IconChevron, IconPlus, IconX } from "@/components/shared/icons";
import EmptyState from "@/components/shared/empty-state";
import Skeleton from "@/components/ui/skeleton";

interface Booking {
  id: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  roomName: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
  notes: string;
  requestId?: string | null;
  request?: {
    id: string;
    status: string;
    assignedEmployee?: { name: string } | null;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  Pending_Manager: "بانتظار موافقة المدير",
  Approved_Pending_Assignment: "معتمد — بانتظار الإسناد",
  In_Progress: "قيد التنفيذ",
  Completed: "مكتمل",
  Archived: "مؤرشف",
};

const ROOMS = ["قاعة الاجتماعات الكبرى", "قاعة التدريب", "قاعة الاستقبال", "قاعة الوسائط"];

const WEEKDAY_SHORT = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];
const WEEKDAY_FULL = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const gregoryDayFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { day: "numeric" });
const islamicDayFmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
  day: "numeric",
});
const gregoryMonthFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
  month: "long",
  year: "numeric",
});
const islamicMonthFmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
  month: "long",
  year: "numeric",
});
const dualDateFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const dualHijriFmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function hasConflict(booking: Booking, all: Booking[]): boolean {
  return all.some(
    (other) =>
      other.id !== booking.id &&
      other.roomName === booking.roomName &&
      toLocalISODate(new Date(other.meetingDate)) ===
        toLocalISODate(new Date(booking.meetingDate)) &&
      timesOverlap(booking.startTime, booking.endTime, other.startTime, other.endTime),
  );
}

interface CalendarDay {
  key: string;
  date: Date;
  inMonth: boolean;
  isToday: boolean;
}

function buildMonthGrid(viewMonth: Date): CalendarDay[] {
  const first = startOfMonth(viewMonth);
  const startOffset = first.getDay(); // Sunday = 0
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - startOffset);
  const todayKey = toLocalISODate(new Date());
  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const key = toLocalISODate(date);
    days.push({
      key,
      date,
      inMonth: date.getMonth() === viewMonth.getMonth(),
      isToday: key === todayKey,
    });
  }
  return days;
}

export default function HospitalityBoard() {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(() => toLocalISODate(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    roomName: ROOMS[0],
    meetingDate: "",
    startTime: "09:00",
    endTime: "10:00",
    notes: "",
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
    attendeesCount: 2,
  });

  const calendarDays = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const rangeFrom = calendarDays[0]?.key ?? toLocalISODate(viewMonth);
  const rangeTo = calendarDays[calendarDays.length - 1]?.key ?? toLocalISODate(viewMonth);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ from: rangeFrom, to: rangeTo });
      const res = await fetch(`/api/hospitality/bookings?${params}`);
      const payload = await parseApiResponse<{ bookings: Booking[] }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل الحجوزات"));
      }
      setBookings(payload.data.bookings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of bookings) {
      const key = toLocalISODate(new Date(booking.meetingDate));
      const list = map.get(key) ?? [];
      list.push(booking);
      map.set(key, list);
    }
    return map;
  }, [bookings]);

  const selectedBookings = useMemo(() => {
    if (!selectedDay) return [];
    return bookingsByDay.get(selectedDay) ?? [];
  }, [bookingsByDay, selectedDay]);

  function openCreate(day?: string) {
    setFormError("");
    setForm((prev) => ({
      ...prev,
      meetingDate: day ?? selectedDay ?? toLocalISODate(new Date()),
    }));
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/hospitality/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await parseApiResponse<Booking>(res);
      if (!res.ok || !payload.success) {
        setFormError(getApiErrorMessage(payload, "فشل إنشاء الحجز"));
        return;
      }
      setModalOpen(false);
      if (form.meetingDate) setSelectedDay(form.meetingDate);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  const monthLabelG = gregoryMonthFmt.format(viewMonth);
  const monthLabelH = islamicMonthFmt.format(viewMonth);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-gray">
          كل حجز يُنشئ مهمة في لوحة العمل ويتبع نفس مسار الموافقة والإسناد
        </p>
        <button
          type="button"
          className="btn-primary text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
          onClick={() => openCreate()}
        >
          <IconPlus size={18} />
          حجز جديد
        </button>
      </div>

      {error && (
        <p className="text-sm text-[var(--zaad-danger)]" role="alert">
          {error}
        </p>
      )}

      <div className="card overflow-hidden p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <IconButton
              label="الشهر السابق"
              icon={<IconChevron size={18} />}
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
            />
            <IconButton
              label="الشهر التالي"
              icon={<IconChevron size={18} className="rotate-180" />}
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
            />
            <button
              type="button"
              className="btn-secondary text-xs sm:text-sm"
              onClick={() => {
                const now = startOfMonth(new Date());
                setViewMonth(now);
                setSelectedDay(toLocalISODate(new Date()));
              }}
            >
              اليوم
            </button>
          </div>
          <div className="text-end">
            <p className="text-sm font-bold text-primary sm:text-base">{monthLabelG}</p>
            <p className="text-xs text-brand-gray sm:text-sm">{monthLabelH}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-2">
            <Skeleton lines={6} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[36rem] sm:min-w-0">
              <div className="mb-1 grid grid-cols-7 gap-px">
                {WEEKDAY_SHORT.map((label, i) => (
                  <div
                    key={label}
                    className="px-1 py-1 text-center text-[0.65rem] font-semibold text-brand-gray sm:text-xs"
                  >
                    <span className="sm:hidden">{label}</span>
                    <span className="hidden sm:inline">{WEEKDAY_FULL[i]}</span>
                  </div>
                ))}
              </div>
              <div
                className="grid grid-cols-7 gap-px rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--zaad-primary)_12%,transparent)]"
                role="grid"
                aria-label="تقويم الحجوزات"
              >
                {calendarDays.map((day) => {
                  const dayBookings = bookingsByDay.get(day.key) ?? [];
                  const count = dayBookings.length;
                  const selected = selectedDay === day.key;
                  const conflictDay = dayBookings.some((b) => hasConflict(b, bookings));
                  return (
                    <button
                      key={day.key}
                      type="button"
                      role="gridcell"
                      aria-selected={selected}
                      onClick={() => setSelectedDay(day.key)}
                      className={`min-h-[4.5rem] space-y-1 p-1.5 text-start transition-colors sm:min-h-[5.5rem] sm:p-2 ${
                        day.inMonth
                          ? "bg-[var(--zaad-surface)]"
                          : "bg-[color-mix(in_srgb,var(--zaad-primary)_4%,transparent)] opacity-60"
                      } ${
                        selected
                          ? "ring-2 ring-inset ring-[var(--zaad-primary)]"
                          : "hover:bg-[color-mix(in_srgb,var(--zaad-primary)_8%,transparent)]"
                      } ${day.isToday ? "font-bold" : ""}`}
                    >
                      <div className="flex items-baseline justify-between gap-1">
                        <span
                          className={`text-sm ${
                            day.isToday ? "text-primary" : "text-brand-gray"
                          }`}
                        >
                          {gregoryDayFmt.format(day.date)}
                        </span>
                        <span className="hidden text-[0.65rem] text-brand-gray sm:inline">
                          {islamicDayFmt.format(day.date)}
                        </span>
                      </div>
                      {count > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span
                            className={
                              conflictDay ? "badge-danger text-[0.65rem]" : "badge-primary text-[0.65rem]"
                            }
                          >
                            {count}
                          </span>
                          <span className="hidden truncate text-[0.65rem] text-brand-gray sm:inline">
                            {dayBookings[0]?.roomName}
                            {count > 1 ? ` +${count - 1}` : ""}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="card space-y-4 p-4 sm:p-5">
        {selectedDay ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-primary">
                  {dualDateFmt.format(parseLocalISODate(selectedDay))}
                </h2>
                <p className="text-xs text-brand-gray sm:text-sm">
                  {dualHijriFmt.format(parseLocalISODate(selectedDay))}
                </p>
              </div>
              <button
                type="button"
                className="btn-primary text-sm"
                onClick={() => openCreate(selectedDay)}
              >
                <IconPlus size={16} />
                حجز لهذا اليوم
              </button>
            </div>

            {selectedBookings.length === 0 ? (
              <EmptyState
                title="لا حجوزات في هذا اليوم"
                description="أنشئ حجزاً جديداً لهذه القاعة والتاريخ"
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {selectedBookings.map((booking) => {
                  const conflict = hasConflict(booking, bookings);
                  return (
                    <article
                      key={booking.id}
                      className={`card space-y-2 p-4 ${
                        conflict ? "border-[var(--zaad-danger)]" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-primary">{booking.roomName}</h3>
                        {conflict ? (
                          <span className="badge-danger">تعارض</span>
                        ) : (
                          <span className="badge-success">مؤكد</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-brand-gray" dir="ltr">
                        {booking.startTime} — {booking.endTime}
                      </p>
                      <p className="text-sm text-brand-gray">
                        الغرض: {booking.notes || "—"}
                      </p>
                      <p className="text-sm text-brand-gray">
                        مقدّم الطلب: {booking.requesterName}
                      </p>
                      <p className="text-xs text-brand-gray">
                        الحضور: {booking.attendeesCount}
                      </p>
                      {booking.request && (
                        <p className="text-xs">
                          <span className="badge-primary">
                            {STATUS_LABELS[booking.request.status] ?? booking.request.status}
                          </span>
                          {booking.request.assignedEmployee && (
                            <span className="ms-2 text-brand-gray">
                              المسؤول: {booking.request.assignedEmployee.name}
                            </span>
                          )}
                        </p>
                      )}
                      {conflict && (
                        <p className="text-xs font-semibold text-[var(--zaad-danger)]">
                          يوجد حجز متعارض في نفس القاعة خلال هذا الوقت
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <EmptyState title="اختر يوماً" description="انقر على يوم في التقويم لعرض الحجوزات" />
        )}
      </section>

      {modalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="modal-panel card space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h2 id="booking-modal-title" className="text-lg font-bold text-primary">
                حجز جديد
              </h2>
              <IconButton
                label="إغلاق"
                icon={<IconX size={18} />}
                onClick={() => setModalOpen(false)}
              />
            </div>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void handleSubmit(e)}>
              <div className="space-y-1 sm:col-span-2">
                <label className="label-field" htmlFor="roomName">
                  القاعة
                </label>
                <select
                  id="roomName"
                  className="input-field w-full"
                  value={form.roomName}
                  onChange={(e) => setForm({ ...form, roomName: e.target.value })}
                  required
                >
                  {ROOMS.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="meetingDate">
                  التاريخ
                </label>
                <input
                  id="meetingDate"
                  type="date"
                  className="input-field w-full"
                  value={form.meetingDate}
                  onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="attendeesCount">
                  عدد الحضور
                </label>
                <input
                  id="attendeesCount"
                  type="number"
                  min={1}
                  className="input-field w-full"
                  dir="ltr"
                  value={form.attendeesCount}
                  onChange={(e) =>
                    setForm({ ...form, attendeesCount: Number(e.target.value) || 1 })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="startTime">
                  من
                </label>
                <input
                  id="startTime"
                  type="time"
                  className="input-field w-full"
                  dir="ltr"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="endTime">
                  إلى
                </label>
                <input
                  id="endTime"
                  type="time"
                  className="input-field w-full"
                  dir="ltr"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="label-field" htmlFor="notes">
                  الغرض
                </label>
                <input
                  id="notes"
                  className="input-field w-full"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="requesterName">
                  اسم مقدّم الطلب
                </label>
                <input
                  id="requesterName"
                  className="input-field w-full"
                  value={form.requesterName}
                  onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="requesterPhone">
                  الجوال
                </label>
                <input
                  id="requesterPhone"
                  className="input-field w-full"
                  dir="ltr"
                  value={form.requesterPhone}
                  onChange={(e) => setForm({ ...form, requesterPhone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="label-field" htmlFor="requesterEmail">
                  البريد
                </label>
                <input
                  id="requesterEmail"
                  type="email"
                  className="input-field w-full"
                  dir="ltr"
                  value={form.requesterEmail}
                  onChange={(e) => setForm({ ...form, requesterEmail: e.target.value })}
                  required
                />
              </div>

              {formError && (
                <p className="text-sm text-[var(--zaad-danger)] sm:col-span-2" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setModalOpen(false)}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? "جاري الحفظ..." : "حفظ الحجز"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
