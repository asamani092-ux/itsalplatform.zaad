export interface SlaMetrics {
  createdToApprovalMs: number | null;
  approvalToAssignmentMs: number | null;
  assignmentToCompletionMs: number | null;
  totalLifecycleMs: number | null;
}

interface SlaTimestamps {
  createdAt: Date;
  approvedAt: Date | null;
  assignedAt: Date | null;
  completedAt: Date | null;
}

function diffMs(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  return end.getTime() - start.getTime();
}

export function calculateSlaMetrics(timestamps: SlaTimestamps): SlaMetrics {
  const { createdAt, approvedAt, assignedAt, completedAt } = timestamps;

  return {
    createdToApprovalMs: diffMs(createdAt, approvedAt),
    approvalToAssignmentMs: diffMs(approvedAt, assignedAt),
    assignmentToCompletionMs: diffMs(assignedAt, completedAt),
    totalLifecycleMs: diffMs(createdAt, completedAt),
  };
}
