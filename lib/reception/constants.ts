/** Visit targets from the approved Apps Script visitor system (association admins). */
export const VISIT_TARGETS = [
  "الإدارة التنفيذية",
  "إدارة الآداء والنمو",
  "إدارة الإتصال المؤسسي",
  "إدارة التكافل المجتمعي",
  "إدارة الرعاية والتمكين",
  "إدارة الشؤون المالية والإدارية",
  "زائر",
] as const;

export const VISIT_TYPES = ["شخصي", "تابع لجهة"] as const;

export const VISIT_TIME_SLOTS = ["الصباح", "الظهر", "المساء"] as const;

export type VisitTimeSlot = (typeof VISIT_TIME_SLOTS)[number];

/** Map slot → approximate hour for visitAt sorting. */
export function slotToHour(slot: string): number {
  if (slot === "الظهر") return 12;
  if (slot === "المساء") return 17;
  return 9;
}

export function combineVisitAt(dateIso: string, slot: string): Date {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) {
    throw new Error("VALIDATION: تاريخ الزيارة غير صالح");
  }
  d.setHours(slotToHour(slot), 0, 0, 0);
  return d;
}
