import { formatDurationMs, formatElapsedSince } from "@/components/shared/format-sla";
import AvatarGroup from "@/components/ui/avatar-group";
import { formatMeetingDate, isSlaBreached, SLA_METRIC_HINTS } from "./sla-utils";
import { IconArchive, IconCheck } from "@/components/shared/icons";
import StatusBadge from "@/components/shared/status-badge";
import { canCancelStatus } from "@/lib/request-stop";
import { formatTime12h, formatTimeRange12h } from "@/lib/hospitality/format-time";

export interface SlaMetrics {
  createdToApprovalMs: number | null;
  approvalToAssignmentMs: number | null;
  assignmentToCompletionMs: number | null;
  totalLifecycleMs: number | null;
}

export interface AssignedEmployee {
  id: string;
  name: string;
  email: string;
}

export interface DashboardRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  requiredDate: string;
  contactName?: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  approvedAt: string | null;
  assignedAt: string | null;
  completedAt: string | null;
  completionDeclaredAt?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  reviewNote?: string | null;
  employeeNote?: string | null;
  proofFileUrl?: string | null;
  assignedEmployee: AssignedEmployee | null;
  department?: { name: string };
  requestType?: { name: string; slug?: string };
  hospitalityBooking?: {
    roomName: string;
    meetingDate: string;
    startTime: string;
    endTime: string;
    attendeesCount?: number;
  } | null;
  sla: SlaMetrics;
  statusHistory?: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    changedAt: string;
  }>;
}

export interface CommEmployee {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface RequestCardProps {
  request: DashboardRequest;
  employees: CommEmployee[];
  onAssign: (requestId: string, employeeId: string) => Promise<void>;
  onReassign: (requestId: string, employeeId: string) => Promise<void>;
  onApproveCompletion: (requestId: string) => Promise<void>;
  onReturn: (requestId: string) => void;
  onCancel: (requestId: string) => void;
  onArchive: (requestId: string) => Promise<void>;
  busy: boolean;
}

export default function RequestCard({
  request,
  employees,
  onAssign,
  onReassign,
  onApproveCompletion,
  onReturn,
  onCancel,
  onArchive,
  busy,
}: RequestCardProps) {
  const isNew = request.status === "Approved_Pending_Assignment";
  const isReturned = request.status === "Returned";
  const isActive = request.status === "In_Progress" || isReturned;
  const isReview = request.status === "Pending_Review";
  const isDone = request.status === "Completed";
  const isRejected = request.status === "Rejected";
  const isCancelled = request.status === "Cancelled";
  const slaBreached = isSlaBreached(request);
  const showCancel = canCancelStatus(request.status);

  const cancelButton = showCancel ? (
    <button
      type="button"
      className="btn-secondary w-full border-[var(--zaad-danger)] text-xs text-[var(--zaad-danger)]"
      disabled={busy}
      onClick={() => onCancel(request.id)}
    >
      رفض / إلغاء الطلب
    </button>
  ) : null;

  return (
    <article
      className={`card space-y-2 p-3 shadow-sm transition-shadow hover:shadow-md ${
        slaBreached ? "border-[var(--zaad-danger)] bg-[var(--zaad-danger-bg)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-primary">{request.title}</h3>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={request.status} />
          {isReturned && (
            <span className="badge-warning text-[10px]">معاد للموظف</span>
          )}
          {slaBreached && (
            <span className="badge-danger text-[10px]">متأخر</span>
          )}
        </div>
      </div>

      <p className="line-clamp-2 text-xs text-brand-gray">{request.description}</p>

      {request.department && (
        <p className="text-[10px] text-brand-gray">
          {request.department.name}
          {request.requestType ? ` — ${request.requestType.name}` : ""}
        </p>
      )}

      {request.hospitalityBooking && (
        <p className="rounded-md bg-surface-muted px-2 py-1 text-[11px] text-primary">
          {request.hospitalityBooking.roomName}
          {" · "}
          {formatMeetingDate(request.hospitalityBooking.meetingDate)}
          {" · "}
          <span dir="ltr">
            {formatTimeRange12h(request.hospitalityBooking.startTime, request.hospitalityBooking.endTime)}
          </span>
        </p>
      )}

      {request.assignedEmployee && (
        <AvatarGroup names={[request.assignedEmployee.name]} />
      )}

      {request.employeeNote && isNew && (
        <p className="rounded-md bg-surface-muted p-2 text-[11px] text-brand-gray">
          ملاحظة الموظف: {request.employeeNote}
        </p>
      )}

      <div
        className={`grid grid-cols-2 gap-1 rounded-lg p-2 text-[10px] ${
          slaBreached ? "bg-surface" : "bg-surface-muted"
        }`}
        aria-label="مؤشرات زمن معالجة الطلب"
      >
        <div title={SLA_METRIC_HINTS.toApproval}>
          <p className="text-brand-gray">حتى الموافقة</p>
          <p className="font-semibold text-primary">
            {formatDurationMs(request.sla.createdToApprovalMs)}
          </p>
        </div>
        <div title={SLA_METRIC_HINTS.toAssignment}>
          <p className="text-brand-gray">حتى الإسناد</p>
          <p className="font-semibold text-primary">
            {formatDurationMs(request.sla.approvalToAssignmentMs)}
          </p>
        </div>
        <div title={SLA_METRIC_HINTS.execution}>
          <p className="text-brand-gray">تنفيذ</p>
          <p className={`font-semibold ${slaBreached ? "text-[var(--zaad-danger)]" : "text-primary"}`}>
            {request.completedAt
              ? formatDurationMs(request.sla.assignmentToCompletionMs)
              : formatElapsedSince(request.assignedAt)}
          </p>
        </div>
        <div title={SLA_METRIC_HINTS.total}>
          <p className="text-brand-gray">الإجمالي</p>
          <p className="font-semibold text-secondary-dark">
            {request.completedAt
              ? formatDurationMs(request.sla.totalLifecycleMs)
              : formatElapsedSince(request.createdAt)}
          </p>
        </div>
      </div>
      {slaBreached && (
        <p className="text-[10px] text-[var(--zaad-danger)]">
          متأخر عن الموعد المطلوب
          {request.hospitalityBooking
            ? ` (موعد الحجز: ${formatMeetingDate(request.hospitalityBooking.meetingDate)} ${formatTime12h(request.hospitalityBooking.startTime)})`
            : ""}
        </p>
      )}

      {isNew && (
        <div className="space-y-1">
          <label className="label-field text-xs" htmlFor={`assign-${request.id}`}>
            إسناد لموظف
          </label>
          <select
            id={`assign-${request.id}`}
            className="input-field text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
            defaultValue=""
            disabled={busy}
            aria-label={`إسناد ${request.title}`}
            onChange={(e) => {
              const employeeId = e.target.value;
              if (employeeId) void onAssign(request.id, employeeId);
              e.target.value = "";
            }}
          >
            <option value="">اختر موظفاً...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
          {cancelButton}
        </div>
      )}

      {isActive && (
        <div className="space-y-2">
          {isReturned && request.reviewNote && (
            <p className="rounded-md bg-[var(--zaad-warning-bg,#fdf6e3)] p-2 text-[11px] text-[var(--zaad-warning,#9a7b0a)]">
              ملاحظة الإرجاع: {request.reviewNote}
            </p>
          )}
          {request.assignedEmployee && (
            <p className="text-xs text-brand-gray">
              المسؤول:{" "}
              <span className="font-semibold text-primary">
                {request.assignedEmployee.name}
              </span>
            </p>
          )}
          <select
            className="input-field text-xs focus-visible:ring-2 focus-visible:ring-primary/20"
            defaultValue=""
            disabled={busy}
            aria-label={`إعادة إسناد ${request.title}`}
            onChange={(e) => {
              const employeeId = e.target.value;
              if (employeeId) void onReassign(request.id, employeeId);
              e.target.value = "";
            }}
          >
            <option value="">إعادة إسناد...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-brand-gray">
            بانتظار إعلان الانتهاء من الموظف.
          </p>
          {cancelButton}
        </div>
      )}

      {isReview && (
        <div className="space-y-2">
          <button
            type="button"
            className="btn-recommend w-full text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
            disabled={busy}
            onClick={() => void onApproveCompletion(request.id)}
          >
            <IconCheck size={16} />
            اعتماد الإكمال
          </button>
          <button
            type="button"
            className="btn-secondary w-full border-[var(--zaad-danger)] text-xs text-[var(--zaad-danger)]"
            disabled={busy}
            onClick={() => onReturn(request.id)}
          >
            إرجاع للموظف
          </button>
          {cancelButton}
        </div>
      )}

      {isDone && (
        <div className="space-y-2">
          <button
            type="button"
            className="btn-secondary w-full text-xs focus-visible:ring-2 focus-visible:ring-primary/20"
            disabled={busy}
            onClick={() => void onArchive(request.id)}
          >
            <IconArchive size={16} />
            نقل للأرشيف
          </button>
          {cancelButton}
        </div>
      )}

      {isRejected && request.rejectionReason && (
        <p className="rounded-md bg-[var(--zaad-danger-bg)] p-2 text-[11px] text-[var(--zaad-danger)]">
          سبب الرفض: {request.rejectionReason}
        </p>
      )}

      {isCancelled && request.cancellationReason && (
        <p className="rounded-md bg-[var(--zaad-danger-bg)] p-2 text-[11px] text-[var(--zaad-danger)]">
          سبب الإلغاء: {request.cancellationReason}
        </p>
      )}
    </article>
  );
}
