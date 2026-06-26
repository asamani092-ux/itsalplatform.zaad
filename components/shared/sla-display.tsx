import type { SlaMetrics } from "@/lib/sla";
import { formatDurationMs, formatElapsedSince } from "./format-sla";

interface SlaDisplayProps {
  sla: SlaMetrics;
  createdAt: string;
  assignedAt: string | null;
  completedAt: string | null;
  compact?: boolean;
}

export default function SlaDisplay({
  sla,
  createdAt,
  assignedAt,
  completedAt,
  compact = false,
}: SlaDisplayProps) {
  if (compact) {
    return (
      <p className="text-xs font-semibold text-primary">
        {completedAt
          ? formatDurationMs(sla.totalLifecycleMs)
          : formatElapsedSince(createdAt)}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-muted p-2 text-[11px]">
      <div>
        <p className="text-brand-gray">حتى الموافقة</p>
        <p className="font-semibold text-primary">
          {formatDurationMs(sla.createdToApprovalMs)}
        </p>
      </div>
      <div>
        <p className="text-brand-gray">حتى الإسناد</p>
        <p className="font-semibold text-primary">
          {formatDurationMs(sla.approvalToAssignmentMs)}
        </p>
      </div>
      <div>
        <p className="text-brand-gray">تنفيذ</p>
        <p className="font-semibold text-primary">
          {completedAt
            ? formatDurationMs(sla.assignmentToCompletionMs)
            : formatElapsedSince(assignedAt)}
        </p>
      </div>
      <div>
        <p className="text-brand-gray">الإجمالي</p>
        <p className="font-semibold text-secondary-dark">
          {completedAt
            ? formatDurationMs(sla.totalLifecycleMs)
            : formatElapsedSince(createdAt)}
        </p>
      </div>
    </div>
  );
}
