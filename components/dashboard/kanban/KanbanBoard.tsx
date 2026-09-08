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
import { IconRefresh, IconSend } from "@/components/shared/icons";
import StatusBadge from "@/components/shared/status-badge";

type BoardTab = "board" | "rejected" | "archive";

const COLUMNS = [
  {
    id: "approved",
    status: "Approved_Pending_Assignment",
    title: "جديد",
    headerClass:
      "border-secondary bg-[color-mix(in_srgb,var(--zaad-secondary)_18%,white)]",
  },
  {
    id: "in_progress",
    status: "In_Progress",
    title: "قيد التنفيذ",
    headerClass:
      "border-primary bg-[color-mix(in_srgb,var(--zaad-primary)_10%,white)]",
  },
  {
    id: "pending_review",
    status: "Pending_Review",
    title: "بانتظار المراجعة",
    headerClass:
      "border-[var(--zaad-warning,#c9a227)] bg-[color-mix(in_srgb,var(--zaad-secondary)_12%,white)]",
  },
  {
    id: "completed",
    status: "Completed",
    title: "مكتمل",
    headerClass: "border-[var(--zaad-success)] bg-[var(--zaad-success-bg)]",
  },
] as const;

export default function KanbanBoard() {
  const [tab, setTab] = useState<BoardTab>("board");
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [archiveRequests, setArchiveRequests] = useState<DashboardRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<DashboardRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<DashboardRequest[]>([]);
  const [employees, setEmployees] = useState<CommEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailExtra, setDetailExtra] = useState<DashboardRequest | null>(null);
  const [returnModalId, setReturnModalId] = useState<string | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadData = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    setError(null);

    try {
      const [allRes, archiveRes, rejectedRes, pendingRes, empRes] = await Promise.all([
        fetch("/api/manager/tickets?view=all"),
        fetch("/api/manager/tickets?view=archive"),
        fetch("/api/manager/tickets?status=Rejected"),
        fetch("/api/manager/tickets?status=Pending_Manager"),
        fetch("/api/manager/team"),
      ]);

      const allPayload = await parseApiResponse<{ requests: DashboardRequest[] }>(
        allRes,
      );
      const archivePayload = await parseApiResponse<{
        requests: DashboardRequest[];
      }>(archiveRes);
      const rejectedPayload = await parseApiResponse<{
        requests: DashboardRequest[];
      }>(rejectedRes);
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
      setRejectedRequests(
        rejectedPayload.success ? rejectedPayload.data.requests : [],
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
      if (!opts?.soft) setLoading(false);
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
      const updated = payload.data.request ?? payload.data;
      if (updated?.id) {
        const patch = (list: DashboardRequest[]) =>
          list.map((r) => (r.id === updated.id ? { ...r, ...updated } : r));
        setRequests(patch);
        setArchiveRequests(patch);
        setRejectedRequests(patch);
        setPendingRequests(patch);
        setDetailExtra((prev) =>
          prev?.id === updated.id ? { ...prev, ...updated } : prev,
        );
      }
      await loadData({ soft: true });
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

  function handleApproveCompletion(requestId: string) {
    return runAction(() =>
      fetch(`/api/manager/tickets/${requestId}/approve-completion`, {
        method: "POST",
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

  function handleApprovePending(requestId: string) {
    return runAction(() =>
      fetch(`/api/manager/tickets/${requestId}/approve`, { method: "POST" }),
    );
  }

  function handleRejectPending() {
    if (!rejectTargetId || rejectReason.trim().length < 3) {
      setError("سبب الرفض مطلوب (3 أحرف على الأقل)");
      return Promise.resolve();
    }
    const id = rejectTargetId;
    const reason = rejectReason.trim();
    return runAction(() =>
      fetch(`/api/manager/tickets/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    ).then(() => {
      setRejectTargetId(null);
      setRejectReason("");
    });
  }

  function submitReturn() {
    if (!returnModalId || !returnNote.trim()) {
      setError("ملاحظة الإرجاع مطلوبة");
      return;
    }
    const id = returnModalId;
    const note = returnNote.trim();
    setReturnModalId(null);
    setReturnNote("");
    void runAction(() =>
      fetch(`/api/manager/tickets/${id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNote: note }),
      }),
    );
  }

  async function openDetail(id: string) {
    setDetailId(id);
    setDetailExtra(null);
    try {
      const res = await fetch(`/api/manager/tickets?view=all`);
      // Prefer dedicated detail when available — fall back to list row.
      const fromList =
        requests.find((r) => r.id === id) ??
        rejectedRequests.find((r) => r.id === id) ??
        archiveRequests.find((r) => r.id === id) ??
        null;
      setDetailExtra(fromList);
      void res;
    } catch {
      setDetailExtra(requests.find((r) => r.id === id) ?? null);
    }
  }

  const matchesQuery = (r: DashboardRequest) =>
    !query.trim() ||
    r.title.includes(query.trim()) ||
    r.contactEmail.includes(query.trim());

  const boardRequests = requests.filter(
    (r) =>
      (r.status === "Approved_Pending_Assignment" ||
        r.status === "In_Progress" ||
        r.status === "Pending_Review" ||
        r.status === "Completed") &&
      matchesQuery(r),
  );

  const detailRequest =
    detailExtra ??
    requests.find((r) => r.id === detailId) ??
    rejectedRequests.find((r) => r.id === detailId) ??
    null;

  const notesTimeline: Array<{ label: string; text: string }> = [];
  if (detailRequest?.rejectionReason) {
    notesTimeline.push({ label: "سبب الرفض", text: detailRequest.rejectionReason });
  }
  if (detailRequest?.reviewNote) {
    notesTimeline.push({ label: "ملاحظة الإرجاع", text: detailRequest.reviewNote });
  }
  if (detailRequest?.employeeNote) {
    notesTimeline.push({
      label: "ملاحظة الموظف",
      text: detailRequest.employeeNote,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-gray">
          بعد إعلان الموظف للانتهاء تظهر التذكرة في «بانتظار المراجعة» لاعتمادها أو
          إرجاعها.
        </p>
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
          aria-selected={tab === "rejected"}
          data-active={tab === "rejected" ? "true" : "false"}
          onClick={() => setTab("rejected")}
        >
          مرفوضة ({rejectedRequests.length})
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

      {tab === "board" && pendingRequests.length > 0 && (
        <section className="space-y-3">
          <div className="card-section">
            <p className="text-sm font-bold text-primary">
              بانتظار موافقة المدير ({pendingRequests.length})
            </p>
            <p className="mt-1 text-xs text-brand-gray">
              يمكن الموافقة أو الرفض مباشرة من المنصة — أو إعادة إرسال رابط البريد.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pendingRequests.filter(matchesQuery).map((request) => (
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
                <div className="grid gap-2">
                  <button
                    type="button"
                    className="btn-primary w-full text-xs"
                    disabled={busy}
                    onClick={() => void handleApprovePending(request.id)}
                  >
                    موافقة
                  </button>
                  <button
                    type="button"
                    className="btn-secondary w-full border-[var(--zaad-danger)] text-xs text-[var(--zaad-danger)]"
                    disabled={busy}
                    onClick={() => {
                      setRejectTargetId(request.id);
                      setRejectReason("");
                      setError(null);
                    }}
                  >
                    رفض مع سبب
                  </button>
                  <button
                    type="button"
                    className="btn-secondary w-full text-xs"
                    disabled={busy}
                    onClick={() => void handleResendApproval(request.id)}
                  >
                    <IconSend size={16} />
                    إعادة إرسال رابط الموافقة
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {rejectTargetId && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectTargetId(null);
          }}
        >
          <div className="modal-panel card space-y-4">
            <h3 className="text-lg font-bold text-primary">رفض الطلب</h3>
            <p className="text-sm text-brand-gray">
              سيُرسل سبب الرفض إلى بريد مقدّم الطلب.
            </p>
            <div className="space-y-1">
              <label className="label-field" htmlFor="kanban-reject-reason">
                سبب الرفض
              </label>
              <textarea
                id="kanban-reject-reason"
                className="input-field min-h-24 w-full"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="اكتب سبب الرفض..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary border-[var(--zaad-danger)] text-sm text-[var(--zaad-danger)]"
                disabled={busy}
                onClick={() => void handleRejectPending()}
              >
                تأكيد الرفض
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={busy}
                onClick={() => setRejectTargetId(null)}
              >
                إلغاء
              </button>
            </div>
          </div>
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
        <div className="card flex items-center justify-center gap-3 py-16">
          <div
            className="h-8 w-8 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--zaad-primary)_15%,transparent)]"
            aria-hidden
          />
          <p className="text-sm text-brand-gray">جاري تحميل اللوحة...</p>
        </div>
      ) : tab === "board" ? (
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-2 lg:overflow-visible xl:grid-cols-4">
          {COLUMNS.map((column) => {
            const columnRequests = boardRequests.filter(
              (r) => r.status === column.status,
            );

            return (
              <section
                key={column.id}
                className="flex max-h-[70vh] min-h-[360px] w-[85vw] max-w-sm shrink-0 flex-col rounded-xl border-2 border-surface-border bg-surface sm:w-72 lg:w-auto lg:max-w-none"
                aria-label={`${column.title} — ${columnRequests.length} بطاقة`}
              >
                <header
                  className={`flex items-center justify-between border-b-2 px-4 py-3 ${column.headerClass}`}
                >
                  <h2 className="text-sm font-bold text-primary">{column.title}</h2>
                  <span className="badge-primary min-w-[2rem] text-center">
                    {columnRequests.length}
                  </span>
                </header>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                  {columnRequests.length === 0 ? (
                    <p className="py-12 text-center text-xs text-brand-gray">
                      لا توجد بطاقات
                    </p>
                  ) : (
                    columnRequests.map((request) => (
                      <div key={request.id} className="space-y-1">
                        <RequestCard
                          request={request}
                          employees={employees}
                          onAssign={handleAssign}
                          onReassign={handleReassign}
                          onApproveCompletion={handleApproveCompletion}
                          onReturn={(id) => {
                            setReturnModalId(id);
                            setReturnNote("");
                          }}
                          onArchive={handleArchive}
                          busy={busy}
                        />
                        <button
                          type="button"
                          className="btn-secondary w-full text-xs"
                          onClick={() => void openDetail(request.id)}
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
      ) : tab === "rejected" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rejectedRequests.filter(matchesQuery).length === 0 ? (
            <p className="text-sm text-brand-gray">لا توجد طلبات مرفوضة.</p>
          ) : (
            rejectedRequests.filter(matchesQuery).map((request) => (
              <div key={request.id} className="space-y-1">
                <RequestCard
                  request={request}
                  employees={employees}
                  onAssign={handleAssign}
                  onReassign={handleReassign}
                  onApproveCompletion={handleApproveCompletion}
                  onReturn={() => undefined}
                  onArchive={handleArchive}
                  busy={busy}
                />
                <button
                  type="button"
                  className="btn-secondary w-full text-xs"
                  onClick={() => void openDetail(request.id)}
                >
                  التفاصيل
                </button>
              </div>
            ))
          )}
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
                    <StatusBadge status={request.status} />
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

      {returnModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md space-y-3">
            <h3 className="text-lg font-bold text-primary">إرجاع للموظف</h3>
            <p className="text-sm text-brand-gray">
              أدخل ملاحظة الإرجاع (مطلوبة) ليطّلع عليها الموظف.
            </p>
            <textarea
              className="input-field min-h-[100px]"
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder="مثال: يرجى إرفاق ملف الإثبات وتصحيح العنوان"
              aria-label="ملاحظة الإرجاع"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={busy || !returnNote.trim()}
                onClick={submitReturn}
              >
                تأكيد الإرجاع
              </button>
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => {
                  setReturnModalId(null);
                  setReturnNote("");
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <SlideOver
        open={Boolean(detailRequest)}
        title={detailRequest?.title ?? "تفاصيل الطلب"}
        onClose={() => {
          setDetailId(null);
          setDetailExtra(null);
        }}
      >
        {detailRequest && (
          <div className="zad-detail-card space-y-3">
            <p className="text-sm text-brand-gray">{detailRequest.description}</p>
            <dl>
              <div>
                <dt>الحالة</dt>
                <dd>
                  <StatusBadge status={detailRequest.status} />
                </dd>
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
                <dd>
                  {detailRequest.contactName ? `${detailRequest.contactName} — ` : ""}
                  <span dir="ltr">{detailRequest.contactEmail}</span>
                </dd>
              </div>
              {detailRequest.hospitalityBooking && (
                <>
                  <div>
                    <dt>القاعة</dt>
                    <dd>{detailRequest.hospitalityBooking.roomName}</dd>
                  </div>
                  <div>
                    <dt>وقت الحجز</dt>
                    <dd dir="ltr">
                      {detailRequest.hospitalityBooking.startTime} —{" "}
                      {detailRequest.hospitalityBooking.endTime}
                    </dd>
                  </div>
                </>
              )}
              <div>
                <dt>المسند إليه</dt>
                <dd>{detailRequest.assignedEmployee?.name ?? "غير مسند"}</dd>
              </div>
              {detailRequest.proofFileUrl && (
                <div>
                  <dt>مرفق الإثبات</dt>
                  <dd>
                    <a
                      className="text-primary underline"
                      href={detailRequest.proofFileUrl!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      فتح المرفق للمراجعة
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            {notesTimeline.length > 0 && (
              <div className="space-y-2 border-t border-surface-border pt-3">
                <h4 className="text-sm font-bold text-primary">خط زمني للملاحظات</h4>
                <ul className="space-y-2">
                  {notesTimeline.map((n) => (
                    <li
                      key={n.label}
                      className="rounded-md bg-surface-muted p-2 text-xs text-brand-gray"
                    >
                      <span className="font-semibold text-primary">{n.label}: </span>
                      {n.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  );
}
