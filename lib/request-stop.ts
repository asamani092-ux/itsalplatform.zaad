/**
 * Client-safe stop/reject helpers — string statuses only (no Prisma imports).
 * Keep in sync with RequestStatus enum values.
 */

export const TERMINAL_STATUSES = [
  "Rejected",
  "Cancelled",
  "Archived",
] as const;

/**
 * Statuses management may cancel (with a required reason).
 * Pending_Manager uses reject instead.
 */
export const CANCELLABLE_STATUSES = [
  "Approved_Pending_Assignment",
  "In_Progress",
  "Pending_Review",
  "Returned",
  "Completed",
] as const;

export function canRejectStatus(status: string): boolean {
  return status === "Pending_Manager";
}

export function canCancelStatus(status: string): boolean {
  return (CANCELLABLE_STATUSES as readonly string[]).includes(status);
}

export function canStopRequest(status: string): boolean {
  return canRejectStatus(status) || canCancelStatus(status);
}
