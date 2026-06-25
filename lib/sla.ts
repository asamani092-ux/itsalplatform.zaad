export type SlaTimestamps = {
  createdAt: Date;
  managerApprovedAt: Date | null;
  assignedAt: Date | null;
  completedAt: Date | null;
};

export type SlaMetrics = {
  timeToManagerApprovalMs: number | null;
  timeToAssignmentMs: number | null;
  timeToCompletionMs: number | null;
  totalCycleTimeMs: number | null;
};

function diffMs(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  return end.getTime() - start.getTime();
}

// Time: O(1) — fixed number of timestamp pairs
// Space: O(1) — constant output object
export function calculateSlaMetrics(
  timestamps: SlaTimestamps
): SlaMetrics {
  const { createdAt, managerApprovedAt, assignedAt, completedAt } = timestamps;

  return {
    timeToManagerApprovalMs: diffMs(createdAt, managerApprovedAt),
    timeToAssignmentMs: diffMs(managerApprovedAt, assignedAt),
    timeToCompletionMs: diffMs(assignedAt, completedAt),
    totalCycleTimeMs: diffMs(createdAt, completedAt),
  };
}
