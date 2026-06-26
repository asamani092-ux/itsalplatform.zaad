import { formatDurationMs, formatElapsedSince } from "./format-sla";

export interface SlaMetrics {
  createdToManagerApprovalMs: number | null;
  managerApprovalToAssignmentMs: number | null;
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
  managerApprovedAt: string | null;
  assignedAt: string | null;
  completedAt: string | null;
  assignedEmployee: AssignedEmployee | null;
  sla: SlaMetrics;
}

export interface CommEmployee {
  id: string;
  name: string;
  email: string;
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

  return (
    <article
      className="card space-y-3 p-4 shadow-sm transition-shadow hover:shadow-md"
      draggable={isActive}
      onDragStart={() => onDragStart(request.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-primary">{request.title}</h3>
        {isActive && (
          <span className="badge-primary shrink-0 text-[10px]">اسحب →</span>
        )}
      </div>

      <p className="line-clamp-2 text-xs text-brand-gray">{request.description}</p>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-muted p-2 text-[11px]">
        <div>
          <p className="text-brand-gray">موافقة المدير</p>
          <p className="font-semibold text-primary">
            {formatDurationMs(request.sla.createdToManagerApprovalMs)}
          </p>
        </div>
        <div>
          <p className="text-brand-gray">حتى الإسناد</p>
          <p className="font-semibold text-primary">
            {formatDurationMs(request.sla.managerApprovalToAssignmentMs)}
          </p>
        </div>
        <div>
          <p className="text-brand-gray">تنفيذ</p>
          <p className="font-semibold text-primary">
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

      <p className="text-[11px] text-brand-gray" dir="ltr">
        {request.contactEmail}
      </p>

      {isNew && (
        <div className="space-y-1">
          <label className="label-field text-xs" htmlFor={`assign-${request.id}`}>
            إسناد لموظف
          </label>
          <select
            id={`assign-${request.id}`}
            className="input-field text-sm"
            defaultValue=""
            disabled={busy}
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
          <div className="space-y-1">
            <label
              className="label-field text-xs"
              htmlFor={`reassign-${request.id}`}
            >
              إعادة إسناد
            </label>
            <select
              id={`reassign-${request.id}`}
              className="input-field text-sm"
              defaultValue=""
              disabled={busy}
              onChange={(e) => {
                const employeeId = e.target.value;
                if (employeeId) void onReassign(request.id, employeeId);
                e.target.value = "";
              }}
            >
              <option value="">اختر موظفاً آخر...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn-recommend w-full text-sm"
            disabled={busy}
            onClick={() => void onComplete(request.id)}
          >
            وضع علامة مكتمل
          </button>
        </div>
      )}

      {isDone && (
        <div className="flex flex-col gap-2">
          <span className="badge-success text-center">مكتمل</span>
          <button
            type="button"
            className="btn-secondary w-full text-xs"
            disabled={busy}
            onClick={() => void onArchive(request.id)}
          >
            نقل للأرشيف
          </button>
        </div>
      )}
    </article>
  );
}
