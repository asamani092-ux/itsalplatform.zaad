"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import RequestCard, {
  type CommEmployee,
  type DashboardRequest,
} from "./RequestCard";
import { formatDurationMs } from "@/components/shared/format-sla";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";

type BoardTab = "board" | "archive";

const COLUMNS = [
  {
    id: "approved",
    status: "Approved_Pending_Assignment",
    title: "جديد (معتمد)",
    dropTarget: false,
  },
  {
    id: "in_progress",
    status: "In_Progress",
    title: "قيد التنفيذ",
    dropTarget: false,
  },
  {
    id: "completed",
    status: "Completed",
    title: "مكتمل",
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
        empPayload.data.employees.filter((e) => e.role === "EMPLOYEE"),
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
    <div className="min-h-screen">
      <header className="border-b border-surface-border bg-surface px-4 py-3">
        <h1 className="text-lg font-bold text-primary">لوحة Kanban</h1>
        <p className="text-xs text-brand-gray">إسناد ومتابعة الطلبات</p>
      </header>

      <div className="page-container space-y-6 py-6">
        <div className="flex flex-wrap gap-2">
          <Link href="/submit/communications" className="btn-secondary text-sm">
            نموذج عام
          </Link>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={loading}
            onClick={() => void loadData()}
          >
            تحديث
          </button>
        </div>

        <div className="tab-bar max-w-md">
          <button
            type="button"
            className={tab === "board" ? "active" : ""}
            data-active={tab === "board" ? "true" : undefined}
            onClick={() => setTab("board")}
          >
            اللوحة
          </button>
          <button
            type="button"
            className={tab === "archive" ? "active" : ""}
            data-active={tab === "archive" ? "true" : undefined}
            onClick={() => setTab("archive")}
          >
            الأرشيف ({archiveRequests.length})
          </button>
        </div>

        {pendingRequests.length > 0 && tab === "board" && (
          <div className="card-section space-y-3">
            <h2 className="text-sm font-bold text-primary">
              بانتظار موافقة المدير ({pendingRequests.length})
            </h2>
          </div>
        )}

        {error && (
          <div
            className="rounded-lg border border-[var(--zaad-danger)] bg-[var(--zaad-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--zaad-danger)]"
            role="alert"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="card py-12 text-center text-sm text-brand-gray">
            جاري تحميل اللوحة...
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
                  className={`min-h-[320px] rounded-xl border-2 p-3 transition-colors ${
                    dropHighlight === column.id
                      ? "border-primary bg-[color-mix(in_srgb,var(--zaad-primary)_8%,transparent)]"
                      : "border-surface-border bg-surface-muted"
                  }`}
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
                  <header className="mb-3 flex items-center justify-between px-1">
                    <h2 className="text-sm font-bold text-primary">
                      {column.title}
                    </h2>
                    <span className="badge-primary">{columnRequests.length}</span>
                  </header>

                  <div className="space-y-3">
                    {columnRequests.length === 0 ? (
                      <p className="py-8 text-center text-xs text-brand-gray">
                        لا توجد بطاقات
                      </p>
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
            <table className="zaad-table">
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
    </div>
  );
}
