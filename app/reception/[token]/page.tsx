"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";

interface VisitRow {
  id: string;
  title: string;
  visitDate: string | null;
  visitAttended: boolean | null;
  contactPhone: string;
  requestType?: { name: string };
}

export default function ReceptionPage() {
  const params = useParams();
  const token = params.token as string;

  const [departmentName, setDepartmentName] = useState("");
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reception/${token}`);
      const payload = await parseApiResponse<{
        department: { name: string };
        requests: VisitRow[];
      }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "رمز غير صالح"));
      }
      setDepartmentName(payload.data.department.name);
      setVisits(payload.data.requests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleAttendance(requestId: string, attended: boolean) {
    setBusyId(requestId);
    try {
      const res = await fetch(`/api/reception/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, attended }),
      });
      const payload = await parseApiResponse<unknown>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل التحديث"));
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-shell min-h-screen">
      <header className="border-b border-surface-border bg-surface px-4 py-4 text-center">
        <p className="text-xs text-brand-gray">استقبال — {departmentName}</p>
        <h1 className="text-lg font-bold text-primary">زيارات اليوم والقادمة</h1>
      </header>

      <main className="page-container space-y-4 py-6">
        {error && (
          <p className="text-sm text-[var(--zaad-danger)]" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <div className="card py-12 text-center text-sm text-brand-gray">
            جاري التحميل...
          </div>
        ) : visits.length === 0 ? (
          <div className="card py-12 text-center text-sm text-brand-gray">
            لا توجد زيارات مجدولة
          </div>
        ) : (
          visits.map((visit) => (
            <div key={visit.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-primary">{visit.title}</h2>
                <p className="text-xs text-brand-gray">
                  {visit.requestType?.name} —{" "}
                  <span dir="ltr">
                    {visit.visitDate
                      ? new Date(visit.visitDate).toLocaleString("ar-SA")
                      : "—"}
                  </span>
                </p>
                <p className="text-xs" dir="ltr">
                  {visit.contactPhone}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary text-sm"
                  disabled={busyId === visit.id}
                  onClick={() => void toggleAttendance(visit.id, true)}
                >
                  حضر
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  disabled={busyId === visit.id}
                  onClick={() => void toggleAttendance(visit.id, false)}
                >
                  لم يحضر
                </button>
              </div>
              {visit.visitAttended !== null && (
                <span className={visit.visitAttended ? "badge-success" : "badge-danger"}>
                  {visit.visitAttended ? "حضر" : "لم يحضر"}
                </span>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
