import { RequestStatus } from "@/generated/prisma/client";

// Time: O(1) — fixed transition map lookup
// Space: O(1) — constant-size map
const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.Pending_Manager]: [RequestStatus.Approved_Pending_Assignment],
  [RequestStatus.Approved_Pending_Assignment]: [RequestStatus.In_Progress],
  [RequestStatus.In_Progress]: [RequestStatus.Completed],
  [RequestStatus.Completed]: [RequestStatus.Archived],
  [RequestStatus.Archived]: [],
};

export function canTransition(
  from: RequestStatus,
  to: RequestStatus
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(
  from: RequestStatus,
  to: RequestStatus
): void {
  if (!canTransition(from, to)) {
    throw new WorkflowError(
      `انتقال غير مسموح: ${from} → ${to}`,
      "INVALID_TRANSITION"
    );
  }
}

export function getAllowedNextStatuses(
  current: RequestStatus
): RequestStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? [];
}

export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: "INVALID_TRANSITION" | "INVALID_STATE"
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

export const ACTIVE_STATUSES: RequestStatus[] = [
  RequestStatus.Approved_Pending_Assignment,
  RequestStatus.In_Progress,
];

export const ARCHIVE_STATUSES: RequestStatus[] = [
  RequestStatus.Completed,
  RequestStatus.Archived,
];

export function isActiveStatus(status: RequestStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function isArchiveStatus(status: RequestStatus): boolean {
  return ARCHIVE_STATUSES.includes(status);
}
