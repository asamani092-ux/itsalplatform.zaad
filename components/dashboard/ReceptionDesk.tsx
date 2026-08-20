"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";

type TabId = "today" | "register" | "reports";

interface DeptOption {
  id: string;
  name: string;
}

interface ScheduledVisit {
  id: string;
  title: string;
  description: string;
  contactPhone: string;
  contactEmail: string;
  visitDate: string | null;
  visitAttended: boolean | null;
  department?: { id: string; name: string };
  requestType?: { name: string };
}

interface AttendanceLog {
  id: string;
  visitorName: string;
  visitorPhone: string;
  reason: string;
  organization: string | null;
  visitAt: string;
  department?: { name: string } | null;
}

interface DeptKpi {
  departmentId: string | null;
  departmentName: string;
  loggedVisits: number;
  scheduledVisits: number;
  attendedScheduled: number;
  attendanceRate: number | null;
}

interface ReportVisit {
  id: string;
  visitorName: string;
  visitorPhone: string;
  reason: string;
  organization: string | null;
  visitAt: string;
  departmentName: string | null;
}

function formatVisitTime(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export default function ReceptionDesk() {
  const [tab, setTab] = useState<TabId>("today");
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [checkInFor, setCheckInFor] = useState<ScheduledVisit | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formOrg, setFormOrg] = useState("");
  const [formVisitAt, setFormVisitAt] = useState(toLocalInputValue(new Date()));
  const [formDeptId, setFormDeptId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const today = useMemo(() => new Date(), []);
  const [reportFrom, setReportFrom] = useState(
    toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
  );
  const [reportTo, setReportTo] = useState(toDateInput(today));
  const [reportDept, setReportDept] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [kpis, setKpis] = useState<DeptKpi[]>([]);
  const [reportVisits, setReportVisits] = useState<ReportVisit[]>([]);
  const [reportTotals, setReportTotals] = useState({
    loggedVisits: 0,
    scheduledVisits: 0,
    attendedScheduled: 0,
    departmentsWithVisits: 0,
  });

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reception/desk");
      const payload = await parseApiResponse<{
        visits: ScheduledVisit[];
        attendanceLogs: AttendanceLog[];
        departments: DeptOption[];
      }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل الزيارات"));
      }
      setVisits(payload.data.visits);
      setLogs(payload.data.attendanceLogs);
      setDepartments(payload.data.departments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setReportLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ from: reportFrom, to: reportTo });
      if (reportDept) qs.set("departmentId", reportDept);
      const res = await fetch(`/api/reception/reports?${qs}`);
      const payload = await parseApiResponse<{
        departmentKpis: DeptKpi[];
        visits: ReportVisit[];
        totals: {
          loggedVisits: number;
          scheduledVisits: number;
          attendedScheduled: number;
          departmentsWithVisits: number;
        };
        departments: DeptOption[];
      }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل التقارير"));
      }
      setKpis(payload.data.departmentKpis);
      setReportVisits(payload.data.visits);
      setReportTotals(payload.data.totals);
      if (payload.data.departments?.length) {
        setDepartments(payload.data.departments);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setReportLoading(false);
    }
  }, [reportFrom, reportTo, reportDept]);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  useEffect(() => {
    if (tab === "reports") void loadReports();
  }, [tab, loadReports]);

  function openCheckIn(visit: ScheduledVisit) {
    setCheckInFor(visit);
    setFormName(visit.title);
    setFormPhone(visit.contactPhone);
    setFormReason(visit.requestType?.name || visit.description || visit.title);
    setFormOrg("");
    setFormVisitAt(toLocalInputValue(visit.visitDate ? new Date(visit.visitDate) : new Date()));
  }

  async function submitCheckIn() {
    if (!checkInFor) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reception/desk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check_in",
          requestId: checkInFor.id,
          visitorName: formName,
          visitorPhone: formPhone,
          reason: formReason,
          organization: formOrg || null,
          visitAt: new Date(formVisitAt).toISOString(),
        }),
      });
      const payload = await parseApiResponse<unknown>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل تسجيل الحضور"));
      }
      setCheckInFor(null);
      await loadDesk();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  async function undoAttendance(requestId: string) {
    setBusyId(requestId);
    setError("");
    try {
      const res = await fetch("/api/reception/desk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "undo", requestId }),
      });
      const payload = await parseApiResponse<unknown>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل إلغاء الحضور"));
      }
      await loadDesk();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusyId(null);
    }
  }

  async function submitWalkIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reception/desk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorName: formName,
          visitorPhone: formPhone,
          reason: formReason,
          organization: formOrg || null,
          visitAt: new Date(formVisitAt).toISOString(),
          departmentId: formDeptId || null,
        }),
      });
      const payload = await parseApiResponse<unknown>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل تسجيل الزائر"));
      }
      setFormName("");
      setFormPhone("");
      setFormReason("");
      setFormOrg("");
      setFormDeptId("");
      setFormVisitAt(toLocalInputValue(new Date()));
      setTab("today");
      await loadDesk();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  function downloadCsv() {
    const header = ["الاسم", "الجوال", "السبب", "الجهة", "وقت الزيارة", "الإدارة"];
    const lines = [
      header.join(","),
      ...reportVisits.map((v) =>
        [
          csvEscape(v.visitorName),
          csvEscape(v.visitorPhone),
          csvEscape(v.reason),
          csvEscape(v.organization ?? ""),
          csvEscape(formatVisitTime(v.visitAt)),
          csvEscape(v.departmentName ?? ""),
        ].join(","),
      ),
    ];
    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reception-visits-${reportFrom}_${reportTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pending = visits.filter((v) => !v.visitAttended).length;
  const attended = visits.length - pending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary">مكتب الاستقبال المركزي</h2>
          <p className="mt-1 text-sm text-brand-gray">
            تسجيل الحضور وقائمة الزوار مع الوقت وتقارير الإدارات
          </p>
        </div>
        <button type="button" className="btn-secondary text-sm" onClick={() => void loadDesk()}>
          تحديث
        </button>
      </div>

      <div className="tab-bar" role="tablist" aria-label="أقسام الاستقبال">
        {(
          [
            ["today", "قائمة اليوم"],
            ["register", "تسجيل زائر"],
            ["reports", "التقارير"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            data-active={tab === id ? "true" : "false"}
            onClick={() => {
              setTab(id);
              if (id === "register") {
                setFormName("");
                setFormPhone("");
                setFormReason("");
                setFormOrg("");
                setFormDeptId("");
                setFormVisitAt(toLocalInputValue(new Date()));
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-[var(--zaad-danger)]" role="alert">
          {error}
        </p>
      )}

      {tab === "today" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4 text-sm text-brand-gray">
            <span>
              المجدولة: <strong className="text-primary">{visits.length}</strong>
            </span>
            <span>
              بانتظار: <strong className="text-primary">{pending}</strong>
            </span>
            <span>
              حضر: <strong className="text-primary">{attended}</strong>
            </span>
            <span>
              سجل الحضور: <strong className="text-primary">{logs.length}</strong>
            </span>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-primary">الزيارات المجدولة اليوم</h3>
            <div className="card overflow-x-auto p-0">
              <table className="tmkeen-table">
                <thead>
                  <tr>
                    <th>الوقت</th>
                    <th>الزيارة</th>
                    <th>القسم</th>
                    <th>الجوال</th>
                    <th>الحضور</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-brand-gray">
                        جاري التحميل…
                      </td>
                    </tr>
                  ) : visits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-brand-gray">
                        لا توجد زيارات مجدولة اليوم
                      </td>
                    </tr>
                  ) : (
                    visits.map((v) => (
                      <tr key={v.id}>
                        <td className="whitespace-nowrap text-xs">
                          {formatVisitTime(v.visitDate)}
                        </td>
                        <td className="font-semibold">{v.title}</td>
                        <td>{v.department?.name ?? "—"}</td>
                        <td dir="ltr" className="text-xs">
                          {v.contactPhone}
                        </td>
                        <td>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={v.visitAttended ? "badge-success" : "badge-warning"}
                            >
                              {v.visitAttended ? "حاضر" : "بانتظار"}
                            </span>
                            {v.visitAttended ? (
                              <button
                                type="button"
                                className="btn-secondary text-xs"
                                disabled={busyId === v.id}
                                onClick={() => void undoAttendance(v.id)}
                              >
                                إلغاء الحضور
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-primary text-xs"
                                onClick={() => openCheckIn(v)}
                              >
                                تسجيل حضور
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-primary">سجل الزوار اليوم (مع الوقت)</h3>
            <div className="card overflow-x-auto p-0">
              <table className="tmkeen-table">
                <thead>
                  <tr>
                    <th>وقت الزيارة</th>
                    <th>الاسم</th>
                    <th>الجوال</th>
                    <th>السبب</th>
                    <th>الجهة</th>
                    <th>الإدارة</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-brand-gray">
                        لم يُسجَّل حضور بعد اليوم
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td className="whitespace-nowrap text-xs">
                          {formatVisitTime(log.visitAt)}
                        </td>
                        <td className="font-semibold">{log.visitorName}</td>
                        <td dir="ltr" className="text-xs">
                          {log.visitorPhone}
                        </td>
                        <td>{log.reason}</td>
                        <td>{log.organization || "—"}</td>
                        <td>{log.department?.name ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === "register" && (
        <form onSubmit={(e) => void submitWalkIn(e)} className="card max-w-xl space-y-3 p-4">
          <h3 className="font-bold text-primary">تسجيل زائر (حضور مباشر)</h3>
          <div className="space-y-1">
            <label className="label-field" htmlFor="v-name">
              الاسم
            </label>
            <input
              id="v-name"
              className="input-field w-full"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="v-phone">
              الجوال
            </label>
            <input
              id="v-phone"
              className="input-field w-full"
              dir="ltr"
              required
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="05xxxxxxxx"
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="v-reason">
              السبب
            </label>
            <input
              id="v-reason"
              className="input-field w-full"
              required
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="v-org">
              الجهة (اختياري)
            </label>
            <input
              id="v-org"
              className="input-field w-full"
              value={formOrg}
              onChange={(e) => setFormOrg(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="v-dept">
              الإدارة
            </label>
            <select
              id="v-dept"
              className="input-field w-full"
              value={formDeptId}
              onChange={(e) => setFormDeptId(e.target.value)}
            >
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="v-at">
              وقت الزيارة
            </label>
            <input
              id="v-at"
              type="datetime-local"
              className="input-field w-full"
              dir="ltr"
              required
              value={formVisitAt}
              onChange={(e) => setFormVisitAt(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "جاري الحفظ…" : "حفظ في سجل الحضور"}
          </button>
        </form>
      )}

      {tab === "reports" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="label-field" htmlFor="r-from">
                من
              </label>
              <input
                id="r-from"
                type="date"
                className="input-field"
                dir="ltr"
                value={reportFrom}
                onChange={(e) => setReportFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="label-field" htmlFor="r-to">
                إلى
              </label>
              <input
                id="r-to"
                type="date"
                className="input-field"
                dir="ltr"
                value={reportTo}
                onChange={(e) => setReportTo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="label-field" htmlFor="r-dept">
                الإدارة
              </label>
              <select
                id="r-dept"
                className="input-field"
                value={reportDept}
                onChange={(e) => setReportDept(e.target.value)}
              >
                <option value="">الكل</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={reportLoading}
              onClick={() => void loadReports()}
            >
              عرض
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={reportVisits.length === 0}
              onClick={downloadCsv}
            >
              تنزيل CSV
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card p-4">
              <p className="text-xs text-brand-gray">زيارات مسجّلة</p>
              <p className="text-2xl font-bold text-primary">{reportTotals.loggedVisits}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-brand-gray">زيارات مجدولة</p>
              <p className="text-2xl font-bold text-primary">{reportTotals.scheduledVisits}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-brand-gray">حضر من المجدول</p>
              <p className="text-2xl font-bold text-primary">
                {reportTotals.attendedScheduled}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-brand-gray">إدارات بزوار</p>
              <p className="text-2xl font-bold text-primary">
                {reportTotals.departmentsWithVisits}
              </p>
            </div>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-primary">مؤشرات زوار الإدارات</h3>
            <div className="card overflow-x-auto p-0">
              <table className="tmkeen-table">
                <thead>
                  <tr>
                    <th>الإدارة</th>
                    <th>مسجّل</th>
                    <th>مجدول</th>
                    <th>حضر</th>
                    <th>نسبة الحضور %</th>
                  </tr>
                </thead>
                <tbody>
                  {reportLoading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-sm text-brand-gray">
                        جاري التحميل…
                      </td>
                    </tr>
                  ) : (
                    kpis.map((k) => (
                      <tr key={k.departmentId ?? "none"}>
                        <td className="font-semibold">{k.departmentName}</td>
                        <td>{k.loggedVisits}</td>
                        <td>{k.scheduledVisits}</td>
                        <td>{k.attendedScheduled}</td>
                        <td>{k.attendanceRate == null ? "—" : `${k.attendanceRate}%`}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-primary">تقرير الزيارات (بيانات رسمية)</h3>
            <div className="card overflow-x-auto p-0">
              <table className="tmkeen-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>الجوال</th>
                    <th>السبب</th>
                    <th>الجهة</th>
                    <th>وقت الزيارة</th>
                    <th>الإدارة</th>
                  </tr>
                </thead>
                <tbody>
                  {reportVisits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-brand-gray">
                        لا توجد سجلات في الفترة المحددة
                      </td>
                    </tr>
                  ) : (
                    reportVisits.map((v) => (
                      <tr key={v.id}>
                        <td className="font-semibold">{v.visitorName}</td>
                        <td dir="ltr" className="text-xs">
                          {v.visitorPhone}
                        </td>
                        <td>{v.reason}</td>
                        <td>{v.organization || "—"}</td>
                        <td className="whitespace-nowrap text-xs">
                          {formatVisitTime(v.visitAt)}
                        </td>
                        <td>{v.departmentName || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {checkInFor && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="card mx-auto w-full max-w-md space-y-3 p-4">
            <h3 className="font-bold text-primary">تأكيد تسجيل الحضور</h3>
            <p className="text-sm text-brand-gray">{checkInFor.title}</p>
            <div className="space-y-1">
              <label className="label-field" htmlFor="c-name">
                الاسم
              </label>
              <input
                id="c-name"
                className="input-field w-full"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="label-field" htmlFor="c-phone">
                الجوال
              </label>
              <input
                id="c-phone"
                className="input-field w-full"
                dir="ltr"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="label-field" htmlFor="c-reason">
                السبب
              </label>
              <input
                id="c-reason"
                className="input-field w-full"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="label-field" htmlFor="c-org">
                الجهة (اختياري)
              </label>
              <input
                id="c-org"
                className="input-field w-full"
                value={formOrg}
                onChange={(e) => setFormOrg(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="label-field" htmlFor="c-at">
                وقت الزيارة
              </label>
              <input
                id="c-at"
                type="datetime-local"
                className="input-field w-full"
                dir="ltr"
                value={formVisitAt}
                onChange={(e) => setFormVisitAt(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setCheckInFor(null)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={submitting}
                onClick={() => void submitCheckIn()}
              >
                {submitting ? "…" : "تأكيد الحضور"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
