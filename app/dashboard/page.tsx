"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { formatDurationMs } from "@/components/shared/format-sla";
import Progress from "@/components/ui/progress";
import Skeleton from "@/components/ui/skeleton";

interface Kpis {
  totalRequests: number;
  completionRate: number;
  pendingManager: number;
  pendingAssignment: number;
  inProgress: number;
  completed: number;
  completedThisWeek: number;
  overdueOpen: number;
  upcomingBookings: number;
  visitsToday: number;
  avgLifecycleMs: number | null;
  avgAssignmentMs: number | null;
  statusCounts: { status: string; count: number }[];
  byDepartment: { departmentName: string; count: number }[];
  byRequestType: {
    requestTypeName: string;
    count: number;
    avgLifecycleMs: number | null;
  }[];
  overdueByDepartment: { departmentName: string; count: number }[];
  overdueList: {
    id: string;
    title: string;
    status: string;
    requiredDate: string;
    departmentName: string;
  }[];
}

interface DepartmentOption {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<string, string> = {
  Pending_Manager: "بانتظار المدير",
  Approved_Pending_Assignment: "جديد",
  In_Progress: "قيد التنفيذ",
  Completed: "مكتمل",
  Archived: "مؤرشف",
};

function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <div className="zad-kpi">
      <p className="zad-kpi__label">{label}</p>
      <p className="zad-kpi__value">{value}</p>
      {hint && (
        <span
          className={
            tone === "good"
              ? "badge-success"
              : tone === "warn"
                ? "badge-warning"
                : tone === "bad"
                  ? "badge-danger"
                  : "text-xs text-brand-gray"
          }
        >
          {hint}
        </span>
      )}
    </div>
  );
}

export default function DashboardKpiPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentId, setDepartmentId] = useState("");

  const load = useCallback(async (deptId: string) => {
    setLoading(true);
    try {
      const url = deptId
        ? `/api/manager/kpis?departmentId=${encodeURIComponent(deptId)}`
        : "/api/manager/kpis";
      const res = await fetch(url);
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
    void load(departmentId);
  }, [load, departmentId]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/manager/settings/departments");
        const payload = await parseApiResponse<{ departments: DepartmentOption[] }>(res);
        if (payload.success) {
          setDepartments(
            payload.data.departments.map((d) => ({ id: d.id, name: d.name })),
          );
        }
      } catch {
        // Filter is optional.
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-gray">
          مؤشرات عامة للمنصة ومتابعة كل قسم — مع إبراز الطلبات المتأخرة وغير المغلقة
        </p>
        {departments.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-brand-gray">القسم:</span>
            <select
              className="input-field"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">كل الأقسام (عام)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && (
        <p className="text-sm text-[var(--zaad-danger)]" role="alert">
          {error}
        </p>
      )}

      {loading || !kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
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
              hint="كل الحالات"
            />
            <KpiCard
              label="نسبة الإكمال"
              value={`${Math.round(kpis.completionRate * 100)}%`}
              hint={`${kpis.completed} مكتمل`}
              tone={kpis.completionRate >= 0.5 ? "good" : "warn"}
            />
            <KpiCard
              label="بانتظار موافقة المدير"
              value={kpis.pendingManager}
              hint="يتطلب إجراء"
              tone={kpis.pendingManager > 0 ? "warn" : "good"}
            />
            <KpiCard
              label="بانتظار الإسناد"
              value={kpis.pendingAssignment}
              tone={kpis.pendingAssignment > 3 ? "warn" : "neutral"}
            />
            <KpiCard
              label="قيد التنفيذ"
              value={kpis.inProgress}
              tone={kpis.inProgress > 5 ? "warn" : "neutral"}
            />
            <KpiCard
              label="متأخر عن الموعد"
              value={kpis.overdueOpen}
              hint="تاريخ مطلوب مضى ولم يُغلق"
              tone={kpis.overdueOpen > 0 ? "bad" : "good"}
            />
            <KpiCard
              label="مكتمل هذا الأسبوع"
              value={kpis.completedThisWeek}
              tone="good"
            />
            <KpiCard
              label="متوسط دورة الحياة"
              value={formatDurationMs(kpis.avgLifecycleMs)}
              hint={`إسناد: ${formatDurationMs(kpis.avgAssignmentMs)}`}
            />
            <KpiCard
              label="حجوزات قادمة (30 يوم)"
              value={kpis.upcomingBookings}
            />
            <KpiCard
              label="زيارات اليوم"
              value={kpis.visitsToday}
              hint="لشاشة الاستقبال"
            />
            <KpiCard
              label="أكثر قسم نشاطاً"
              value={kpis.byDepartment[0]?.departmentName ?? "—"}
              hint={`${kpis.byDepartment[0]?.count ?? 0} طلب`}
            />
            <KpiCard
              label="أكثر نوع طلباً"
              value={kpis.byRequestType[0]?.requestTypeName ?? "—"}
              hint={`${kpis.byRequestType[0]?.count ?? 0} طلب`}
            />
          </div>

          <div className="card space-y-3">
            <Progress
              value={Math.round(kpis.completionRate * 100)}
              label="نسبة إنجاز الطلبات"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
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
            <div className="card overflow-x-auto p-0">
              <table className="tmkeen-table">
                <thead>
                  <tr>
                    <th scope="col">القسم</th>
                    <th scope="col">العدد</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.byDepartment.map((row) => (
                    <tr key={row.departmentName}>
                      <td>{row.departmentName}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-primary">
                متابعة المتأخرة وغير المغلقة
              </h2>
              <span className={kpis.overdueOpen > 0 ? "badge-danger" : "badge-success"}>
                {kpis.overdueOpen} طلب متأخر
              </span>
            </div>
            <p className="text-xs text-brand-gray">
              طلبات تخطّت التاريخ المطلوب ولم تُغلق — يراجعها مدير القسم المعني.
            </p>

            {kpis.overdueByDepartment.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {kpis.overdueByDepartment.map((row) => (
                  <span
                    key={row.departmentName}
                    className="rounded-full bg-[color-mix(in_srgb,var(--zaad-danger)_10%,transparent)] px-3 py-1 text-xs text-[var(--zaad-danger)]"
                  >
                    {row.departmentName}: {row.count}
                  </span>
                ))}
              </div>
            )}

            {kpis.overdueList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="tmkeen-table">
                  <thead>
                    <tr>
                      <th scope="col">الطلب</th>
                      <th scope="col">القسم</th>
                      <th scope="col">الحالة</th>
                      <th scope="col">التاريخ المطلوب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.overdueList.map((row) => (
                      <tr key={row.id}>
                        <td className="font-semibold">{row.title}</td>
                        <td>{row.departmentName}</td>
                        <td>{STATUS_LABELS[row.status] ?? row.status}</td>
                        <td dir="ltr">
                          {new Date(row.requiredDate).toLocaleDateString("ar")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-brand-gray">لا توجد طلبات متأخرة حالياً.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
