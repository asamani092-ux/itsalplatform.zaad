"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";

interface DeskVisit {
  id: string;
  title: string;
  visitDate: string | null;
  visitAttended: boolean | null;
  contactPhone: string;
  contactEmail: string;
  department?: { name: string };
  requestType?: { name: string };
}

function formatVisitTime(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function ReceptionDesk() {
  const [visits, setVisits] = useState<DeskVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reception/desk");
      const payload = await parseApiResponse<{ requests: DeskVisit[] }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل الزيارات"));
      }
      setVisits(payload.data.requests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleAttendance(requestId: string, attended: boolean) {
    setBusyId(requestId);
    setError("");
    try {
      const res = await fetch("/api/reception/desk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, attended }),
      });
      const payload = await parseApiResponse<unknown>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل تحديث الحضور"));
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusyId(null);
    }
  }

  const pending = visits.filter((v) => !v.visitAttended).length;
  const attended = visits.length - pending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary">مكتب الاستقبال المركزي</h2>
          <p className="mt-1 text-sm text-brand-gray">
            زيارات جميع الأقسام — تسجيل الحضور من حساب موظف الاستقبال
          </p>
        </div>
        <button type="button" className="btn-secondary text-sm" onClick={() => void load()}>
          تحديث
        </button>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-brand-gray">
        <span>
          الإجمالي: <strong className="text-primary">{visits.length}</strong>
        </span>
        <span>
          بانتظار: <strong className="text-primary">{pending}</strong>
        </span>
        <span>
          حضر: <strong className="text-primary">{attended}</strong>
        </span>
      </div>

      {error && (
        <p className="text-sm text-[var(--zaad-danger)]" role="alert">
          {error}
        </p>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="tmkeen-table">
          <thead>
            <tr>
              <th>الموعد</th>
              <th>الزيارة</th>
              <th>القسم</th>
              <th>النوع</th>
              <th>التواصل</th>
              <th>الحضور</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-brand-gray">
                  جاري التحميل…
                </td>
              </tr>
            ) : visits.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-brand-gray">
                  لا توجد زيارات قادمة
                </td>
              </tr>
            ) : (
              visits.map((v) => (
                <tr key={v.id}>
                  <td className="whitespace-nowrap text-xs">{formatVisitTime(v.visitDate)}</td>
                  <td className="font-semibold">{v.title}</td>
                  <td>{v.department?.name ?? "—"}</td>
                  <td>{v.requestType?.name ?? "—"}</td>
                  <td dir="ltr" className="text-xs">
                    {v.contactPhone}
                    <br />
                    {v.contactEmail}
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={v.visitAttended ? "badge-success" : "badge-warning"}>
                        {v.visitAttended ? "حاضر" : "بانتظار"}
                      </span>
                      <button
                        type="button"
                        className="btn-primary text-xs"
                        disabled={busyId === v.id}
                        onClick={() => void toggleAttendance(v.id, !v.visitAttended)}
                      >
                        {busyId === v.id
                          ? "…"
                          : v.visitAttended
                            ? "إلغاء الحضور"
                            : "تسجيل حضور"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
