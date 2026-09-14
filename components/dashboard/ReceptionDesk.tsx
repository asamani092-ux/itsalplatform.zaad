"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { IconButton } from "@/components/ui/icon-button";
import { IconChevron, IconPlus, IconX } from "@/components/shared/icons";
import { useToast } from "@/components/ui/toast";
import { isOrganizationRequired } from "@/lib/reception/constants";

const PHONE_RE = /^05\d{8}$/;

/** Client-side validation for the visitor register/check-in forms. */
function validateVisitorForm(state: {
  visitorName: string;
  visitorPhone: string;
  organization: string;
  visitType: string;
  visitTarget: string;
  reason: string;
  visitDate: string;
  visitTimeSlot: string;
}): string | null {
  if (!state.visitorName.trim()) return "اسم الزائر مطلوب";
  if (!PHONE_RE.test(state.visitorPhone.trim()))
    return "رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx";
  if (!state.visitType.trim()) return "نوع الزيارة مطلوب";
  if (isOrganizationRequired(state.visitType) && !state.organization.trim())
    return "الجهة / المؤسسة مطلوبة للزيارات التابعة لجهة";
  if (!state.visitTarget.trim()) return "جهة الزيارة مطلوبة";
  if (state.visitTarget === "زائر" && !state.reason.trim())
    return "سبب الزيارة مطلوب";
  if (!state.visitDate.trim()) return "تاريخ الزيارة مطلوب";
  if (!state.visitTimeSlot.trim()) return "فترة الزيارة مطلوبة";
  return null;
}

type TabId =
  | "dashboard"
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
  createdAt: string;
  department?: { id: string; name: string } | null;
  markedBy?: { id: string; name: string } | null;
}

interface ScheduledVisit {
  id: string;
  visitorName: string;
  visitorPhone: string;
  organization?: string;
  visitType?: string;
  visitTarget?: string;
  reason?: string;
  visitTimeSlot?: string;
  scheduledAt?: string;
  status?: string;
  source?: string;
  title: string;
  description?: string;
  contactPhone: string;
  contactEmail?: string;
  visitDate: string | null;
  visitAttended: boolean | null;
  visitMarkedAt?: string | null;
  checkedInAt?: string | null;
  visitorLogId?: string | null;
  rejectionReason?: string | null;
  requestId?: string | null;
  department?: { id: string; name: string };
  requestType?: { id: string; name: string };
}

interface WeekAttendanceEvent {
  id: string;
  title: string;
  kind: string;
  scheduledAt: string;
  notes?: string;
  total: number;
  attended: number;
}

interface WeekFeed {
  weekStart: string;
  weekEnd: string;
  schedules: ScheduledVisit[];
  attendanceEvents: WeekAttendanceEvent[];
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
  createdAt?: string;
  departmentName: string | null;
  markedByName: string | null;
}

/** Newest first — matches platform-wide log ordering. */
function sortLogsNewestFirst<T extends { visitAt: string; createdAt?: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const byVisit = new Date(b.visitAt).getTime() - new Date(a.visitAt).getTime();
    if (byVisit !== 0) return byVisit;
    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bCreated - aCreated;
  });
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
  { id: "logs", label: "سجل الزوار" },
  { id: "scheduled", label: "الجدول الأسبوعي" },
  { id: "attendance", label: "قوائم الحضور" },
  { id: "reports", label: "التقارير" },
];

const WEEKDAY_FULL = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];
const WEEKDAY_SHORT = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

function startOfWeekSunday(d: Date) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

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
  if (/[";,\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
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
  const { pushToast } = useToast();
  const [tab, setTab] = useState<TabId>("logs");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deskManage, setDeskManage] = useState(false);
  const [isDeskStaff, setIsDeskStaff] = useState(false);
  const [visitorRows, setVisitorRows] = useState<{ visitorName: string; visitorPhone: string }[]>([
    { visitorName: "", visitorPhone: "" },
  ]);
  const [capsReady, setCapsReady] = useState(false);

  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [stats, setStats] = useState<DeskStats | null>(null);
  const [meta, setMeta] = useState<DeskMeta | null>(null);
  const [weekFeed, setWeekFeed] = useState<WeekFeed | null>(null);
  const [pendingSchedules, setPendingSchedules] = useState<ScheduledVisit[]>([]);
  const [rejectedSchedules, setRejectedSchedules] = useState<ScheduledVisit[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeekSunday(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => toDateInput(new Date()));
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<VisitorFormState>(() =>
    emptyVisitorForm(),
  );

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

  const loadDesk = useCallback(async (week = weekStart) => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ weekStart: toDateInput(week) });
      const res = await fetch(`/api/reception/desk?${qs}`);
      const payload = await parseApiResponse<{
        visits: ScheduledVisit[];
        attendanceLogs: VisitorLog[];
        stats: DeskStats;
        meta: DeskMeta;
        week?: WeekFeed;
        pendingSchedules?: ScheduledVisit[];
        rejectedSchedules?: ScheduledVisit[];
      }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل بيانات الاستقبال"));
      }
      setVisits(payload.data.visits);
      setLogs(sortLogsNewestFirst(payload.data.attendanceLogs));
      setStats(payload.data.stats);
      setMeta(payload.data.meta);
      setWeekFeed(payload.data.week ?? null);
      setPendingSchedules(payload.data.pendingSchedules ?? []);
      setRejectedSchedules(payload.data.rejectedSchedules ?? []);
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
  }, [weekStart]);

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
      setReportVisits(sortLogsNewestFirst(payload.data.visits));
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

  const refreshActiveTab = useCallback(async () => {
    if (tab === "attendance") {
      await loadAttendance();
      return;
    }
    if (tab === "reports") {
      await loadReports();
      return;
    }
    await loadDesk();
  }, [tab, loadAttendance, loadReports, loadDesk]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const payload = await parseApiResponse<{
          user: {
            deskManage?: boolean;
            isReceptionDesk?: boolean;
            role?: string;
          };
        }>(res);
        if (res.ok && payload.success) {
          const manage = payload.data.user.deskManage === true;
          const deskStaff = payload.data.user.isReceptionDesk === true;
          setDeskManage(manage);
          setIsDeskStaff(deskStaff);
          setTab(manage && !deskStaff ? "dashboard" : "logs");
        }
      } catch {
        /* ignore */
      } finally {
        setCapsReady(true);
      }
    })();
  }, []);

  const visibleTabs = useMemo(() => {
    if (deskManage && !isDeskStaff) {
      return TABS;
    }
    // Desk ops: register/logs/scheduled/attendance (mark only) — no dashboard/reports
    return TABS.filter((t) => t.id === "logs" || t.id === "scheduled" || t.id === "attendance");
  }, [deskManage, isDeskStaff]);

  useEffect(() => {
    void loadDesk();
  }, [loadDesk]);

  useEffect(() => {
    if (tab === "attendance") void loadAttendance();
  }, [tab, loadAttendance]);

  useEffect(() => {
    if (tab === "reports") void loadReports();
  }, [tab, loadReports]);

  const weekDays = useMemo(() => {
    const todayKey = toDateInput(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const key = toDateInput(date);
      return { key, date, isToday: key === todayKey };
    });
  }, [weekStart]);

  const itemsByDay = useMemo(() => {
    const map = new Map<
      string,
      { schedules: ScheduledVisit[]; attendance: WeekAttendanceEvent[] }
    >();
    for (const day of weekDays) {
      map.set(day.key, { schedules: [], attendance: [] });
    }
    for (const s of weekFeed?.schedules ?? []) {
      const key = toDateInput(new Date(s.scheduledAt || s.visitDate || ""));
      const bucket = map.get(key);
      if (bucket) bucket.schedules.push(s);
    }
    for (const e of weekFeed?.attendanceEvents ?? []) {
      const key = toDateInput(new Date(e.scheduledAt));
      const bucket = map.get(key);
      if (bucket) bucket.attendance.push(e);
    }
    return map;
  }, [weekFeed, weekDays]);

  const selectedDayItems = itemsByDay.get(selectedDay) ?? {
    schedules: [],
    attendance: [],
  };

  const todayApproved = useMemo(
    () =>
      visits.filter(
        (v) => !v.status || v.status === "APPROVED",
      ),
    [visits],
  );

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
    const sharedError = validateVisitorForm({
      ...form,
      visitorName: visitorRows[0]?.visitorName ?? "",
      visitorPhone: visitorRows[0]?.visitorPhone ?? "",
    });
    // Shared fields only — name/phone validated per row below
    const sharedOnly = validateVisitorForm({
      visitorName: "x",
      visitorPhone: "0500000000",
      organization: form.organization,
      visitType: form.visitType,
      visitTarget: form.visitTarget,
      reason: form.reason,
      visitDate: form.visitDate,
      visitTimeSlot: form.visitTimeSlot,
    });
    if (sharedOnly) {
      setError(sharedOnly);
      pushToast(sharedOnly, "danger");
      return;
    }
    for (const row of visitorRows) {
      if (!row.visitorName.trim()) {
        setError("اسم الزائر مطلوب لكل صف");
        pushToast("اسم الزائر مطلوب لكل صف", "danger");
        return;
      }
      if (!PHONE_RE.test(row.visitorPhone.trim())) {
        setError("رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx لكل صف");
        pushToast("رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx لكل صف", "danger");
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reception/desk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitors: visitorRows.map((r) => ({
            visitorName: r.visitorName,
            visitorPhone: r.visitorPhone,
          })),
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
      setVisitorRows([{ visitorName: "", visitorPhone: "" }]);
      setSuggestions([]);
      setRegisterOpen(false);
      setTab("logs");
      pushToast("تم تسجيل الزائر بنجاح", "success");
      await loadDesk();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  function openRegister() {
    setError("");
    setForm(emptyVisitorForm(meta));
    setVisitorRows([{ visitorName: "", visitorPhone: "" }]);
    setSuggestions([]);
    setShowSuggestions(false);
    setRegisterOpen(true);
  }

  function openCheckIn(visit: ScheduledVisit) {
    setCheckInFor(visit);
    setCheckInForm({
      visitorName: visit.visitorName || visit.title,
      visitorPhone: visit.visitorPhone || visit.contactPhone || "",
      organization: visit.organization || "",
      visitType: visit.visitType || visitTypes[0],
      visitTarget: (visit.visitTarget || "").replace(/^زائر\s*-\s*.+$/, "زائر") || visitTargets[0],
      reason: visit.reason || "",
      visitDate: visit.scheduledAt || visit.visitDate
        ? toDateInput(new Date(visit.scheduledAt || visit.visitDate || ""))
        : toDateInput(new Date()),
      visitTimeSlot: visit.visitTimeSlot || visitTimeSlots[0],
    });
  }

  async function submitCheckIn() {
    if (!checkInFor) return;
    const validationError = validateVisitorForm(checkInForm);
    if (validationError) {
      setError(validationError);
      pushToast(validationError, "danger");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reception/desk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check_in",
          scheduleId: checkInFor.id,
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
      pushToast("تم تسجيل الحضور بنجاح", "success");
      await loadDesk();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  async function undoAttendance(scheduleId: string) {
    setBusyId(scheduleId);
    setError("");
    try {
      const res = await fetch("/api/reception/desk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "undo", scheduleId }),
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

  function openScheduleModal() {
    setError("");
    setScheduleForm(emptyVisitorForm(meta));
    setScheduleOpen(true);
  }

  async function submitManagerSchedule(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateVisitorForm(scheduleForm);
    if (validationError) {
      setError(validationError);
      pushToast(validationError, "danger");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reception/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorName: scheduleForm.visitorName,
          visitorPhone: scheduleForm.visitorPhone,
          organization: scheduleForm.organization,
          visitType: scheduleForm.visitType,
          visitTarget: scheduleForm.visitTarget,
          reason: scheduleForm.visitTarget === "زائر" ? scheduleForm.reason : undefined,
          visitDate: scheduleForm.visitDate,
          visitTimeSlot: scheduleForm.visitTimeSlot,
        }),
      });
      const payload = await parseApiResponse<unknown>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل جدولة الزيارة"));
      }
      setScheduleOpen(false);
      pushToast("تمت جدولة الزيارة وإشعار مكتب الاستقبال", "success");
      setTab("scheduled");
      await loadDesk();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  async function approveSchedule(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/reception/schedules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", scheduleId: id }),
      });
      const payload = await parseApiResponse<unknown>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل اعتماد الجدولة"));
      }
      pushToast("تم اعتماد الزيارة المجدولة", "success");
      await loadDesk();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusyId(null);
    }
  }

  async function rejectSchedule(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/reception/schedules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", scheduleId: id }),
      });
      const payload = await parseApiResponse<unknown>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل رفض الجدولة"));
      }
      pushToast("تم رفض جدولة الزيارة", "success");
      await loadDesk();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusyId(null);
    }
  }

  function scheduleStatusBadge(status?: string) {
    if (status === "PENDING_APPROVAL") {
      return <span className="badge-warning">بانتظار الاعتماد</span>;
    }
    if (status === "REJECTED") {
      return <span className="badge-danger">مرفوضة</span>;
    }
    if (status === "APPROVED") {
      return <span className="badge-success">معتمدة</span>;
    }
    return null;
  }

  function visitPrimaryLabel(v: ScheduledVisit) {
    return v.visitorName?.trim() || v.title || "زائر";
  }

  function visitSecondaryLabel(v: ScheduledVisit) {
    const parts = [v.title, v.requestType?.name].filter(
      (p) => p && p !== v.visitorName,
    );
    return parts.filter(Boolean).join(" · ");
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
      header.join(";"),
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
        ].join(";"),
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
  const pendingScheduled = todayApproved.filter((v) => !v.visitAttended).length;

  function renderVisitorFields(
    state: VisitorFormState,
    onChange: <K extends keyof VisitorFormState>(key: K, value: VisitorFormState[K]) => void,
    opts?: { nameAutocomplete?: boolean; idPrefix?: string; skipIdentity?: boolean },
  ) {
    const prefix = opts?.idPrefix ?? "v";
    return (
      <>
        {!opts?.skipIdentity && (
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
          </>
        )}

        <div className="space-y-1">
          <label className="label-field" htmlFor={`${prefix}-org`}>
            الجهة / المؤسسة
            {!isOrganizationRequired(state.visitType) && (
              <span className="ms-1 font-normal text-brand-gray">(اختياري للزيارات الشخصية)</span>
            )}
          </label>
          <input
            id={`${prefix}-org`}
            className="input-field w-full"
            required={isOrganizationRequired(state.visitType)}
            value={state.organization}
            onChange={(e) => onChange("organization", e.target.value)}
            placeholder={
              isOrganizationRequired(state.visitType)
                ? "اسم الجهة"
                : "اختياري إن كانت الزيارة شخصية"
            }
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => void refreshActiveTab()}
          >
            تحديث
          </button>
          {deskManage && (
            <button
              type="button"
              className="btn-secondary inline-flex min-h-11 items-center gap-2 px-4 text-sm font-semibold"
              onClick={openScheduleModal}
            >
              <IconPlus size={18} />
              جدولة زيارة
            </button>
          )}
          {capsReady && (isDeskStaff || !deskManage) && (
            <button
              type="button"
              className="btn-primary inline-flex min-h-12 items-center gap-2 px-5 text-base font-bold sm:min-h-14 sm:px-7 sm:text-lg"
              onClick={openRegister}
            >
              <IconPlus size={22} />
              تسجيل زائر
            </button>
          )}
        </div>
      </div>

      <div className="tab-bar no-print" role="tablist" aria-label="أقسام الاستقبال">
        {visibleTabs.map(({ id, label }) => (
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
                  <strong className="text-primary">{todayApproved.length}</strong>
                </span>
                <span>
                  بانتظار الحضور:{" "}
                  <strong className="text-primary">{pendingScheduled}</strong>
                </span>
                <span>
                  سجلات ظاهرة:{" "}
                  <strong className="text-primary">{logs.length}</strong>
                </span>
                {deskManage && (
                  <span>
                    بانتظار اعتماد الجدولة:{" "}
                    <strong className="text-primary">{pendingSchedules.length}</strong>
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {registerOpen && (
        <div
          className="modal-overlay no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="register-visitor-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setRegisterOpen(false);
          }}
        >
          <form
            onSubmit={(e) => void submitRegister(e)}
            className="modal-panel card max-w-2xl space-y-4 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="register-visitor-title" className="text-lg font-bold text-primary">
                تسجيل زائر / زوار
              </h3>
              <IconButton
                label="إغلاق"
                icon={<IconX size={18} />}
                onClick={() => {
                  if (!submitting) setRegisterOpen(false);
                }}
              />
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary">الزوار</p>
                {visitorRows.map((row, index) => (
                  <div
                    key={`visitor-row-${index}`}
                    className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <input
                      className="input-field"
                      placeholder="اسم الزائر"
                      value={row.visitorName}
                      onChange={(e) =>
                        setVisitorRows((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, visitorName: e.target.value } : r,
                          ),
                        )
                      }
                      required
                    />
                    <input
                      className="input-field"
                      placeholder="05xxxxxxxx"
                      dir="ltr"
                      value={row.visitorPhone}
                      onChange={(e) =>
                        setVisitorRows((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, visitorPhone: e.target.value } : r,
                          ),
                        )
                      }
                      required
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={visitorRows.length === 1 || submitting}
                      onClick={() =>
                        setVisitorRows((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      حذف
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  disabled={submitting}
                  onClick={() =>
                    setVisitorRows((prev) => [
                      ...prev,
                      { visitorName: "", visitorPhone: "" },
                    ])
                  }
                >
                  إضافة زائر
                </button>
              </div>
              {renderVisitorFields(form, updateForm, {
                nameAutocomplete: false,
                idPrefix: "reg",
                skipIdentity: true,
              })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-secondary flex-1"
                disabled={submitting}
                onClick={() => setRegisterOpen(false)}
              >
                إلغاء
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                {submitting
                  ? "جاري الحفظ…"
                  : visitorRows.length > 1
                    ? `حفظ ${visitorRows.length} زيارات`
                    : "حفظ الزيارة"}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === "logs" && (
        <div className="space-y-3">
          <div className="space-y-2 md:hidden">
            {loading ? (
              <p className="text-sm text-brand-gray">جاري التحميل…</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-brand-gray">لا توجد سجلات زوار بعد</p>
            ) : (
              logs.map((log) => (
                <article key={log.id} className="card space-y-1 p-3">
                  <p className="font-semibold text-primary">{log.visitorName}</p>
                  <p className="text-xs text-brand-gray" dir="ltr">
                    {log.visitorPhone}
                  </p>
                  <p className="text-sm">
                    <span className="badge-primary">{log.visitType}</span>{" "}
                    {log.visitTarget}
                  </p>
                  <p className="text-xs text-brand-gray">
                    {formatDate(log.visitAt)} · {log.visitTimeSlot}
                    {log.organization ? ` · ${log.organization}` : ""}
                  </p>
                </article>
              ))
            )}
          </div>
          <div className="card hidden overflow-x-auto p-0 md:block">
            <table className="tmkeen-table w-full min-w-0">
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
                        <span className="badge-primary">{log.visitType}</span>
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
        </div>
      )}

      {tab === "scheduled" && (
        <div className="space-y-4">
          {deskManage && pendingSchedules.length > 0 && (
            <section className="card space-y-3 p-4">
              <h3 className="text-sm font-bold text-primary">
                بانتظار اعتماد الجدولة ({pendingSchedules.length})
              </h3>
              <ul className="space-y-2">
                {pendingSchedules.map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-[color-mix(in_srgb,#8B1538_15%,white)] p-3"
                  >
                    <div>
                      <p className="font-semibold text-primary">{visitPrimaryLabel(v)}</p>
                      <p className="text-xs text-brand-gray">
                        {visitSecondaryLabel(v) || "طلب زيارة"} ·{" "}
                        {formatDateTime(v.scheduledAt || v.visitDate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {scheduleStatusBadge(v.status)}
                      <button
                        type="button"
                        className="btn-primary text-xs"
                        disabled={busyId === v.id}
                        onClick={() => void approveSchedule(v.id)}
                      >
                        اعتماد
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        disabled={busyId === v.id}
                        onClick={() => void rejectSchedule(v.id)}
                      >
                        رفض
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="card overflow-hidden p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <IconButton
                  label="الأسبوع السابق"
                  icon={<IconChevron size={18} />}
                  onClick={() => {
                    setWeekStart((w) => addDays(w, -7));
                    setSelectedDay((d) =>
                      toDateInput(addDays(new Date(`${d}T12:00:00`), -7)),
                    );
                  }}
                />
                <IconButton
                  label="الأسبوع التالي"
                  icon={<IconChevron size={18} className="rotate-180" />}
                  onClick={() => {
                    setWeekStart((w) => addDays(w, 7));
                    setSelectedDay((d) =>
                      toDateInput(addDays(new Date(`${d}T12:00:00`), 7)),
                    );
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary text-xs sm:text-sm"
                  onClick={() => {
                    const now = startOfWeekSunday(new Date());
                    setWeekStart(now);
                    setSelectedDay(toDateInput(new Date()));
                  }}
                >
                  هذا الأسبوع
                </button>
              </div>
              <p className="text-sm font-bold text-primary">
                {formatDate(weekDays[0]?.key)} — {formatDate(weekDays[6]?.key)}
              </p>
            </div>

            {loading && !weekFeed ? (
              <p className="text-sm text-brand-gray">جاري التحميل…</p>
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
                    aria-label="تقويم زيارات الأسبوع"
                  >
                    {weekDays.map((day) => {
                      const bucket = itemsByDay.get(day.key) ?? {
                        schedules: [],
                        attendance: [],
                      };
                      const count =
                        bucket.schedules.length + bucket.attendance.length;
                      const selected = selectedDay === day.key;
                      const hasPending = bucket.schedules.some(
                        (s) => s.status === "PENDING_APPROVAL",
                      );
                      return (
                        <button
                          key={day.key}
                          type="button"
                          role="gridcell"
                          aria-selected={selected}
                          onClick={() => setSelectedDay(day.key)}
                          className={`min-h-[4.5rem] space-y-1 p-1.5 text-start transition-colors sm:min-h-[5.5rem] sm:p-2 ${
                            selected
                              ? "bg-[var(--zaad-surface)] ring-2 ring-inset ring-[var(--zaad-primary)]"
                              : "bg-[var(--zaad-surface)] hover:bg-[color-mix(in_srgb,var(--zaad-primary)_8%,transparent)]"
                          } ${day.isToday ? "font-bold" : ""}`}
                        >
                          <span
                            className={`text-sm ${
                              day.isToday ? "text-primary" : "text-brand-gray"
                            }`}
                          >
                            {day.date.getDate()}
                          </span>
                          {count > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span
                                className={
                                  hasPending
                                    ? "badge-warning text-[0.65rem]"
                                    : "badge-primary text-[0.65rem]"
                                }
                              >
                                {count}
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

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-primary">
              جدول {formatDate(selectedDay)}
            </h3>
            <div className="card overflow-x-auto p-0">
              <table className="tmkeen-table w-full min-w-0">
                <thead>
                  <tr>
                    <th>النوع</th>
                    <th>الاسم/العنوان</th>
                    <th>الوقت</th>
                    <th>الحالة</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !weekFeed ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-brand-gray">
                        جاري التحميل…
                      </td>
                    </tr>
                  ) : selectedDayItems.schedules.length === 0 &&
                    selectedDayItems.attendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-brand-gray">
                        لا توجد عناصر لهذا اليوم
                      </td>
                    </tr>
                  ) : (
                    <>
                      {selectedDayItems.schedules.map((v) => (
                        <tr key={v.id}>
                          <td>
                            <span className="badge-primary">زيارة</span>
                          </td>
                          <td>
                            <span className="font-semibold">{visitPrimaryLabel(v)}</span>
                            {visitSecondaryLabel(v) && (
                              <span className="mt-0.5 block text-xs text-brand-gray">
                                {visitSecondaryLabel(v)}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap text-xs">
                            {v.visitTimeSlot ||
                              formatDateTime(v.scheduledAt || v.visitDate)}
                          </td>
                          <td>
                            <div className="flex flex-wrap items-center gap-2">
                              {scheduleStatusBadge(v.status)}
                              {v.status === "APPROVED" && (
                                <span
                                  className={
                                    v.visitAttended
                                      ? "badge-success"
                                      : "badge-warning"
                                  }
                                >
                                  {v.visitAttended ? "حاضر" : "بانتظار الحضور"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-2">
                              {deskManage && v.status === "PENDING_APPROVAL" && (
                                <>
                                  <button
                                    type="button"
                                    className="btn-primary text-xs"
                                    disabled={busyId === v.id}
                                    onClick={() => void approveSchedule(v.id)}
                                  >
                                    اعتماد
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary text-xs"
                                    disabled={busyId === v.id}
                                    onClick={() => void rejectSchedule(v.id)}
                                  >
                                    رفض
                                  </button>
                                </>
                              )}
                              {v.status === "APPROVED" &&
                                (v.visitAttended ? (
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
                                ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {selectedDayItems.attendance.map((ev) => (
                        <tr key={`att-${ev.id}`}>
                          <td>
                            <span className="badge-primary">قائمة حضور</span>
                          </td>
                          <td className="font-semibold">{ev.title}</td>
                          <td className="whitespace-nowrap text-xs">
                            {formatDateTime(ev.scheduledAt)}
                          </td>
                          <td className="text-xs text-brand-gray">
                            {ev.kind === "JOB_INTERVIEW"
                              ? "مقابلة وظيفية"
                              : "اجتماع"}{" "}
                            · حضور {ev.attended}/{ev.total}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-secondary text-xs"
                              disabled={busyId === ev.id}
                              onClick={() => {
                                setTab("attendance");
                                void openAttendanceEvent(ev.id);
                              }}
                            >
                              تحضير
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {deskManage && rejectedSchedules.length > 0 && (
            <section className="card space-y-3 p-4">
              <h3 className="text-sm font-bold text-primary">
                مرفوضات الجدولة ({rejectedSchedules.length})
              </h3>
              <ul className="space-y-2">
                {rejectedSchedules.map((v) => (
                  <li key={v.id} className="text-sm">
                    <span className="font-semibold text-primary">
                      {visitPrimaryLabel(v)}
                    </span>
                    <span className="text-brand-gray">
                      {" "}
                      · {formatDateTime(v.scheduledAt || v.visitDate)}
                      {v.rejectionReason ? ` — ${v.rejectionReason}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {scheduleOpen && (
        <div
          className="modal-overlay no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-visit-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setScheduleOpen(false);
          }}
        >
          <form
            onSubmit={(e) => void submitManagerSchedule(e)}
            className="modal-panel card max-w-lg space-y-4 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="schedule-visit-title" className="text-lg font-bold text-primary">
                جدولة زيارة
              </h3>
              <IconButton
                label="إغلاق"
                icon={<IconX size={18} />}
                onClick={() => {
                  if (!submitting) setScheduleOpen(false);
                }}
              />
            </div>
            <p className="text-xs text-brand-gray">
              تُنشأ معتمدة مباشرة وتظهر لموظفي الاستقبال في يوم الموعد.
            </p>
            {renderVisitorFields(scheduleForm, (key, value) =>
              setScheduleForm((prev) => ({ ...prev, [key]: value })),
              { idPrefix: "sch" },
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-secondary flex-1"
                disabled={submitting}
                onClick={() => setScheduleOpen(false)}
              >
                إلغاء
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                {submitting ? "جاري الحفظ…" : "حفظ الجدولة"}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === "attendance" && (
        <div className="space-y-4">
          {deskManage && (
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
          )}

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
            <p className="text-sm text-brand-gray">
              {visitPrimaryLabel(checkInFor)}
              {visitSecondaryLabel(checkInFor)
                ? ` — ${visitSecondaryLabel(checkInFor)}`
                : ""}
            </p>
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
