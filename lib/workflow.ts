import { RequestStatus } from "../generated/prisma/client";

export const ACTIVE_STATUSES: RequestStatus[] = [
  RequestStatus.Approved_Pending_Assignment,
  RequestStatus.In_Progress,
];

export const ARCHIVE_STATUSES: RequestStatus[] = [
  RequestStatus.Completed,
  RequestStatus.Archived,
];

const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.Pending_Manager]: [RequestStatus.Approved_Pending_Assignment],
  [RequestStatus.Approved_Pending_Assignment]: [RequestStatus.In_Progress],
  [RequestStatus.In_Progress]: [RequestStatus.Completed],
  [RequestStatus.Completed]: [RequestStatus.Archived],
  [RequestStatus.Archived]: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: RequestStatus, to: RequestStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`INVALID_TRANSITION: لا يمكن الانتقال من ${from} إلى ${to}`);
  }
}
