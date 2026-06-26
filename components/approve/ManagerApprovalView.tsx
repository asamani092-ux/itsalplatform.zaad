"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";

interface TokenSummary {
  id: string;
  title: string;
  status: string;
  approvedAt: string | null;
  department?: { name: string };
  requestType?: { name: string; requiresVisitDate: boolean };
  visitDate: string | null;
}

interface RequestDetails {
  id: string;
  title: string;
  description: string;
  requiredDate: string;
  contactEmail: string;
  contactPhone: string;
  managerEmail: string;
  status: string;
  approvedAt: string | null;
  department?: { name: string };
  requestType?: { name: string };
  visitDate: string | null;
}

type ViewState =
  | "loading"
  | "ready"
  | "approved"
  | "already_processed"
  | "rejected_info"
  | "error"
  | "missing_token";

const STATUS_LABELS: Record<string, string> = {
  Pending_Manager: "بانتظار موافقتك",
  Approved_Pending_Assignment: "معتمد — بانتظار الإسناد",
  In_Progress: "قيد التنفيذ",
  Completed: "مكتمل",
  Archived: "مؤرشف",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
  }).format(new Date(iso));
}

export default function ManagerApprovalView() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [viewState, setViewState] = useState<ViewState>("loading");
  const [details, setDetails] = useState<RequestDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(
    null,
  );
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  const loadRequest = useCallback(async (approvalToken: string) => {
    setViewState("loading");
    setErrorMessage("");

    try {
      const tokenRes = await fetch(
        `/api/approve?token=${encodeURIComponent(approvalToken)}`,
      );
      const tokenPayload = await parseApiResponse<TokenSummary>(tokenRes);

      if (!tokenRes.ok || !tokenPayload.success) {
        setErrorMessage(
          getApiErrorMessage(tokenPayload, "تعذّر تحميل الطلب"),
        );
        setViewState("error");
        return;
      }

      const summary = tokenPayload.data;

      if (summary.status !== "Pending_Manager") {
        setViewState("already_processed");
      }

      const detailRes = await fetch(`/api/dashboard/requests/${summary.id}`);
      const detailPayload = await parseApiResponse<RequestDetails>(detailRes);

      if (!detailRes.ok || !detailPayload.success) {
        setErrorMessage(
          getApiErrorMessage(detailPayload, "تعذّر تحميل تفاصيل الطلب"),
        );
        setViewState("error");
        return;
      }

      setDetails(detailPayload.data);

      if (summary.status === "Pending_Manager") {
        setViewState("ready");
      }
    } catch {
      setErrorMessage("حدث خطأ في الاتصال. تحقق من الشبكة وحاول مجدداً.");
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setViewState("missing_token");
      return;
    }
    void loadRequest(token);
  }, [token, loadRequest]);

  async function handleApprove() {
    if (!token) return;
    setActionLoading("approve");
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/approve?token=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      const payload = await parseApiResponse<{
        message: string;
        status: string;
      }>(response);

      if (!response.ok || !payload.success) {
        setErrorMessage(
          getApiErrorMessage(payload, "تعذّر تنفيذ الموافقة"),
        );
        return;
      }

      setViewState("approved");
    } catch {
      setErrorMessage("حدث خطأ أثناء الموافقة.");
    } finally {
      setActionLoading(null);
    }
  }

  function handleRejectConfirm() {
    setActionLoading("reject");
    setShowRejectConfirm(false);
    setViewState("rejected_info");
    setActionLoading(null);
  }

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <header className="border-b border-surface-border bg-surface px-4 py-4 text-center shadow-sm">
        <p className="text-xs font-semibold text-brand-gray">جمعية الزاد</p>
        <h1 className="text-lg font-bold text-primary">موافقة المدير المباشر</h1>
      </header>

      <main className="page-container-narrow flex flex-1 flex-col py-6">
        {viewState === "loading" && (
          <div className="card flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div
              className="h-10 w-10 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--zaad-primary)_15%,transparent)]"
              aria-hidden
            />
            <p className="text-sm text-brand-gray">جاري تحميل الطلب...</p>
          </div>
        )}

        {viewState === "missing_token" && (
          <div className="card space-y-4 text-center">
            <span className="badge-danger">رابط غير صالح</span>
            <p className="text-sm text-brand-gray">
              لم يُعثر على رمز الموافقة. افتح الرابط من البريد المرسل إليك.
            </p>
            <Link href="/" className="btn-secondary inline-flex">
              العودة للرئيسية
            </Link>
          </div>
        )}

        {viewState === "error" && (
          <div className="card space-y-4 text-center">
            <span className="badge-danger">خطأ</span>
            <p className="text-sm text-brand-gray">{errorMessage}</p>
            {token && (
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => void loadRequest(token)}
              >
                إعادة المحاولة
              </button>
            )}
          </div>
        )}

        {(viewState === "ready" ||
          viewState === "already_processed" ||
          viewState === "approved" ||
          viewState === "rejected_info") &&
          details && (
            <div className="flex flex-1 flex-col gap-4">
              <div className="card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={
                      viewState === "approved"
                        ? "badge-success"
                        : viewState === "rejected_info"
                          ? "badge-danger"
                          : details.status === "Pending_Manager"
                            ? "badge-warning"
                            : "badge-primary"
                    }
                  >
                    {viewState === "approved"
                      ? "تمت الموافقة"
                      : viewState === "rejected_info"
                        ? "رفض — إجراء يدوي"
                        : STATUS_LABELS[details.status] ?? details.status}
                  </span>
                  <span className="font-mono text-xs text-brand-gray" dir="ltr">
                    #{details.id.slice(-8)}
                  </span>
                </div>

                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-primary">
                    {details.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-brand-gray">
                    {details.description}
                  </p>
                </div>

                <dl className="grid gap-3 border-t border-surface-border pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-brand-gray">القسم</dt>
                    <dd className="font-semibold text-primary">
                      {details.department?.name ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-brand-gray">نوع الطلب</dt>
                    <dd className="font-semibold text-primary">
                      {details.requestType?.name ?? "—"}
                    </dd>
                  </div>
                  {details.visitDate && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-brand-gray">تاريخ الزيارة</dt>
                      <dd className="font-semibold" dir="ltr">
                        {formatDate(details.visitDate)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-brand-gray">التاريخ المطلوب</dt>
                    <dd className="font-semibold text-primary" dir="ltr">
                      {formatDate(details.requiredDate)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-brand-gray">مقدّم الطلب</dt>
                    <dd className="font-semibold" dir="ltr">
                      {details.contactEmail}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-brand-gray">الجوال</dt>
                    <dd className="font-semibold" dir="ltr">
                      {details.contactPhone}
                    </dd>
                  </div>
                </dl>
              </div>

              {viewState === "approved" && (
                <div className="card-section text-center text-sm text-brand-gray">
                  <p className="font-semibold text-primary">
                    شكراً — انتقل الطلب إلى قسم الاتصال المؤسسي.
                  </p>
                  <p className="mt-2">
                    يمكنك إغلاق هذه الصفحة. سيُتابع الفريق تنفيذ الطلب.
                  </p>
                </div>
              )}

              {viewState === "rejected_info" && (
                <div className="card-section space-y-2 text-sm text-brand-gray">
                  <p className="font-semibold text-[var(--zaad-danger)]">
                    لم تتم الموافقة على الطلب.
                  </p>
                  <p>
                    لا يُسجّل الرفض آلياً في النظام حالياً. يُرجى إبلاغ{" "}
                    <span dir="ltr">{details.contactEmail}</span> أو{" "}
                    <span dir="ltr">{details.contactPhone}</span> مباشرةً بقرارك.
                  </p>
                </div>
              )}

              {viewState === "already_processed" && (
                <div className="card-section text-center text-sm text-brand-gray">
                  <p>تمت معالجة هذا الطلب مسبقاً ولا يمكن الموافقة عليه مجدداً.</p>
                  {details.approvedAt && (
                    <p className="mt-2" dir="ltr">
                      {formatDate(details.approvedAt)}
                    </p>
                  )}
                </div>
              )}

              {errorMessage && viewState === "ready" && (
                <div
                  className="rounded-lg border border-[var(--zaad-danger)] bg-[var(--zaad-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--zaad-danger)]"
                  role="alert"
                >
                  {errorMessage}
                </div>
              )}

              {showRejectConfirm && viewState === "ready" && (
                <div className="modal-overlay">
                  <div className="modal-panel card space-y-4">
                    <h3 className="text-lg font-bold text-primary">تأكيد الرفض</h3>
                    <p className="text-sm text-brand-gray">
                      لن يُرسل الطلب لقسم الاتصال. هل تريد المتابعة؟
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        className="btn-secondary flex-1 border-[var(--zaad-danger)] text-[var(--zaad-danger)]"
                        onClick={handleRejectConfirm}
                      >
                        نعم، رفض
                      </button>
                      <button
                        type="button"
                        className="btn-primary flex-1"
                        onClick={() => setShowRejectConfirm(false)}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        {viewState === "ready" && (
          <div className="sticky bottom-0 mt-auto space-y-3 bg-surface-muted pb-4 pt-2">
            <button
              type="button"
              className="btn-primary w-full py-4 text-base"
              disabled={actionLoading !== null}
              onClick={() => void handleApprove()}
            >
              {actionLoading === "approve" ? "جاري الموافقة..." : "موافقة ✓"}
            </button>
            <button
              type="button"
              className="btn-secondary w-full border-[var(--zaad-danger)] py-4 text-base text-[var(--zaad-danger)]"
              disabled={actionLoading !== null}
              onClick={() => setShowRejectConfirm(true)}
            >
              رفض
            </button>
            <p className="text-center text-xs text-brand-gray">
              لا حاجة لتسجيل الدخول — الرابط آمن ومخصص لك فقط.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
