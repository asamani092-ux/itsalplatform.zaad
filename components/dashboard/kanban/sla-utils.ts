import type { DashboardRequest } from "./RequestCard";

const IN_PROGRESS_SLA_MS = 72 * 60 * 60 * 1000;

export function isSlaBreached(request: DashboardRequest): boolean {
  if (request.status === "Completed" || request.status === "Archived") {
    return false;
  }

  const requiredMs = new Date(request.requiredDate).getTime();
  if (!Number.isNaN(requiredMs) && Date.now() > requiredMs) {
    return true;
  }

  if (request.status === "In_Progress" && request.assignedAt) {
    return Date.now() - new Date(request.assignedAt).getTime() > IN_PROGRESS_SLA_MS;
  }

  return false;
}
