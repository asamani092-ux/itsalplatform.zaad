"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import StatusBadge from "@/components/shared/status-badge";
import FilterBar from "@/components/ui/filter-bar";
import { IconButton } from "@/components/ui/icon-button";
import { IconRefresh } from "@/components/shared/icons";
import type { DashboardRequest } from "@/components/dashboard/kanban/RequestCard";
import { canCancelStatus, canRejectStatus } from "@/lib/request-stop";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "كل الحالات" },
  { value: "Pending_Manager", label: "بانتظار المدير" },
  { value: "Approved_Pending_Assignment", label: "معتمد — بانتظار الإسناد" },
  { value: "In_Progress", label: "قيد التنفيذ" },
  { value: "Pending_Review", label: "بانتظار المراجعة" },
  { value: "Returned", label: "مُعادة للموظف" },
  { value: "Rejected", label: "مرفوضة" },
  { value: "Cancelled", label: "ملغاة" },
  { value: "Completed", label: "مكتمل" },
  { value: "Archived", label: "مؤرشف" },
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ar", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function AllRequestsPage() {
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/manager/tickets?view=all&includePending=1");
      const payload = await parseApiResponse<{ requests: DashboardRequest[] }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل الطلبات"));
      }
      setRequests(payload.data.requests);
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

  async function runTicketAction(
    id: string,
    action: () => Promise<Response>,
    successMessage: string,
    failureMessage: string,
  ) {
    setActionId(id);
    setError(null);
    setNotice(null);
    try {
      const res = await action();
      const payload = await parseApiResponse<unknown>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, failureMessage));
      }
      setNotice(successMessage);
      setRejectTargetId(null);
      setRejectReason("");
      setCancelTargetId(null);
      setCancelReason("");
      await loadData();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : failureMessage,
      );
    } finally {
      setActionId(null);
    }
  }

  function handleApprove(id: string) {
    return runTicketAction(
      id,
      () => fetch(`/api/manager/tickets/${id}/approve`, { method: "POST" }),
      "تمت الموافقة على الطلب",
      "فشلت الموافقة على الطلب",
    );
  }

  function handleResendApproval(id: string) {
    return runTicketAction(
      id,
      () =>
        fetch(`/api/manager/tickets/${id}/resend-approval`, { method: "POST" }),
      "تم إعادة إرسال رابط الموافقة بنجاح",
      "فشل إرسال رابط الموافقة",
    );
  }

  function handleRejectConfirm() {
    if (!rejectTargetId || rejectReason.trim().length < 3) {
      setError("سبب الرفض مطلوب (3 أحرف على الأقل)");
      return Promise.resolve();
    }
    const id = rejectTargetId;
    const reason = rejectReason.trim();
    return runTicketAction(
      id,
      () =>
        fetch(`/api/manager/tickets/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }),
      "تم رفض الطلب",
      "فشل رفض الطلب",
    );
  }

  function handleCancelConfirm() {
    if (!cancelTargetId || cancelReason.trim().length < 3) {
      setError("سبب الإلغاء مطلوب (3 أحرف على الأقل)");
      return Promise.resolve();
    }
    const id = cancelTargetId;
    const reason = cancelReason.trim();
    return runTicketAction(
      id,
      () =>
        fetch(`/api/manager/tickets/${id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }),
      "تم إلغاء الطلب",
      "فشل إلغاء الطلب",
    );
  }

  function renderRowActions(request: DashboardRequest, fullWidth = false) {
    const busy = actionId === request.id;
    const widthClass = fullWidth ? "w-full " : "";

    if (canRejectStatus(request.status)) {
      return (
        <div className={`grid gap-2 ${fullWidth ? "" : "min-w-[11rem]"}`}>
          <button
            type="button"
            className={`btn-primary ${widthClass}text-xs`}
            disabled={busy}
            onClick={() => void handleApprove(request.id)}
          >
            {busy ? "جاري التنفيذ..." : "موافقة"}
          </button>
          <button
            type="button"
            className={`btn-secondary ${widthClass}border-[var(--zaad-danger)] text-xs text-[var(--zaad-danger)]`}
            disabled={busy}
            onClick={() => {
              setRejectTargetId(request.id);
              setRejectReason("");
              setError(null);
              setNotice(null);
            }}
          >
            رفض مع سبب
          </button>
          <button
            type="button"
            className={`btn-secondary ${widthClass}text-xs`}
            disabled={busy}
            onClick={() => void handleResendApproval(request.id)}
          >
            إعادة إرسال الرابط
          </button>
        </div>
      );
    }

    if (canCancelStatus(request.status)) {
      return (
        <button
          type="button"
          className={`btn-secondary ${widthClass}border-[var(--zaad-danger)] text-xs text-[var(--zaad-danger)]`}
          disabled={busy}
          onClick={() => {
            setCancelTargetId(request.id);
            setCancelReason("");
            setError(null);
            setNotice(null);
          }}
        >
          رفض / إلغاء الطلب
        </button>
      );
    }

    return <span className="text-brand-gray">—</span>;
  }

  const filteredRequests = useMemo(() => {
    const q = query.trim();
    return requests.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.title.includes(q) ||
        r.contactEmail.includes(q) ||
        (r.contactName ?? "").includes(q)
      );
    });
  }, [requests, statusFilter, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-primary">كل الطلبات</h1>
          <p className="text-sm text-brand-gray">
            عرض شامل لجميع الطلبات بجميع أنواعها — يمكن رفض أو إلغاء أي طلب غير منتهٍ مع ذكر السبب.
          </p>
        </div>
        <IconButton
          label={loading ? "جاري التحديث..." : "تحديث"}
          icon={<IconRefresh size={18} />}
          tone="primary"
          disabled={loading}
          onClick={() => void loadData()}
        />
      </div>

      <FilterBar
        onClear={() => {
          setQuery("");
          setStatusFilter("");
        }}
      >
        <input
          className="input-field w-full sm:max-w-sm"
          placeholder="تصفية بالعنوان أو البريد أو الاسم..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="تصفية الطلبات"
        />
        <select
          className="input-field w-full sm:max-w-xs"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="تصفية بالحالة"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FilterBar>

      {error && (
        <div
          className="rounded-lg border border-[var(--zaad-danger)] bg-[var(--zaad-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--zaad-danger)]"
          role="alert"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          className="rounded-lg border border-[var(--zaad-success)] bg-[var(--zaad-success-bg)] px-4 py-3 text-sm font-semibold text-[var(--zaad-success)]"
          role="status"
        >
          {notice}
        </div>
      )}

      {loading ? (
        <div className="card flex items-center justify-center gap-3 py-16">
          <div
            className="h-8 w-8 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--zaad-primary)_15%,transparent)]"
            aria-hidden
          />
          <p className="text-sm text-brand-gray">جاري تحميل الطلبات...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-sm text-brand-gray">لا توجد طلبات مطابقة.</p>
        </div>
      ) : (
        <>
          <div className="card hidden overflow-x-auto p-0 md:block">
            <table className="tmkeen-table">
              <thead>
                <tr>
                  <th scope="col">العنوان</th>
                  <th scope="col">مقدّم الطلب</th>
                  <th scope="col">الحالة</th>
                  <th scope="col">القسم</th>
                  <th scope="col">نوع الطلب</th>
                  <th scope="col">تاريخ الإنشاء</th>
                  <th scope="col">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="font-semibold text-primary">{request.title}</td>
                    <td>
                      <div className="flex flex-col">
                        <span>{request.contactName || "—"}</span>
                        <span className="text-[11px] text-brand-gray" dir="ltr">
                          {request.contactEmail}
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={request.status} />
                    </td>
                    <td>{request.department?.name ?? "—"}</td>
                    <td>{request.requestType?.name ?? "—"}</td>
                    <td className="text-xs">{formatDate(request.createdAt)}</td>
                    <td>
                      {renderRowActions(request)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filteredRequests.map((request) => (
              <article key={request.id} className="card space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-primary">
                    {request.title}
                  </h3>
                  <StatusBadge status={request.status} />
                </div>
                <p className="text-xs text-brand-gray">
                  {request.contactName || "—"}{" "}
                  <span dir="ltr">({request.contactEmail})</span>
                </p>
                <p className="text-[11px] text-brand-gray">
                  {request.department?.name ?? "—"}
                  {request.requestType ? ` — ${request.requestType.name}` : ""}
                </p>
                <p className="text-[11px] text-brand-gray">
                  {formatDate(request.createdAt)}
                </p>
                {renderRowActions(request, true)}
              </article>
            ))}
          </div>
        </>
      )}
      {rejectTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-request-title"
        >
          <div className="card w-full max-w-md space-y-3">
            <h3 id="reject-request-title" className="text-lg font-bold text-primary">
              رفض الطلب
            </h3>
            <p className="text-sm text-brand-gray">
              سيُرسل سبب الرفض إلى بريد مقدّم الطلب.
            </p>
            <label className="label-field" htmlFor="all-requests-reject-reason">
              سبب الرفض
            </label>
            <textarea
              id="all-requests-reject-reason"
              className="input-field min-h-24 w-full"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="اكتب سبب الرفض..."
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary border-[var(--zaad-danger)] text-sm text-[var(--zaad-danger)]"
                disabled={actionId === rejectTargetId}
                onClick={() => void handleRejectConfirm()}
              >
                تأكيد الرفض
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={actionId === rejectTargetId}
                onClick={() => {
                  setRejectTargetId(null);
                  setRejectReason("");
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-request-title"
        >
          <div className="card w-full max-w-md space-y-3">
            <h3 id="cancel-request-title" className="text-lg font-bold text-primary">
              رفض / إلغاء الطلب
            </h3>
            <p className="text-sm text-brand-gray">
              سيُرسل السبب إلى بريد مقدّم الطلب ويُحرَّر أي حجز قاعة مرتبط.
            </p>
            <label className="label-field" htmlFor="all-requests-cancel-reason">
              السبب (مطلوب)
            </label>
            <textarea
              id="all-requests-cancel-reason"
              className="input-field min-h-24 w-full"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="اكتب سبب الرفض أو الإلغاء..."
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary border-[var(--zaad-danger)] text-sm text-[var(--zaad-danger)]"
                disabled={actionId === cancelTargetId}
                onClick={() => void handleCancelConfirm()}
              >
                تأكيد الإلغاء
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={actionId === cancelTargetId}
                onClick={() => {
                  setCancelTargetId(null);
                  setCancelReason("");
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
