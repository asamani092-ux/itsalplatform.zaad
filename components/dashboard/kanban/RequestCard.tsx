import { formatDurationMs, formatElapsedSince } from "@/components/shared/format-sla";
import { isSlaBreached } from "./sla-utils";

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
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  approvedAt: string | null;
  assignedAt: string | null;
  completedAt: string | null;
  assignedEmployee: AssignedEmployee | null;
  department?: { name: string };
  requestType?: { name: string };
  sla: SlaMetrics;
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
  onComplete: (requestId: string) => Promise<void>;
  onArchive: (requestId: string) => Promise<void>;
  onDragStart: (requestId: string) => void;
  busy: boolean;
}

export default function RequestCard({
  request,
  employees,
  onAssign,
  onReassign,
  onComplete,
  onArchive,
  onDragStart,
  busy,
}: RequestCardProps) {
  const isNew = request.status === "Approved_Pending_Assignment";
  const isActive = request.status === "In_Progress";
  const isDone = request.status === "Completed";
  const slaBreached = isSlaBreached(request);

  function handleCardKeyDown(event: React.KeyboardEvent) {
    if (!isActive || busy) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void onComplete(request.id);
    }
  }

  return (
    <article
      className={`card space-y-2 p-3 shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-primary/30 ${
        slaBreached ? "border-[var(--tmkeen-danger)] bg-[var(--tmkeen-danger-bg)]" : ""
      }`}
      draggable={isActive}
      tabIndex={isActive ? 0 : undefined}
      role={isActive ? "button" : undefined}
      aria-label={
        isActive
          ? `${request.title} — اضغط Enter للإكمال أو اسحب إلى عمود مكتمل`
          : request.title
      }
      onDragStart={() => onDragStart(request.id)}
      onKeyDown={handleCardKeyDown}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-primary">{request.title}</h3>
        {slaBreached && (
          <span className="badge-danger shrink-0 text-[10px]">تجاوز SLA</span>
        )}
        {isActive && !slaBreached && (
          <span className="badge-primary shrink-0 text-[10px]">اسحب →</span>
        )}
      </div>

      <p className="line-clamp-2 text-xs text-brand-gray">{request.description}</p>

      {request.department && (
        <p className="text-[10px] text-brand-gray">
          {request.department.name}
          {request.requestType ? ` — ${request.requestType.name}` : ""}
        </p>
      )}

      <div
        className={`grid grid-cols-2 gap-1 rounded-lg p-2 text-[10px] ${
          slaBreached ? "bg-surface" : "bg-surface-muted"
        }`}
      >
        <div>
          <p className="text-brand-gray">حتى الموافقة</p>
          <p className="font-semibold text-primary">
            {formatDurationMs(request.sla.createdToApprovalMs)}
          </p>
        </div>
        <div>
          <p className="text-brand-gray">حتى الإسناد</p>
          <p className="font-semibold text-primary">
            {formatDurationMs(request.sla.approvalToAssignmentMs)}
          </p>
        </div>
        <div>
          <p className="text-brand-gray">تنفيذ</p>
          <p className={`font-semibold ${slaBreached ? "text-[var(--tmkeen-danger)]" : "text-primary"}`}>
            {request.completedAt
              ? formatDurationMs(request.sla.assignmentToCompletionMs)
              : formatElapsedSince(request.assignedAt)}
          </p>
        </div>
        <div>
          <p className="text-brand-gray">الإجمالي</p>
          <p className="font-semibold text-secondary-dark">
            {request.completedAt
              ? formatDurationMs(request.sla.totalLifecycleMs)
              : formatElapsedSince(request.createdAt)}
          </p>
        </div>
      </div>

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
        </div>
      )}

      {isActive && (
        <div className="space-y-2">
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
          <button
            type="button"
            className="btn-recommend w-full text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
            disabled={busy}
            onClick={() => void onComplete(request.id)}
          >
            وضع علامة مكتمل
          </button>
        </div>
      )}

      {isDone && (
        <button
          type="button"
          className="btn-secondary w-full text-xs focus-visible:ring-2 focus-visible:ring-primary/20"
          disabled={busy}
          onClick={() => void onArchive(request.id)}
        >
          نقل للأرشيف
        </button>
      )}
    </article>
  );
}
