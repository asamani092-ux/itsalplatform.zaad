import { UAT_SECTIONS, UAT_TOTAL_ITEMS, UAT_VERSION } from "./checklist";

export type UatRating = "" | "1" | "2" | "3" | "4" | "5" | "na";
export type UatWorks = "" | "yes" | "no";
export type UatDecision = "" | "approved" | "approved_with_notes" | "needs_fixes";

export interface UatItemResult {
  rating: UatRating;
  works: UatWorks;
  notes: string;
}

export interface UatMeta {
  evaluator: string;
  role: string;
  date: string;
  environment: string;
}

export interface UatState {
  meta: UatMeta;
  results: Record<string, UatItemResult>;
  criticalNotes: string;
  improvementNotes: string;
  decision: UatDecision;
}

export const EMPTY_ITEM: UatItemResult = { rating: "", works: "", notes: "" };

const DECISION_LABELS: Record<Exclude<UatDecision, "">, string> = {
  approved: "معتمد للإطلاق",
  approved_with_notes: "معتمد مع تحفظات",
  needs_fixes: "يحتاج دورة إصلاح",
};

const WORKS_LABELS: Record<Exclude<UatWorks, "">, string> = {
  yes: "نعم",
  no: "لا",
};

export function sectionAverage(
  sectionId: string,
  results: Record<string, UatItemResult>,
): number | null {
  const section = UAT_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return null;

  const scores = section.items
    .map((item) => results[item.id]?.rating)
    .filter((rating): rating is Exclude<UatRating, "" | "na"> =>
      rating !== undefined && rating !== "" && rating !== "na",
    )
    .map((rating) => Number(rating));

  if (scores.length === 0) return null;
  return scores.reduce((sum, n) => sum + n, 0) / scores.length;
}

export function completedCount(results: Record<string, UatItemResult>): number {
  return UAT_SECTIONS.reduce((total, section) => {
    const done = section.items.filter((item) => {
      const result = results[item.id];
      return Boolean(result && result.rating !== "");
    }).length;
    return total + done;
  }, 0);
}

export function overallAverage(results: Record<string, UatItemResult>): number | null {
  const averages = UAT_SECTIONS.map((section) => sectionAverage(section.id, results)).filter(
    (value): value is number => value !== null,
  );
  if (averages.length === 0) return null;
  return averages.reduce((sum, n) => sum + n, 0) / averages.length;
}

export function buildMarkdownReport(state: UatState): string {
  const lines: string[] = [];

  lines.push("# تقرير تقييم الأدوات — منصة قسم الاتصال المؤسسي");
  lines.push("");
  lines.push("| الحقل | القيمة |");
  lines.push("|-------|--------|");
  lines.push(`| اسم المقيّم | ${state.meta.evaluator || "—"} |`);
  lines.push(`| الدور | ${state.meta.role || "—"} |`);
  lines.push(`| التاريخ | ${state.meta.date || "—"} |`);
  lines.push(`| البيئة | ${state.meta.environment || "—"} |`);
  lines.push(`| الإصدار | ${UAT_VERSION} |`);
  lines.push(
    `| البنود المُقيَّمة | ${completedCount(state.results)} من ${UAT_TOTAL_ITEMS} |`,
  );
  const overall = overallAverage(state.results);
  lines.push(`| المتوسط العام | ${overall === null ? "—" : overall.toFixed(2)} |`);
  lines.push("");

  for (const section of UAT_SECTIONS) {
    const average = sectionAverage(section.id, state.results);
    const heading = section.path
      ? `## ${section.title} (${section.path})`
      : `## ${section.title}`;
    lines.push(heading);
    lines.push(
      `**متوسط المحور:** ${average === null ? "لم يُقيَّم" : average.toFixed(2)}`,
    );
    lines.push("");
    lines.push("| # | البند | التقييم | يعمل؟ | ملاحظات |");
    lines.push("|---|-------|---------|-------|---------|");
    for (const item of section.items) {
      const result = state.results[item.id] ?? EMPTY_ITEM;
      const rating =
        result.rating === "" ? "—" : result.rating === "na" ? "غير مُجرَّب" : result.rating;
      const works = result.works === "" ? "—" : WORKS_LABELS[result.works];
      const notes = result.notes.trim().replace(/\|/g, "/") || "—";
      lines.push(`| ${item.id} | ${item.label} | ${rating} | ${works} | ${notes} |`);
    }
    lines.push("");
  }

  lines.push("## ملاحظات حرجة (تمنع الإطلاق)");
  lines.push(state.criticalNotes.trim() || "لا توجد");
  lines.push("");
  lines.push("## ملاحظات تحسينية (بعد الإطلاق)");
  lines.push(state.improvementNotes.trim() || "لا توجد");
  lines.push("");
  lines.push(
    `**القرار النهائي:** ${
      state.decision === "" ? "لم يُحدَّد" : DECISION_LABELS[state.decision]
    }`,
  );

  return lines.join("\n");
}
