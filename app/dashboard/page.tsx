"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { formatDurationMs } from "@/components/shared/format-sla";
import Progress from "@/components/ui/progress";
import Skeleton from "@/components/ui/skeleton";

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

function KpiCard({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const trendLabel =
    trend === "up" ? "↑ تحسّن" : trend === "down" ? "↓ يحتاج متابعة" : "→ مستقر";

  return (
    <div className="zad-kpi">
      <p className="zad-kpi__label">{label}</p>
      <p className="zad-kpi__value">{value}</p>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {hint && <span className="text-brand-gray">{hint}</span>}
        {trend && (
          <span
            className={
              trend === "up"
                ? "badge-success"
                : trend === "down"
                  ? "badge-danger"
                  : "badge-primary"
            }
          >
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardKpiPage() {
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

  const inProgress =
    kpis?.statusCounts.find((s) => s.status === "In_Progress")?.count ?? 0;
  const pending =
    kpis?.statusCounts.find((s) => s.status === "Pending_Manager")?.count ?? 0;
  const completionTrend: "up" | "down" | "neutral" =
    kpis && kpis.completionRate >= 0.5
      ? "up"
      : kpis && kpis.completionRate > 0
        ? "neutral"
        : "down";

  return (
    <div className="space-y-6">
      <p className="text-sm text-brand-gray">نظرة عامة على أداء قسم الاتصال</p>

      {error && (
        <p className="text-sm text-[var(--tmkeen-danger)]" role="alert">
          {error}
        </p>
      )}

      {loading || !kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="zad-kpi">
              <Skeleton lines={3} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="إجمالي الطلبات"
              value={kpis.totalRequests}
              hint="منذ بداية التسجيل"
              trend="neutral"
            />
            <KpiCard
              label="نسبة الإكمال"
              value={`${Math.round(kpis.completionRate * 100)}%`}
              hint={`${pending} بانتظار موافقة`}
              trend={completionTrend}
            />
            <KpiCard
              label="أكثر قسم نشاطاً"
              value={kpis.byDepartment[0]?.departmentName ?? "—"}
              hint={`${kpis.byDepartment[0]?.count ?? 0} طلب`}
              trend="neutral"
            />
            <KpiCard
              label="قيد التنفيذ"
              value={inProgress}
              hint="يتطلب متابعة"
              trend={inProgress > 5 ? "down" : "up"}
            />
          </div>

          <div className="card space-y-3">
            <Progress
              value={Math.round(kpis.completionRate * 100)}
              label="نسبة إنجاز الطلبات"
            />
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="tmkeen-table">
              <thead>
                <tr>
                  <th scope="col">نوع الطلب</th>
                  <th scope="col">العدد</th>
                  <th scope="col">متوسط SLA</th>
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
    </div>
  );
}
