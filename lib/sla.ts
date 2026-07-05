export interface SlaMetrics {
  createdToManagerApprovalMs: number | null;
  managerApprovalToAssignmentMs: number | null;
  assignmentToCompletionMs: number | null;
  totalLifecycleMs: number | null;
}

interface SlaTimestamps {
  createdAt: Date;
  managerApprovedAt: Date | null;
  assignedAt: Date | null;
  completedAt: Date | null;
}

function diffMs(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  return end.getTime() - start.getTime();
}

export function calculateSlaMetrics(timestamps: SlaTimestamps): SlaMetrics {
  const { createdAt, managerApprovedAt, assignedAt, completedAt } = timestamps;

  return {
    createdToManagerApprovalMs: diffMs(createdAt, managerApprovedAt),
    managerApprovalToAssignmentMs: diffMs(managerApprovedAt, assignedAt),
    assignmentToCompletionMs: diffMs(assignedAt, completedAt),
    totalLifecycleMs: diffMs(createdAt, completedAt),
  };
}
