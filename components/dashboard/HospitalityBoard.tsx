"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { timesOverlap } from "@/lib/hospitality/conflict";

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
}

const ROOMS = ["قاعة الاجتماعات الكبرى", "قاعة التدريب", "قاعة الاستقبال", "قاعة الوسائط"];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(iso));
}

function hasConflict(booking: Booking, all: Booking[]): boolean {
  return all.some(
    (other) =>
      other.id !== booking.id &&
      other.roomName === booking.roomName &&
      new Date(other.meetingDate).toDateString() ===
        new Date(booking.meetingDate).toDateString() &&
      timesOverlap(booking.startTime, booking.endTime, other.startTime, other.endTime),
  );
}

export default function HospitalityBoard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hospitality/bookings");
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of bookings) {
      const key = new Date(booking.meetingDate).toISOString().slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(booking);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [bookings]);

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
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-gray">إدارة حجوزات القاعات والاجتماعات</p>
        <button
          type="button"
          className="btn-primary text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
          onClick={() => {
            setFormError("");
            setModalOpen(true);
          }}
        >
          حجز جديد
        </button>
      </div>

      {error && (
        <p className="text-sm text-[var(--tmkeen-danger)]" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="card py-12 text-center text-sm text-brand-gray">جاري التحميل...</div>
      ) : bookings.length === 0 ? (
        <div className="card py-12 text-center text-sm text-brand-gray">لا توجد حجوزات بعد</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, dayBookings]) => (
            <section key={day} className="space-y-3">
              <h2 className="text-sm font-bold text-primary">{formatDate(day)}</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {dayBookings.map((booking) => {
                  const conflict = hasConflict(booking, bookings);
                  return (
                    <article
                      key={booking.id}
                      className={`card space-y-2 p-4 ${
                        conflict ? "border-[var(--tmkeen-danger)]" : ""
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
                      {conflict && (
                        <p className="text-xs font-semibold text-[var(--tmkeen-danger)]">
                          يوجد حجز متعارض في نفس القاعة خلال هذا الوقت
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

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
            <h2 id="booking-modal-title" className="text-lg font-bold text-primary">
              حجز جديد
            </h2>
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
                <p className="text-sm text-[var(--tmkeen-danger)] sm:col-span-2" role="alert">
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
