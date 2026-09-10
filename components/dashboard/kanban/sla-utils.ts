import type { DashboardRequest } from "./RequestCard";

/** Soft SLA for in-progress work after assignment (72 hours). */
const IN_PROGRESS_SLA_MS = 72 * 60 * 60 * 1000;

const CLOSED_STATUSES = new Set([
  "Completed",
  "Archived",
  "Rejected",
  "Cancelled",
]);

/**
 * Deadline used for overdue checks.
 * Hospitality bookings use meetingDate + startTime (not midnight of the day),
 * so a same-day booking is not marked late in the morning.
 * Other requests use end-of-day of requiredDate.
 */
function resolveDeadlineMs(request: DashboardRequest): number | null {
  const booking = request.hospitalityBooking;
  if (booking?.meetingDate) {
    const base = new Date(booking.meetingDate);
    if (Number.isNaN(base.getTime())) return null;
    const [h, m] = (booking.startTime || "00:00").split(":").map(Number);
    if (!Number.isNaN(h)) base.setHours(h, Number.isNaN(m) ? 0 : m, 0, 0);
    return base.getTime();
  }

  const requiredMs = new Date(request.requiredDate).getTime();
  if (Number.isNaN(requiredMs)) return null;
  const endOfDay = new Date(requiredMs);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime();
}

export function isSlaBreached(request: DashboardRequest): boolean {
  if (CLOSED_STATUSES.has(request.status)) return false;

  const deadlineMs = resolveDeadlineMs(request);
  if (deadlineMs !== null && Date.now() > deadlineMs) {
    return true;
  }

  if (request.status === "In_Progress" && request.assignedAt) {
    return Date.now() - new Date(request.assignedAt).getTime() > IN_PROGRESS_SLA_MS;
  }

  return false;
}

/** Arabic labels explaining each SLA cell on the card. */
export const SLA_METRIC_HINTS = {
  toApproval: "المدة من إنشاء الطلب حتى موافقة المدير",
  toAssignment: "المدة من الموافقة حتى إسناد الطلب لموظف",
  execution: "المدة من الإسناد حتى الإكمال (أو الوقت المنقضي إن كان قيد التنفيذ)",
  total: "إجمالي عمر الطلب من الإنشاء حتى الآن أو حتى الإكمال",
} as const;

export function formatMeetingDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
