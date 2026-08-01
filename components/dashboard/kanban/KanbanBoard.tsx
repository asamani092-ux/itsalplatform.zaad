"use client";

import { useCallback, useEffect, useState } from "react";
import RequestCard, {
  type CommEmployee,
  type DashboardRequest,
} from "./RequestCard";
import { formatDurationMs } from "@/components/shared/format-sla";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { IconButton } from "@/components/ui/icon-button";
import { IconRefresh, IconSend } from "@/components/shared/icons";

type BoardTab = "board" | "archive";

const COLUMNS = [
  {
    id: "approved",
    status: "Approved_Pending_Assignment",
    title: "جديد (معتمد)",
    headerClass: "border-secondary bg-[color-mix(in_srgb,var(--tmkeen-secondary)_18%,white)]",
    dropTarget: false,
  },
  {
    id: "in_progress",
    status: "In_Progress",
    title: "قيد التنفيذ",
    headerClass: "border-primary bg-[color-mix(in_srgb,var(--tmkeen-primary)_10%,white)]",
    dropTarget: false,
  },
  {
    id: "completed",
    status: "Completed",
    title: "مكتمل",
    headerClass: "border-[var(--tmkeen-success)] bg-[var(--tmkeen-success-bg)]",
    dropTarget: true,
  },
] as const;

export default function KanbanBoard() {
  const [tab, setTab] = useState<BoardTab>("board");
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [archiveRequests, setArchiveRequests] = useState<DashboardRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<DashboardRequest[]>([]);
  const [employees, setEmployees] = useState<CommEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropHighlight, setDropHighlight] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [allRes, archiveRes, pendingRes, empRes] = await Promise.all([
        fetch("/api/manager/tickets?view=all"),
        fetch("/api/manager/tickets?view=archive"),
        fetch("/api/manager/tickets?status=Pending_Manager"),
        fetch("/api/manager/team"),
      ]);

      const allPayload = await parseApiResponse<{ requests: DashboardRequest[] }>(
        allRes,
      );
      const archivePayload = await parseApiResponse<{
        requests: DashboardRequest[];
      }>(archiveRes);
      const pendingPayload = await parseApiResponse<{
        requests: DashboardRequest[];
      }>(pendingRes);
      const empPayload = await parseApiResponse<{ employees: CommEmployee[] }>(
        empRes,
      );

      if (!allRes.ok || !allPayload.success) {
        throw new Error(getApiErrorMessage(allPayload, "تعذّر تحميل الطلبات"));
      }
      if (!empRes.ok || !empPayload.success) {
        throw new Error(getApiErrorMessage(empPayload, "تعذّر تحميل الموظفين"));
      }

      setRequests(allPayload.data.requests);
      setArchiveRequests(
        archivePayload.success ? archivePayload.data.requests : [],
      );
      setPendingRequests(
        pendingPayload.success ? pendingPayload.data.requests : [],
      );
      setEmployees(
        empPayload.data.employees.filter((e: CommEmployee) => e.role === "EMPLOYEE"),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "حدث خطأ غير متوقع",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function runAction(action: () => Promise<Response>) {
    setBusy(true);
    setError(null);
    try {
      const response = await action();
      const payload = await parseApiResponse<unknown>(response);
      if (!response.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشلت العملية"));
      }
      await loadData();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "فشلت العملية",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleAssign(requestId: string, employeeId: string) {
    return runAction(() =>
      fetch(`/api/manager/tickets/${requestId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      }),
    );
  }

  function handleReassign(requestId: string, employeeId: string) {
    return runAction(() =>
      fetch(`/api/manager/tickets/${requestId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      }),
    );
  }

  function handleComplete(requestId: string) {
    return runAction(() =>
      fetch(`/api/manager/tickets/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      }),
    );
  }

  function handleArchive(requestId: string) {
    return runAction(() =>
      fetch(`/api/manager/tickets/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Archived" }),
      }),
    );
  }

  function handleResendApproval(requestId: string) {
    return runAction(() =>
      fetch(`/api/manager/tickets/${requestId}/resend-approval`, { method: "POST" }),
    );
  }

  function handleDropOnCompleted() {
    if (!draggingId) return;
    const dragged = requests.find((r) => r.id === draggingId);
    if (!dragged || dragged.status !== "In_Progress") {
      setError("يمكن سحب الطلبات قيد التنفيذ فقط إلى عمود مكتمل");
      setDraggingId(null);
      setDropHighlight(null);
      return;
    }
    setDraggingId(null);
    setDropHighlight(null);
    void handleComplete(draggingId);
  }

  const boardRequests = requests.filter(
    (r) =>
      r.status === "Approved_Pending_Assignment" ||
      r.status === "In_Progress" ||
      r.status === "Completed",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-gray">إسناد ومتابعة SLA — اسحب أو اضغط Enter على البطاقة</p>
        <IconButton
          label={loading ? "جاري التحديث..." : "تحديث اللوحة"}
          icon={<IconRefresh size={18} />}
          tone="primary"
          disabled={loading}
          onClick={() => void loadData()}
        />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="عرض اللوحة">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "board"}
          className={`rounded-lg px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-primary/20 ${
            tab === "board"
              ? "bg-primary text-white"
              : "bg-surface border border-surface-border text-brand-gray"
          }`}
          onClick={() => setTab("board")}
        >
          اللوحة
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "archive"}
          className={`rounded-lg px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-primary/20 ${
            tab === "archive"
              ? "bg-primary text-white"
              : "bg-surface border border-surface-border text-brand-gray"
          }`}
          onClick={() => setTab("archive")}
        >
          الأرشيف ({archiveRequests.length})
        </button>
      </div>

      {tab === "board" && pendingRequests.length > 0 && (
        <section className="space-y-3">
          <div className="card-section">
            <p className="text-sm font-bold text-primary">
              بانتظار موافقة المدير ({pendingRequests.length})
            </p>
            <p className="mt-1 text-xs text-brand-gray">
              لم تصل هذه الطلبات للوحة بعد — تنتظر ضغط المدير على رابط الموافقة.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pendingRequests.map((request) => (
              <article key={request.id} className="card space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-primary">{request.title}</h3>
                  <span className="badge-warning shrink-0 text-[10px]">بانتظار الموافقة</span>
                </div>
                <p className="line-clamp-2 text-xs text-brand-gray">
                  {request.description}
                </p>
                <p className="text-[10px] text-brand-gray">
                  {request.department?.name ?? "—"}
                  {request.requestType ? ` — ${request.requestType.name}` : ""}
                </p>
                <p className="text-[10px] text-brand-gray" dir="ltr">
                  {request.contactEmail}
                </p>
                <button
                  type="button"
                  className="btn-secondary w-full text-xs"
                  disabled={busy}
                  onClick={() => void handleResendApproval(request.id)}
                >
                  <IconSend size={16} />
                  إعادة إرسال رابط الموافقة
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {error && (
        <div
          className="rounded-lg border border-[var(--tmkeen-danger)] bg-[var(--tmkeen-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--tmkeen-danger)]"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="card flex items-center justify-center gap-3 py-16">
          <div
            className="h-8 w-8 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--tmkeen-primary)_15%,transparent)]"
            aria-hidden
          />
          <p className="text-sm text-brand-gray">جاري تحميل اللوحة...</p>
        </div>
      ) : tab === "board" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnRequests = boardRequests.filter(
              (r) => r.status === column.status,
            );

            return (
              <section
                key={column.id}
                className={`flex min-h-[360px] flex-col rounded-xl border-2 border-surface-border bg-surface transition-colors ${
                  dropHighlight === column.id
                    ? "border-primary bg-[color-mix(in_srgb,var(--tmkeen-primary)_8%,transparent)]"
                    : ""
                }`}
                aria-label={`${column.title} — ${columnRequests.length} بطاقة`}
                onDragOver={(e) => {
                  if (!column.dropTarget) return;
                  e.preventDefault();
                  setDropHighlight(column.id);
                }}
                onDragLeave={() => setDropHighlight(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (column.dropTarget) handleDropOnCompleted();
                }}
              >
                <header
                  className={`flex items-center justify-between border-b-2 px-4 py-3 ${column.headerClass}`}
                >
                  <h2 className="text-sm font-bold text-primary">{column.title}</h2>
                  <span className="badge-primary min-w-[2rem] text-center">
                    {columnRequests.length}
                  </span>
                </header>

                <div className="flex-1 space-y-2 p-2">
                  {columnRequests.length === 0 ? (
                    <p className="py-12 text-center text-xs text-brand-gray">لا توجد بطاقات</p>
                  ) : (
                    columnRequests.map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        employees={employees}
                        onAssign={handleAssign}
                        onReassign={handleReassign}
                        onComplete={handleComplete}
                        onArchive={handleArchive}
                        onDragStart={setDraggingId}
                        busy={busy}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="tmkeen-table">
            <thead>
              <tr>
                <th>الطلب</th>
                <th>الحالة</th>
                <th>الموظف</th>
                <th>SLA إجمالي</th>
              </tr>
            </thead>
            <tbody>
              {archiveRequests.map((request) => (
                <tr key={request.id}>
                  <td className="font-semibold text-primary">{request.title}</td>
                  <td>
                    <span className="badge-warning text-xs">
                      {request.status === "Archived" ? "مؤرشف" : "مكتمل"}
                    </span>
                  </td>
                  <td>{request.assignedEmployee?.name ?? "—"}</td>
                  <td className="text-xs font-semibold text-primary">
                    {formatDurationMs(request.sla.totalLifecycleMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
