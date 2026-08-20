"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";

type TabId =
  | "dashboard"
  | "register"
  | "logs"
  | "scheduled"
  | "attendance"
  | "reports";

interface StatBar {
  label: string;
  count: number;
}

interface DeskStats {
  totals: {
    loggedVisits: number;
    personal: number;
    official: number;
    morning: number;
  };
  byTarget: StatBar[];
  bySlot: StatBar[];
}

interface DeskMeta {
  visitTargets: string[];
  visitTypes: string[];
  visitTimeSlots: string[];
}

interface VisitorSuggestion {
  visitorName: string;
  visitorPhone: string;
  organization: string;
  visitTarget: string;
}

interface VisitorLog {
  id: string;
  visitorName: string;
  visitorPhone: string;
  organization: string;
  visitType: string;
  visitTarget: string;
  reason: string;
  visitTimeSlot: string;
  visitAt: string;
  department?: { id: string; name: string } | null;
  markedBy?: { id: string; name: string } | null;
}

interface ScheduledVisit {
  id: string;
  title: string;
  description: string;
  contactPhone: string;
  contactEmail: string;
  visitDate: string | null;
  visitAttended: boolean | null;
  visitMarkedAt?: string | null;
  department?: { id: string; name: string };
  requestType?: { id: string; name: string };
}

interface AttendanceEventSummary {
  id: string;
  title: string;
  kind: string;
  scheduledAt: string;
  notes: string;
  total: number;
  attended: number;
}

interface AttendanceAttendee {
  id: string;
  name: string;
  phone: string;
  attended: boolean;
  checkedInAt: string | null;
}

interface AttendanceEventDetail {
  id: string;
  title: string;
  kind: string;
  scheduledAt: string;
  notes: string;
  attendees: AttendanceAttendee[];
}

interface DeptOption {
  id: string;
  name: string;
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
  organization: string;
  visitType: string;
  visitTarget: string;
  reason: string;
  visitTimeSlot: string;
  visitAt: string;
  departmentName: string | null;
  markedByName: string | null;
}

interface VisitorFormState {
  visitorName: string;
  visitorPhone: string;
  organization: string;
  visitType: string;
  visitTarget: string;
  reason: string;
  visitDate: string;
  visitTimeSlot: string;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "لوحة التحكم" },
  { id: "register", label: "تسجيل زائر" },
  { id: "logs", label: "سجل الزوار" },
  { id: "scheduled", label: "مجدولة اليوم" },
  { id: "attendance", label: "قوائم الحضور" },
  { id: "reports", label: "التقارير" },
];

const DEFAULT_TARGETS = [
  "الإدارة التنفيذية",
  "إدارة الآداء والنمو",
  "إدارة الإتصال المؤسسي",
  "إدارة التكافل المجتمعي",
  "إدارة الرعاية والتمكين",
  "إدارة الشؤون المالية والإدارية",
  "زائر",
];
const DEFAULT_TYPES = ["شخصي", "تابع لجهة"];
const DEFAULT_SLOTS = ["الصباح", "الظهر", "المساء"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toLocalDateTimeInput(d: Date) {
  return `${toDateInput(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function emptyVisitorForm(meta?: DeskMeta | null): VisitorFormState {
  return {
    visitorName: "",
    visitorPhone: "",
    organization: "",
    visitType: meta?.visitTypes?.[0] ?? DEFAULT_TYPES[0],
    visitTarget: meta?.visitTargets?.[0] ?? DEFAULT_TARGETS[0],
    reason: "",
    visitDate: toDateInput(new Date()),
    visitTimeSlot: meta?.visitTimeSlots?.[0] ?? DEFAULT_SLOTS[0],
  };
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(iso));
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function barPercent(count: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(4, Math.round((count / max) * 100));
}

function SimpleBars({
  items,
  emptyLabel,
}: {
  items: StatBar[];
  emptyLabel: string;
}) {
  const max = Math.max(0, ...items.map((i) => i.count));
  if (items.length === 0) {
    return <p className="text-sm text-brand-gray">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-primary">{item.label}</span>
            <span className="text-brand-gray">{item.count}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded bg-[color-mix(in_srgb,#8B1538_12%,white)]">
            <div
              className="h-full rounded bg-[#8B1538] transition-[width] duration-500"
              style={{ width: `${barPercent(item.count, max)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReceptionDesk() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [stats, setStats] = useState<DeskStats | null>(null);
  const [meta, setMeta] = useState<DeskMeta | null>(null);

  const [form, setForm] = useState<VisitorFormState>(() => emptyVisitorForm());
  const [suggestions, setSuggestions] = useState<VisitorSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [checkInFor, setCheckInFor] = useState<ScheduledVisit | null>(null);
  const [checkInForm, setCheckInForm] = useState<VisitorFormState>(() => emptyVisitorForm());

  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEventSummary[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<AttendanceEventDetail | null>(null);
  const [attForm, setAttForm] = useState({
    title: "",
    kind: "MEETING",
    scheduledAt: toLocalDateTimeInput(new Date()),
    namesText: "",
  });

  const today = useMemo(() => new Date(), []);
  const [reportFrom, setReportFrom] = useState(
    toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
  );
  const [reportTo, setReportTo] = useState(toDateInput(today));
  const [reportLoading, setReportLoading] = useState(false);
  const [kpis, setKpis] = useState<DeptKpi[]>([]);
  const [reportVisits, setReportVisits] = useState<ReportVisit[]>([]);
  const [reportTotals, setReportTotals] = useState({
    loggedVisits: 0,
    scheduledVisits: 0,
    attendedScheduled: 0,
    departmentsWithVisits: 0,
  });
  const [departments, setDepartments] = useState<DeptOption[]>([]);

  const visitTargets = meta?.visitTargets?.length ? meta.visitTargets : DEFAULT_TARGETS;
  const visitTypes = meta?.visitTypes?.length ? meta.visitTypes : DEFAULT_TYPES;
  const visitTimeSlots = meta?.visitTimeSlots?.length
    ? meta.visitTimeSlots
    : DEFAULT_SLOTS;

  const loadDesk = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reception/desk");
      const payload = await parseApiResponse<{
        visits: ScheduledVisit[];
        attendanceLogs: VisitorLog[];
        stats: DeskStats;
        meta: DeskMeta;
      }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل بيانات الاستقبال"));
      }
      setVisits(payload.data.visits);
      setLogs(payload.data.attendanceLogs);
      setStats(payload.data.stats);
      setMeta(payload.data.meta);
      setForm((prev) => ({
        ...prev,
        visitType: prev.visitType || payload.data.meta.visitTypes[0] || DEFAULT_TYPES[0],
        visitTarget:
          prev.visitTarget || payload.data.meta.visitTargets[0] || DEFAULT_TARGETS[0],
        visitTimeSlot:
          prev.visitTimeSlot ||
          payload.data.meta.visitTimeSlots[0] ||
          DEFAULT_SLOTS[0],
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reception/attendance");
      const payload = await parseApiResponse<{ events: AttendanceEventSummary[] }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل قوائم الحضور"));
      }
      setAttendanceEvents(payload.data.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setReportLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ from: reportFrom, to: reportTo });
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
  }, [reportFrom, reportTo]);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  useEffect(() => {
    if (tab === "attendance") void loadAttendance();
  }, [tab, loadAttendance]);

  useEffect(() => {
    if (tab === "reports") void loadReports();
  }, [tab, loadReports]);

  useEffect(() => {
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, []);

  function updateForm<K extends keyof VisitorFormState>(key: K, value: VisitorFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateCheckIn<K extends keyof VisitorFormState>(
    key: K,
    value: VisitorFormState[K],
  ) {
    setCheckInForm((prev) => ({ ...prev, [key]: value }));
  }

  function scheduleNameSuggest(name: string) {
    updateForm("visitorName", name);
    setShowSuggestions(true);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (name.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/reception/desk?q=${encodeURIComponent(name.trim())}`,
          );
          const payload = await parseApiResponse<{ suggestions: VisitorSuggestion[] }>(
            res,
          );
          if (res.ok && payload.success) {
            setSuggestions(payload.data.suggestions);
          }
        } catch {
          /* ignore autocomplete errors */
        }
      })();
    }, 280);
  }

  function applySuggestion(s: VisitorSuggestion) {
    const baseTarget = s.visitTarget.replace(/^زائر\s*-\s*.+$/, "زائر");
    const reasonMatch = s.visitTarget.match(/^زائر\s*-\s*(.+)$/);
    setForm((prev) => ({
      ...prev,
      visitorName: s.visitorName,
      visitorPhone: s.visitorPhone,
      organization: s.organization,
      visitTarget: visitTargets.includes(baseTarget) ? baseTarget : prev.visitTarget,
      reason: reasonMatch?.[1] ?? prev.reason,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reception/desk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorName: form.visitorName,
          visitorPhone: form.visitorPhone,
          organization: form.organization,
          visitType: form.visitType,
          visitTarget: form.visitTarget,
          reason: form.visitTarget === "زائر" ? form.reason : undefined,
          visitDate: form.visitDate,
          visitTimeSlot: form.visitTimeSlot,
        }),
      });
      const payload = await parseApiResponse<unknown>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل تسجيل الزائر"));
      }
      setForm(emptyVisitorForm(meta));
      setSuggestions([]);
      setTab("logs");
      await loadDesk();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  function openCheckIn(visit: ScheduledVisit) {
    setCheckInFor(visit);
    setCheckInForm({
      visitorName: visit.title,
      visitorPhone: visit.contactPhone || "",
      organization: "",
      visitType: visitTypes[0],
      visitTarget: visitTargets[0],
      reason: "",
      visitDate: visit.visitDate ? toDateInput(new Date(visit.visitDate)) : toDateInput(new Date()),
      visitTimeSlot: visitTimeSlots[0],
    });
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
          visitorName: checkInForm.visitorName,
          visitorPhone: checkInForm.visitorPhone,
          organization: checkInForm.organization,
          visitType: checkInForm.visitType,
          visitTarget: checkInForm.visitTarget,
          reason: checkInForm.visitTarget === "زائر" ? checkInForm.reason : undefined,
          visitDate: checkInForm.visitDate,
          visitTimeSlot: checkInForm.visitTimeSlot,
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

  async function createAttendanceList(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reception/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: attForm.title,
          kind: attForm.kind,
          scheduledAt: new Date(attForm.scheduledAt).toISOString(),
          namesText: attForm.namesText,
        }),
      });
      const payload = await parseApiResponse<{ event: AttendanceEventDetail }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل إنشاء قائمة الحضور"));
      }
      setAttForm({
        title: "",
        kind: "MEETING",
        scheduledAt: toLocalDateTimeInput(new Date()),
        namesText: "",
      });
      setActiveEvent(payload.data.event);
      await loadAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  async function openAttendanceEvent(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/reception/attendance?id=${encodeURIComponent(id)}`);
      const payload = await parseApiResponse<{ event: AttendanceEventDetail }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر فتح القائمة"));
      }
      setActiveEvent(payload.data.event);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleAttendee(attendee: AttendanceAttendee) {
    setBusyId(attendee.id);
    setError("");
    try {
      const res = await fetch("/api/reception/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle",
          attendeeId: attendee.id,
          attended: !attendee.attended,
        }),
      });
      const payload = await parseApiResponse<{ attendee: AttendanceAttendee }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل تحديث الحضور"));
      }
      setActiveEvent((prev) =>
        prev
          ? {
              ...prev,
              attendees: prev.attendees.map((a) =>
                a.id === payload.data.attendee.id ? payload.data.attendee : a,
              ),
            }
          : prev,
      );
      void loadAttendance();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusyId(null);
    }
  }

  function downloadCsv() {
    const header = [
      "الاسم",
      "الجوال",
      "الجهة",
      "النوع",
      "الوجهة",
      "الفترة",
      "التاريخ",
      "الإدارة",
    ];
    const lines = [
      header.join(","),
      ...reportVisits.map((v) =>
        [
          csvEscape(v.visitorName),
          csvEscape(v.visitorPhone),
          csvEscape(v.organization ?? ""),
          csvEscape(v.visitType),
          csvEscape(v.visitTarget),
          csvEscape(v.visitTimeSlot),
          csvEscape(formatDateTime(v.visitAt)),
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

  const totals = stats?.totals;
  const pendingScheduled = visits.filter((v) => !v.visitAttended).length;

  function renderVisitorFields(
    state: VisitorFormState,
    onChange: <K extends keyof VisitorFormState>(key: K, value: VisitorFormState[K]) => void,
    opts?: { nameAutocomplete?: boolean; idPrefix?: string },
  ) {
    const prefix = opts?.idPrefix ?? "v";
    return (
      <>
        <div className="relative space-y-1">
          <label className="label-field" htmlFor={`${prefix}-name`}>
            اسم الزائر
          </label>
          <input
            id={`${prefix}-name`}
            className="input-field w-full"
            required
            autoComplete="off"
            value={state.visitorName}
            onChange={(e) => {
              if (opts?.nameAutocomplete) scheduleNameSuggest(e.target.value);
              else onChange("visitorName", e.target.value);
            }}
            onFocus={() => opts?.nameAutocomplete && setShowSuggestions(true)}
            onBlur={() => {
              window.setTimeout(() => setShowSuggestions(false), 160);
            }}
          />
          {opts?.nameAutocomplete && showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded border border-[color-mix(in_srgb,#8B1538_25%,white)] bg-white shadow-md">
              {suggestions.map((s) => (
                <li key={`${s.visitorName}-${s.visitorPhone}`}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-right text-sm hover:bg-[color-mix(in_srgb,#8B1538_8%,white)]"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySuggestion(s)}
                  >
                    <span className="font-semibold text-primary">{s.visitorName}</span>
                    <span className="mt-0.5 block text-xs text-brand-gray">
                      {s.organization} · {s.visitorPhone}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1">
          <label className="label-field" htmlFor={`${prefix}-phone`}>
            رقم الجوال
          </label>
          <input
            id={`${prefix}-phone`}
            className="input-field w-full"
            dir="ltr"
            required
            value={state.visitorPhone}
            onChange={(e) => onChange("visitorPhone", e.target.value)}
            placeholder="05xxxxxxxx"
          />
        </div>

        <div className="space-y-1">
          <label className="label-field" htmlFor={`${prefix}-org`}>
            الجهة / المؤسسة
          </label>
          <input
            id={`${prefix}-org`}
            className="input-field w-full"
            required
            value={state.organization}
            onChange={(e) => onChange("organization", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="label-field" htmlFor={`${prefix}-type`}>
              نوع الزيارة
            </label>
            <select
              id={`${prefix}-type`}
              className="input-field w-full"
              required
              value={state.visitType}
              onChange={(e) => onChange("visitType", e.target.value)}
            >
              {visitTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor={`${prefix}-target`}>
              جهة الزيارة
            </label>
            <select
              id={`${prefix}-target`}
              className="input-field w-full"
              required
              value={state.visitTarget}
              onChange={(e) => onChange("visitTarget", e.target.value)}
            >
              {visitTargets.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {state.visitTarget === "زائر" && (
          <div className="space-y-1">
            <label className="label-field" htmlFor={`${prefix}-reason`}>
              سبب الزيارة
            </label>
            <input
              id={`${prefix}-reason`}
              className="input-field w-full"
              required
              value={state.reason}
              onChange={(e) => onChange("reason", e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="label-field" htmlFor={`${prefix}-date`}>
              تاريخ الزيارة
            </label>
            <input
              id={`${prefix}-date`}
              type="date"
              className="input-field w-full"
              dir="ltr"
              required
              value={state.visitDate}
              onChange={(e) => onChange("visitDate", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor={`${prefix}-slot`}>
              فترة الزيارة
            </label>
            <select
              id={`${prefix}-slot`}
              className="input-field w-full"
              required
              value={state.visitTimeSlot}
              onChange={(e) => onChange("visitTimeSlot", e.target.value)}
            >
              {visitTimeSlots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="reception-desk space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .reception-print, .reception-print * { visibility: visible !important; }
          .reception-print {
            position: absolute;
            inset: 0;
            padding: 1.5rem;
            background: white;
            color: #1a1a1a;
            font-family: Tajawal, "Noto Naskh Arabic", sans-serif;
          }
          .no-print { display: none !important; }
          .reception-print h2, .reception-print h3 {
            color: #8B1538 !important;
          }
          .reception-print table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          .reception-print th, .reception-print td {
            border: 1px solid #ccc;
            padding: 6px 8px;
            text-align: right;
          }
          .reception-print th {
            background: #8B1538 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary">مكتب الاستقبال المركزي</h2>
          <p className="mt-1 text-sm text-brand-gray">
            تسجيل الزوار والمواعيد وقوائم الحضور وفق نظام الزوار المعتمد
          </p>
        </div>
        <button type="button" className="btn-secondary text-sm" onClick={() => void loadDesk()}>
          تحديث
        </button>
      </div>

      <div className="tab-bar no-print" role="tablist" aria-label="أقسام الاستقبال">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            data-active={tab === id ? "true" : "false"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="no-print text-sm text-[var(--zaad-danger)]" role="alert">
          {error}
        </p>
      )}

      {tab === "dashboard" && (
        <div className="space-y-4">
          {loading && !stats ? (
            <p className="text-sm text-brand-gray">جاري التحميل…</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="card p-4">
                  <p className="text-xs text-brand-gray">إجمالي الزيارات</p>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {totals?.loggedVisits ?? 0}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-brand-gray">زيارات شخصية</p>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {totals?.personal ?? 0}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-brand-gray">تابع لجهة</p>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {totals?.official ?? 0}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-brand-gray">فترة الصباح</p>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {totals?.morning ?? 0}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <section className="card space-y-3 p-4">
                  <h3 className="text-sm font-bold text-primary">حسب جهة الزيارة</h3>
                  <SimpleBars
                    items={stats?.byTarget ?? []}
                    emptyLabel="لا توجد بيانات بعد"
                  />
                </section>
                <section className="card space-y-3 p-4">
                  <h3 className="text-sm font-bold text-primary">حسب الفترة</h3>
                  <SimpleBars
                    items={stats?.bySlot ?? []}
                    emptyLabel="لا توجد بيانات بعد"
                  />
                </section>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-brand-gray">
                <span>
                  مجدولة اليوم:{" "}
                  <strong className="text-primary">{visits.length}</strong>
                </span>
                <span>
                  بانتظار الحضور:{" "}
                  <strong className="text-primary">{pendingScheduled}</strong>
                </span>
                <span>
                  سجلات ظاهرة:{" "}
                  <strong className="text-primary">{logs.length}</strong>
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "register" && (
        <form
          onSubmit={(e) => void submitRegister(e)}
          className="card max-w-2xl space-y-3 p-4"
        >
          <h3 className="font-bold text-primary">تسجيل زائر جديد</h3>
          {renderVisitorFields(form, updateForm, {
            nameAutocomplete: true,
            idPrefix: "reg",
          })}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "جاري الحفظ…" : "حفظ الزيارة"}
          </button>
        </form>
      )}

      {tab === "logs" && (
        <div className="card overflow-x-auto p-0">
          <table className="tmkeen-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الجوال</th>
                <th>الجهة</th>
                <th>النوع</th>
                <th>الوجهة</th>
                <th>التاريخ</th>
                <th>الفترة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-brand-gray">
                    جاري التحميل…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-brand-gray">
                    لا توجد سجلات زوار بعد
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-semibold">{log.visitorName}</td>
                    <td dir="ltr" className="text-xs">
                      {log.visitorPhone}
                    </td>
                    <td>{log.organization || "—"}</td>
                    <td>
                      <span className="badge-info">{log.visitType}</span>
                    </td>
                    <td>{log.visitTarget}</td>
                    <td className="whitespace-nowrap text-xs">
                      {formatDate(log.visitAt)}
                    </td>
                    <td>{log.visitTimeSlot}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "scheduled" && (
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
                      {formatDateTime(v.visitDate)}
                    </td>
                    <td className="font-semibold">{v.title}</td>
                    <td>{v.department?.name ?? "—"}</td>
                    <td dir="ltr" className="text-xs">
                      {v.contactPhone || "—"}
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
      )}

      {tab === "attendance" && (
        <div className="space-y-4">
          <form
            onSubmit={(e) => void createAttendanceList(e)}
            className="card max-w-2xl space-y-3 p-4"
          >
            <h3 className="font-bold text-primary">إنشاء قائمة حضور</h3>
            <div className="space-y-1">
              <label className="label-field" htmlFor="att-title">
                عنوان القائمة
              </label>
              <input
                id="att-title"
                className="input-field w-full"
                required
                value={attForm.title}
                onChange={(e) => setAttForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="label-field" htmlFor="att-kind">
                  النوع
                </label>
                <select
                  id="att-kind"
                  className="input-field w-full"
                  value={attForm.kind}
                  onChange={(e) => setAttForm((p) => ({ ...p, kind: e.target.value }))}
                >
                  <option value="MEETING">اجتماع</option>
                  <option value="JOB_INTERVIEW">مقابلة وظيفية</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="att-at">
                  التاريخ والوقت
                </label>
                <input
                  id="att-at"
                  type="datetime-local"
                  className="input-field w-full"
                  dir="ltr"
                  required
                  value={attForm.scheduledAt}
                  onChange={(e) =>
                    setAttForm((p) => ({ ...p, scheduledAt: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="label-field" htmlFor="att-names">
                الأسماء (سطر لكل اسم)
              </label>
              <textarea
                id="att-names"
                className="input-field min-h-[120px] w-full"
                required
                value={attForm.namesText}
                onChange={(e) =>
                  setAttForm((p) => ({ ...p, namesText: e.target.value }))
                }
                placeholder={"أحمد محمد\nسارة علي"}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "جاري الإنشاء…" : "إنشاء القائمة"}
            </button>
          </form>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-primary">القوائم السابقة</h3>
            <div className="card overflow-x-auto p-0">
              <table className="tmkeen-table">
                <thead>
                  <tr>
                    <th>العنوان</th>
                    <th>النوع</th>
                    <th>الموعد</th>
                    <th>الحضور</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-brand-gray">
                        جاري التحميل…
                      </td>
                    </tr>
                  ) : attendanceEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-brand-gray">
                        لا توجد قوائم بعد
                      </td>
                    </tr>
                  ) : (
                    attendanceEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td className="font-semibold">{ev.title}</td>
                        <td>
                          {ev.kind === "JOB_INTERVIEW" ? "مقابلة وظيفية" : "اجتماع"}
                        </td>
                        <td className="whitespace-nowrap text-xs">
                          {formatDateTime(ev.scheduledAt)}
                        </td>
                        <td>
                          {ev.attended}/{ev.total}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-secondary text-xs"
                            disabled={busyId === ev.id}
                            onClick={() => void openAttendanceEvent(ev.id)}
                          >
                            فتح
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {activeEvent && (
            <div className="modal-overlay" role="dialog" aria-modal="true">
              <div className="card mx-auto max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-primary">{activeEvent.title}</h3>
                    <p className="mt-1 text-xs text-brand-gray">
                      {activeEvent.kind === "JOB_INTERVIEW"
                        ? "مقابلة وظيفية"
                        : "اجتماع"}{" "}
                      · {formatDateTime(activeEvent.scheduledAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => setActiveEvent(null)}
                  >
                    إغلاق
                  </button>
                </div>
                <ul className="divide-y divide-[color-mix(in_srgb,#8B1538_12%,white)]">
                  {activeEvent.attendees.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <span className="font-medium text-primary">{a.name}</span>
                      <button
                        type="button"
                        className={
                          a.attended ? "btn-secondary text-xs" : "btn-primary text-xs"
                        }
                        disabled={busyId === a.id}
                        onClick={() => void toggleAttendee(a)}
                      >
                        {a.attended ? "إلغاء الحضور" : "حاضر"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "reports" && (
        <div className="reception-print space-y-4">
          <div className="no-print flex flex-wrap items-end gap-3">
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
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={reportVisits.length === 0 && kpis.length === 0}
              onClick={() => window.print()}
            >
              طباعة / PDF
            </button>
          </div>

          <div className="mb-2">
            <h2 className="text-lg font-bold text-primary">تقرير الاستقبال</h2>
            <p className="text-sm text-brand-gray">
              الفترة: {reportFrom} — {reportTo}
              {departments.length > 0 ? ` · ${departments.length} إدارة` : ""}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card p-4">
              <p className="text-xs text-brand-gray">زيارات مسجّلة</p>
              <p className="text-2xl font-bold text-primary">{reportTotals.loggedVisits}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-brand-gray">زيارات مجدولة</p>
              <p className="text-2xl font-bold text-primary">
                {reportTotals.scheduledVisits}
              </p>
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
            <h3 className="text-sm font-bold text-primary">مؤشرات الإدارات</h3>
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
                  ) : kpis.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-sm text-brand-gray">
                        لا توجد بيانات
                      </td>
                    </tr>
                  ) : (
                    kpis.map((k) => (
                      <tr key={k.departmentId ?? "none"}>
                        <td className="font-semibold">{k.departmentName}</td>
                        <td>{k.loggedVisits}</td>
                        <td>{k.scheduledVisits}</td>
                        <td>{k.attendedScheduled}</td>
                        <td>
                          {k.attendanceRate == null ? "—" : `${k.attendanceRate}%`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-primary">سجل الزيارات</h3>
            <div className="card overflow-x-auto p-0">
              <table className="tmkeen-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>الجوال</th>
                    <th>الجهة</th>
                    <th>النوع</th>
                    <th>الوجهة</th>
                    <th>الفترة</th>
                    <th>التاريخ</th>
                    <th>الإدارة</th>
                  </tr>
                </thead>
                <tbody>
                  {reportVisits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-sm text-brand-gray">
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
                        <td>{v.organization || "—"}</td>
                        <td>{v.visitType}</td>
                        <td>{v.visitTarget}</td>
                        <td>{v.visitTimeSlot}</td>
                        <td className="whitespace-nowrap text-xs">
                          {formatDateTime(v.visitAt)}
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
        <div className="modal-overlay no-print" role="dialog" aria-modal="true">
          <div className="card mx-auto max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto p-4">
            <h3 className="font-bold text-primary">تأكيد تسجيل الحضور</h3>
            <p className="text-sm text-brand-gray">{checkInFor.title}</p>
            {renderVisitorFields(checkInForm, updateCheckIn, { idPrefix: "cin" })}
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
