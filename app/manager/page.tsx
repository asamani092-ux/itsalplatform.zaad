"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { formatDurationMs } from "@/components/shared/format-sla";

interface Kpis {
  totalRequests: number;
  completionRate: number;
  statusCounts: { status: string; count: number }[];
  byDepartment: { departmentName: string; count: number }[];
  byRequestType: {
    requestTypeName: string;
    count: number;
    avgLifecycleMs: number | null;
  }[];
}

export default function ManagerKpiPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manager/kpis");
      const payload = await parseApiResponse<{ kpis: Kpis }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل المؤشرات"));
      }
      setKpis(payload.data.kpis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="page-container space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">لوحة المؤشرات</h1>
        <p className="text-sm text-brand-gray">نظرة عامة على أداء قسم الاتصال</p>
      </div>

      {error && (
        <p className="text-sm text-[var(--zaad-danger)]" role="alert">
          {error}
        </p>
      )}

      {loading || !kpis ? (
        <div className="card py-12 text-center text-sm text-brand-gray">
          جاري التحميل...
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card text-center">
              <p className="text-2xl font-bold text-primary">{kpis.totalRequests}</p>
              <p className="text-sm text-brand-gray">إجمالي الطلبات</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-primary">
                {Math.round(kpis.completionRate * 100)}%
              </p>
              <p className="text-sm text-brand-gray">نسبة الإكمال</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-primary">
                {kpis.byDepartment[0]?.departmentName ?? "—"}
              </p>
              <p className="text-sm text-brand-gray">أكثر قسم نشاطاً</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-primary">
                {kpis.statusCounts.find((s) => s.status === "In_Progress")?.count ?? 0}
              </p>
              <p className="text-sm text-brand-gray">قيد التنفيذ</p>
            </div>
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="zaad-table">
              <thead>
                <tr>
                  <th>نوع الطلب</th>
                  <th>العدد</th>
                  <th>متوسط SLA</th>
                </tr>
              </thead>
              <tbody>
                {kpis.byRequestType.map((row) => (
                  <tr key={row.requestTypeName}>
                    <td>{row.requestTypeName}</td>
                    <td>{row.count}</td>
                    <td>{formatDurationMs(row.avgLifecycleMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
