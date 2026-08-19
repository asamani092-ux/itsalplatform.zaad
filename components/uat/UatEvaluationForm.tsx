"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UAT_SECTIONS, UAT_TOTAL_ITEMS, UAT_VERSION } from "@/lib/uat/checklist";
import {
  EMPTY_ITEM,
  buildMarkdownReport,
  completedCount,
  overallAverage,
  sectionAverage,
  type UatDecision,
  type UatItemResult,
  type UatRating,
  type UatState,
  type UatWorks,
} from "@/lib/uat/report";

const STORAGE_KEY = "zaad-uat-v1";

const RATINGS: { value: UatRating; label: string }[] = [
  { value: "5", label: "5" },
  { value: "4", label: "4" },
  { value: "3", label: "3" },
  { value: "2", label: "2" },
  { value: "1", label: "1" },
  { value: "na", label: "غير مُجرَّب" },
];

const ROLES = ["مدير", "موظف", "استقبال", "مقدّم طلب", "فريق التقنية"];
const ENVIRONMENTS = ["محلي", "VPS تجريبي", "إنتاج"];

function emptyState(): UatState {
  return {
    meta: { evaluator: "", role: ROLES[0], date: "", environment: ENVIRONMENTS[0] },
    results: {},
    criticalNotes: "",
    improvementNotes: "",
    decision: "",
  };
}

export default function UatEvaluationForm() {
  const [state, setState] = useState<UatState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [openSection, setOpenSection] = useState<string>(UAT_SECTIONS[0].id);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setState(JSON.parse(saved) as UatState);
      }
    } catch {
      // Corrupted local draft — start fresh
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable (private mode) — evaluation still works in memory
    }
  }, [state, hydrated]);

  const setItem = useCallback(
    (itemId: string, patch: Partial<UatItemResult>) => {
      setState((prev) => ({
        ...prev,
        results: {
          ...prev.results,
          [itemId]: { ...(prev.results[itemId] ?? EMPTY_ITEM), ...patch },
        },
      }));
    },
    [],
  );

  const done = useMemo(() => completedCount(state.results), [state.results]);
  const overall = useMemo(() => overallAverage(state.results), [state.results]);
  const progress = Math.round((done / UAT_TOTAL_ITEMS) * 100);
  const report = useMemo(() => buildMarkdownReport(state), [state]);

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      setCopyStatus("تم نسخ التقرير");
    } catch {
      setCopyStatus("تعذّر النسخ — انسخ يدوياً من الصندوق أدناه");
    }
    window.setTimeout(() => setCopyStatus(""), 4000);
  }

  function downloadReport() {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uat-report-${state.meta.date || "draft"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetAll() {
    setState(emptyState());
    setCopyStatus("تمت إعادة التعيين");
    window.setTimeout(() => setCopyStatus(""), 3000);
  }

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-primary">بيانات المقيّم</h2>
            <p className="text-xs text-brand-gray">الإصدار: {UAT_VERSION}</p>
          </div>
          <span className="badge-primary">
            {done} / {UAT_TOTAL_ITEMS} بنداً
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="label-field" htmlFor="uat-evaluator">
              اسم المقيّم
            </label>
            <input
              id="uat-evaluator"
              className="input-field w-full"
              value={state.meta.evaluator}
              onChange={(e) =>
                setState((p) => ({ ...p, meta: { ...p.meta, evaluator: e.target.value } }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="uat-role">
              الدور
            </label>
            <select
              id="uat-role"
              className="input-field w-full"
              value={state.meta.role}
              onChange={(e) =>
                setState((p) => ({ ...p, meta: { ...p.meta, role: e.target.value } }))
              }
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="uat-date">
              التاريخ
            </label>
            <input
              id="uat-date"
              type="date"
              dir="ltr"
              className="input-field w-full"
              value={state.meta.date}
              onChange={(e) =>
                setState((p) => ({ ...p, meta: { ...p.meta, date: e.target.value } }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="uat-env">
              البيئة
            </label>
            <select
              id="uat-env"
              className="input-field w-full"
              value={state.meta.environment}
              onChange={(e) =>
                setState((p) => ({
                  ...p,
                  meta: { ...p.meta, environment: e.target.value },
                }))
              }
            >
              {ENVIRONMENTS.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="نسبة إكمال التقييم"
          >
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-brand-gray">
            نسبة الإكمال: {progress}%
            {overall !== null && ` — المتوسط العام: ${overall.toFixed(2)}`}
          </p>
        </div>
      </section>

      {UAT_SECTIONS.map((section) => {
        const average = sectionAverage(section.id, state.results);
        const isOpen = openSection === section.id;
        const sectionDone = section.items.filter(
          (item) => (state.results[item.id]?.rating ?? "") !== "",
        ).length;

        return (
          <section key={section.id} className="card p-0">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
              aria-expanded={isOpen}
              onClick={() => setOpenSection(isOpen ? "" : section.id)}
            >
              <span className="min-w-0">
                <span className="block font-bold text-primary">{section.title}</span>
                {section.path && (
                  <span className="block text-xs text-brand-gray" dir="ltr">
                    {section.path}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-brand-gray">
                  {sectionDone}/{section.items.length}
                </span>
                <span
                  className={
                    average === null
                      ? "badge-warning"
                      : average >= 4
                        ? "badge-success"
                        : average >= 3
                          ? "badge-primary"
                          : "badge-danger"
                  }
                >
                  {average === null ? "—" : average.toFixed(1)}
                </span>
              </span>
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-surface-border p-4">
                {section.items.map((item) => {
                  const result = state.results[item.id] ?? EMPTY_ITEM;
                  return (
                    <div
                      key={item.id}
                      className="space-y-2 rounded-lg border border-surface-border p-3"
                    >
                      <p className="text-sm font-semibold text-primary">
                        <span dir="ltr">{item.id}</span> — {item.label}
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-brand-gray">التقييم:</span>
                        {RATINGS.map((rating) => (
                          <button
                            key={rating.value}
                            type="button"
                            aria-pressed={result.rating === rating.value}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                              result.rating === rating.value
                                ? "bg-primary text-white"
                                : "border border-surface-border bg-surface text-brand-gray"
                            }`}
                            onClick={() =>
                              setItem(item.id, {
                                rating:
                                  result.rating === rating.value
                                    ? ""
                                    : (rating.value as UatRating),
                              })
                            }
                          >
                            {rating.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-brand-gray">يعمل؟</span>
                        {(
                          [
                            { value: "yes", label: "نعم" },
                            { value: "no", label: "لا" },
                          ] as { value: UatWorks; label: string }[]
                        ).map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={result.works === option.value}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                              result.works === option.value
                                ? option.value === "yes"
                                  ? "bg-[var(--zaad-success)] text-white"
                                  : "bg-[var(--zaad-danger)] text-white"
                                : "border border-surface-border bg-surface text-brand-gray"
                            }`}
                            onClick={() =>
                              setItem(item.id, {
                                works: result.works === option.value ? "" : option.value,
                              })
                            }
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <label className="label-field text-xs" htmlFor={`note-${item.id}`}>
                          ملاحظات
                        </label>
                        <input
                          id={`note-${item.id}`}
                          className="input-field w-full text-sm"
                          value={result.notes}
                          placeholder="اكتب ملاحظتك هنا..."
                          onChange={(e) => setItem(item.id, { notes: e.target.value })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <section className="card space-y-4">
        <h2 className="text-lg font-bold text-primary">الخلاصة والقرار</h2>

        <div className="space-y-1">
          <label className="label-field" htmlFor="uat-critical">
            ملاحظات حرجة (تمنع الإطلاق)
          </label>
          <textarea
            id="uat-critical"
            className="input-field min-h-24 w-full"
            value={state.criticalNotes}
            onChange={(e) => setState((p) => ({ ...p, criticalNotes: e.target.value }))}
          />
        </div>

        <div className="space-y-1">
          <label className="label-field" htmlFor="uat-improvement">
            ملاحظات تحسينية (بعد الإطلاق)
          </label>
          <textarea
            id="uat-improvement"
            className="input-field min-h-24 w-full"
            value={state.improvementNotes}
            onChange={(e) => setState((p) => ({ ...p, improvementNotes: e.target.value }))}
          />
        </div>

        <div className="space-y-1">
          <label className="label-field" htmlFor="uat-decision">
            القرار النهائي
          </label>
          <select
            id="uat-decision"
            className="input-field w-full"
            value={state.decision}
            onChange={(e) =>
              setState((p) => ({ ...p, decision: e.target.value as UatDecision }))
            }
          >
            <option value="">— اختر القرار —</option>
            <option value="approved">معتمد للإطلاق</option>
            <option value="approved_with_notes">معتمد مع تحفظات</option>
            <option value="needs_fixes">يحتاج دورة إصلاح</option>
          </select>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-primary">التقرير</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-sm" onClick={() => void copyReport()}>
              نسخ التقرير
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={downloadReport}>
              تنزيل .md
            </button>
            <button
              type="button"
              className="btn-secondary border-[var(--zaad-danger)] text-sm text-[var(--zaad-danger)]"
              onClick={resetAll}
            >
              إعادة تعيين
            </button>
          </div>
        </div>

        {copyStatus && (
          <p className="text-sm font-semibold text-primary" role="status">
            {copyStatus}
          </p>
        )}

        <label className="label-field" htmlFor="uat-report">
          معاينة التقرير (Markdown)
        </label>
        <textarea
          id="uat-report"
          readOnly
          dir="rtl"
          className="input-field min-h-64 w-full font-mono text-xs"
          value={report}
        />
        <p className="text-xs text-brand-gray">
          يُحفظ التقييم تلقائياً في هذا المتصفح — يمكنك المتابعة لاحقاً دون فقدان البيانات.
        </p>
      </section>
    </div>
  );
}
