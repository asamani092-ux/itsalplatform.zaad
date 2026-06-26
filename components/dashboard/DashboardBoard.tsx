"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import RequestCard, {
  type CommEmployee,
  type DashboardRequest,
} from "./RequestCard";
import { formatDurationMs } from "./format-sla";
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

export default function DashboardBoard() {
  const [tab, setTab] = useState<BoardTab>("board");
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [archiveRequests, setArchiveRequests] = useState<DashboardRequest[]>([]);
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
      const [allRes, archiveRes, empRes] = await Promise.all([
        fetch("/api/dashboard/requests?view=all"),
        fetch("/api/dashboard/requests?view=archive"),
        fetch("/api/employees"),
      ]);

      const allPayload = await parseApiResponse<{ requests: DashboardRequest[] }>(
        allRes,
      );
      const archivePayload = await parseApiResponse<{
        requests: DashboardRequest[];
      }>(archiveRes);
      const empPayload = await parseApiResponse<{ employees: CommEmployee[] }>(
        empRes,
      );

      if (!allRes.ok || !allPayload.success) {
        throw new Error(
          getApiErrorMessage(allPayload, "تعذّر تحميل الطلبات"),
        );
      }
      if (!empRes.ok || !empPayload.success) {
        throw new Error(
          getApiErrorMessage(empPayload, "تعذّر تحميل الموظفين"),
        );
      }

      setRequests(allPayload.data.requests);
      setArchiveRequests(
        archivePayload.success ? archivePayload.data.requests : [],
      );
      setEmployees(empPayload.data.employees);
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
      fetch(`/api/dashboard/requests/${requestId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, assignedBy: "dashboard" }),
      }),
    );
  }

  function handleReassign(requestId: string, employeeId: string) {
    return runAction(() =>
      fetch(`/api/dashboard/requests/${requestId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, assignedBy: "dashboard" }),
      }),
    );
  }

  function handleComplete(requestId: string) {
    return runAction(() =>
      fetch(`/api/dashboard/requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed", changedBy: "dashboard" }),
      }),
    );
  }

  function handleArchive(requestId: string) {
    return runAction(() =>
      fetch(`/api/dashboard/requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Archived", changedBy: "dashboard" }),
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

  const kpiNew = boardRequests.filter(
    (r) => r.status === "Approved_Pending_Assignment",
  ).length;
  const kpiActive = boardRequests.filter(
    (r) => r.status === "In_Progress",
  ).length;
  const kpiDone = boardRequests.filter((r) => r.status === "Completed").length;

  return (
    <div className="page-shell min-h-screen">
      <header className="border-b border-surface-border bg-surface shadow-sm">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <Link href="/" className="text-lg font-bold text-primary">
              جمعية الزاد — الاتصال المؤسسي
            </Link>
            <p className="text-xs text-brand-gray">لوحة إدارة الطلبات</p>
          </div>
          <div className="flex gap-2">
            <Link href="/submit" className="btn-secondary text-sm">
              تقديم طلب
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
        </div>
      </header>

      <main className="page-container space-y-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary">{kpiNew}</p>
            <p className="text-sm text-brand-gray">جديد (معتمد)</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary">{kpiActive}</p>
            <p className="text-sm text-brand-gray">قيد التنفيذ</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary">{kpiDone}</p>
            <p className="text-sm text-brand-gray">مكتمل</p>
          </div>
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

                  {column.dropTarget && (
                    <p className="mt-3 text-center text-[10px] text-brand-gray">
                      أسقط بطاقة «قيد التنفيذ» هنا للإكمال
                    </p>
                  )}
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
                {archiveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-brand-gray">
                      الأرشيف فارغ
                    </td>
                  </tr>
                ) : (
                  archiveRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="font-semibold text-primary">
                        {request.title}
                      </td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
