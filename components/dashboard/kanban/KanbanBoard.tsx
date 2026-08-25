"use client";

import { useCallback, useEffect, useState } from "react";
import RequestCard, {
  type CommEmployee,
  type DashboardRequest,
} from "./RequestCard";
import { formatDurationMs } from "@/components/shared/format-sla";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { IconButton } from "@/components/ui/icon-button";
import FilterBar from "@/components/ui/filter-bar";
import SlideOver from "@/components/ui/slide-over";
import { IconRefresh } from "@/components/shared/icons";

type BoardTab = "board" | "archive";

const COLUMNS = [
  {
    id: "approved",
    status: "Approved_Pending_Assignment",
    title: "جديد",
    headerClass: "border-secondary bg-[color-mix(in_srgb,var(--zaad-secondary)_18%,white)]",
    dropTarget: false,
  },
  {
    id: "in_progress",
    status: "In_Progress",
    title: "قيد التنفيذ",
    headerClass: "border-primary bg-[color-mix(in_srgb,var(--zaad-primary)_10%,white)]",
    dropTarget: false,
  },
  {
    id: "completed",
    status: "Completed",
    title: "مكتمل",
    headerClass: "border-[var(--zaad-success)] bg-[var(--zaad-success-bg)]",
    dropTarget: true,
  },
] as const;

export default function KanbanBoard() {
  const [tab, setTab] = useState<BoardTab>("board");
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [archiveRequests, setArchiveRequests] = useState<DashboardRequest[]>([]);
  const [employees, setEmployees] = useState<CommEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropHighlight, setDropHighlight] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [allRes, archiveRes, empRes] = await Promise.all([
        fetch("/api/manager/tickets?view=all"),
        fetch("/api/manager/tickets?view=archive"),
        fetch("/api/manager/team"),
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
        throw new Error(getApiErrorMessage(allPayload, "تعذّر تحميل الطلبات"));
      }
      if (!empRes.ok || !empPayload.success) {
        throw new Error(getApiErrorMessage(empPayload, "تعذّر تحميل الموظفين"));
      }

      setRequests(allPayload.data.requests);
      setArchiveRequests(
        archivePayload.success ? archivePayload.data.requests : [],
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
      const payload = await parseApiResponse<
        DashboardRequest & { request?: DashboardRequest }
      >(response);
      if (!response.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشلت العملية"));
      }
      const updated =
        payload.data?.request ??
        (payload.data?.id && payload.data?.status ? payload.data : null);
      if (updated) {
        setRequests((prev) => {
          const next = prev.filter((r) => r.id !== updated.id);
          if (
            updated.status === "Approved_Pending_Assignment" ||
            updated.status === "In_Progress" ||
            updated.status === "Completed"
          ) {
            if (updated.status !== "Completed" || tab === "board") {
              // keep completed on board until archived view refresh
            }
            next.push(updated);
          }
          return next;
        });
        setArchiveRequests((prev) => {
          if (updated.status === "Archived" || updated.status === "Completed") {
            const without = prev.filter((r) => r.id !== updated.id);
            if (updated.status === "Archived") return [...without, updated];
            return without;
          }
          return prev.filter((r) => r.id !== updated.id);
        });
      } else {
        await loadData();
      }
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

  function handleDropOnCompleted(requestId?: string | null) {
    const id = requestId ?? draggingId;
    if (!id) return;
    const dragged = requests.find((r) => r.id === id);
    if (!dragged || dragged.status !== "In_Progress") {
      setError("يمكن سحب الطلبات قيد التنفيذ فقط إلى عمود مكتمل");
      setDraggingId(null);
      setDropHighlight(null);
      return;
    }
    setDraggingId(null);
    setDropHighlight(null);
    void handleComplete(id);
  }

  const boardRequests = requests.filter(
    (r) =>
      (r.status === "Approved_Pending_Assignment" ||
        r.status === "In_Progress" ||
        r.status === "Completed") &&
      (!query.trim() ||
        r.title.includes(query.trim()) ||
        r.contactEmail.includes(query.trim())),
  );

  const detailRequest = requests.find((r) => r.id === detailId) ?? null;

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

      <div className="tab-bar" role="tablist" aria-label="عرض اللوحة">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "board"}
          data-active={tab === "board" ? "true" : "false"}
          onClick={() => setTab("board")}
        >
          اللوحة
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "archive"}
          data-active={tab === "archive" ? "true" : "false"}
          onClick={() => setTab("archive")}
        >
          الأرشيف ({archiveRequests.length})
        </button>
      </div>

      <FilterBar onClear={() => setQuery("")}>
        <input
          className="input-field w-full sm:max-w-sm"
          placeholder="تصفية بالعنوان أو البريد..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="تصفية الطلبات"
        />
      </FilterBar>

      {error && (
        <div
          className="rounded-lg border border-[var(--zaad-danger)] bg-[var(--zaad-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--zaad-danger)]"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="card flex items-center justify-center gap-3 py-16">
          <div
            className="h-8 w-8 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--zaad-primary)_15%,transparent)]"
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
                    ? "border-primary bg-[color-mix(in_srgb,var(--zaad-primary)_8%,transparent)]"
                    : ""
                }`}
                aria-label={`${column.title} — ${columnRequests.length} بطاقة`}
                onDragOver={(e) => {
                  if (!column.dropTarget) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDropHighlight(column.id);
                }}
                onDragLeave={(e) => {
                  if (!column.dropTarget) return;
                  const next = e.relatedTarget as Node | null;
                  if (next && e.currentTarget.contains(next)) return;
                  setDropHighlight(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!column.dropTarget) return;
                  const fromTransfer = e.dataTransfer.getData("text/plain");
                  handleDropOnCompleted(fromTransfer || draggingId);
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
                      <div key={request.id} className="space-y-1">
                        <RequestCard
                          request={request}
                          employees={employees}
                          onAssign={handleAssign}
                          onReassign={handleReassign}
                          onComplete={handleComplete}
                          onArchive={handleArchive}
                          onDragStart={setDraggingId}
                          busy={busy}
                        />
                        {request.status === "In_Progress" && (
                          <button
                            type="button"
                            className="btn-secondary w-full text-xs lg:hidden"
                            disabled={busy}
                            onClick={() => void handleComplete(request.id)}
                          >
                            نقل إلى مكتمل
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-secondary w-full text-xs"
                          onClick={() => setDetailId(request.id)}
                        >
                          التفاصيل
                        </button>
                      </div>
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
                <th scope="col">الطلب</th>
                <th scope="col">الحالة</th>
                <th scope="col">الموظف</th>
                <th scope="col">SLA إجمالي</th>
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

      <SlideOver
        open={Boolean(detailRequest)}
        title={detailRequest?.title ?? "تفاصيل الطلب"}
        onClose={() => setDetailId(null)}
      >
        {detailRequest && (
          <div className="zad-detail-card space-y-3">
            <p className="text-sm text-brand-gray">{detailRequest.description}</p>
            <dl>
              <div>
                <dt>الحالة</dt>
                <dd>{detailRequest.status}</dd>
              </div>
              <div>
                <dt>القسم</dt>
                <dd>{detailRequest.department?.name ?? "—"}</dd>
              </div>
              <div>
                <dt>نوع الطلب</dt>
                <dd>{detailRequest.requestType?.name ?? "—"}</dd>
              </div>
              <div>
                <dt>مقدّم الطلب</dt>
                <dd dir="ltr">{detailRequest.contactEmail}</dd>
              </div>
              <div>
                <dt>المسند إليه</dt>
                <dd>{detailRequest.assignedEmployee?.name ?? "غير مسند"}</dd>
              </div>
            </dl>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
