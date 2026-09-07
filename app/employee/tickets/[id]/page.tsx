"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import SlaDisplay from "@/components/shared/sla-display";
import StatusBadge from "@/components/shared/status-badge";
import type { SlaMetrics } from "@/lib/sla";
import Skeleton from "@/components/ui/skeleton";
import Dropzone from "@/components/ui/dropzone";

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  requiredDate: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  assignedAt: string | null;
  completedAt: string | null;
  reviewNote?: string | null;
  employeeNote?: string | null;
  department?: { name: string };
  requestType?: { name: string };
  visitDate: string | null;
  sla: SlaMetrics;
}

export default function EmployeeTicketDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employee/tickets/${id}`);
      const payload = await parseApiResponse<{ ticket: TicketDetail }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل التذكرة"));
      }
      setTicket(payload.data.ticket);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postMultipart(url: string) {
    const formData = new FormData();
    if (proof) formData.append("proof", proof);
    const res = await fetch(url, { method: "POST", body: formData });
    const payload = await parseApiResponse<{ ticket: TicketDetail }>(res);
    if (!res.ok || !payload.success) {
      throw new Error(getApiErrorMessage(payload, "فشلت العملية"));
    }
    setTicket(payload.data.ticket);
    setProof(null);
  }

  async function handleDeclare() {
    setBusy(true);
    setError("");
    try {
      await postMultipart(`/api/employee/tickets/${id}/complete`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  }

  async function handleRedeclare() {
    setBusy(true);
    setError("");
    try {
      await postMultipart(`/api/employee/tickets/${id}/redeclare`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!rejectNote.trim()) {
      setError("ملاحظة رفض الإسناد مطلوبة");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/employee/tickets/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeNote: rejectNote.trim() }),
      });
      const payload = await parseApiResponse<{ ticket: TicketDetail }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل رفض الإسناد"));
      }
      setTicket(payload.data.ticket);
      setRejectOpen(false);
      setRejectNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="card space-y-3 p-6">
        <Skeleton lines={5} />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="card space-y-4 p-8 text-center">
        <p className="text-[var(--zaad-danger)]">{error || "التذكرة غير موجودة"}</p>
        <Link href="/employee" className="btn-secondary inline-flex">
          العودة
        </Link>
      </div>
    );
  }

  const isInProgress = ticket.status === "In_Progress";
  const isPendingReview = ticket.status === "Pending_Review";
  const isReturned = ticket.status === "Returned";

  return (
    <div className="space-y-4">
      <div>
        <Link href="/employee" className="text-xs text-brand-gray underline">
          التذاكر →
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-bold text-primary">{ticket.title}</h1>
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <div className="card space-y-3">
        <p className="text-sm text-brand-gray">{ticket.description}</p>
        <p className="text-xs text-brand-gray">
          {ticket.department?.name} — {ticket.requestType?.name}
        </p>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-brand-gray">مقدّم الطلب</dt>
            <dd dir="ltr">{ticket.contactEmail}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-brand-gray">الجوال</dt>
            <dd dir="ltr">{ticket.contactPhone}</dd>
          </div>
        </dl>
        <SlaDisplay
          sla={ticket.sla}
          createdAt={ticket.createdAt}
          assignedAt={ticket.assignedAt}
          completedAt={ticket.completedAt}
        />
      </div>

      {isReturned && ticket.reviewNote && (
        <div className="card border border-[var(--zaad-danger)] bg-[var(--zaad-danger-bg)] space-y-2">
          <h2 className="text-sm font-bold text-[var(--zaad-danger)]">
            ملاحظة المدير عند الإرجاع
          </h2>
          <p className="text-sm text-brand-gray">{ticket.reviewNote}</p>
        </div>
      )}

      {isPendingReview && (
        <div className="card-section text-center">
          <span className="badge-warning">بانتظار مراجعة المدير</span>
          <p className="mt-2 text-sm text-brand-gray">
            تم إعلان الانتهاء. سيراجع المدير الإكمال أو يعيد التذكرة إن لزم.
          </p>
        </div>
      )}

      {(isInProgress || isReturned) && (
        <div className="card space-y-3">
          <p className="label-field">شاهد الإكمال (اختياري — PDF/PNG/JPG)</p>
          <Dropzone
            accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
            label={proof ? proof.name : "اسحب الشاهد هنا أو اختر من الجهاز"}
            hint="PDF أو صورة بحد أقصى المسموح"
            disabled={busy}
            onFiles={(files) => setProof(files[0] ?? null)}
          />
          {error && (
            <p className="text-sm text-[var(--zaad-danger)]" role="alert">
              {error}
            </p>
          )}
          {isInProgress && (
            <>
              <button
                type="button"
                className="btn-primary w-full py-3"
                disabled={busy}
                onClick={() => void handleDeclare()}
              >
                {busy ? "جاري الإرسال..." : "إعلان الانتهاء"}
              </button>
              <button
                type="button"
                className="btn-secondary w-full border-[var(--zaad-danger)] text-[var(--zaad-danger)]"
                disabled={busy}
                onClick={() => setRejectOpen(true)}
              >
                رفض / طلب إعادة إسناد
              </button>
            </>
          )}
          {isReturned && (
            <button
              type="button"
              className="btn-primary w-full py-3"
              disabled={busy}
              onClick={() => void handleRedeclare()}
            >
              {busy ? "جاري الإرسال..." : "إعادة الإعلان بعد التصحيح"}
            </button>
          )}
        </div>
      )}

      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md space-y-3">
            <h3 className="text-lg font-bold text-primary">رفض / طلب إعادة إسناد</h3>
            <p className="text-sm text-brand-gray">
              أدخل ملاحظة توضح سبب رفض الإسناد (مطلوبة).
            </p>
            <textarea
              className="input-field min-h-[100px]"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="مثال: التذكرة خارج نطاق اختصاصي"
              aria-label="ملاحظة رفض الإسناد"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1 bg-[var(--zaad-danger)]"
                disabled={busy || !rejectNote.trim()}
                onClick={() => void handleReject()}
              >
                تأكيد الرفض
              </button>
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => {
                  setRejectOpen(false);
                  setRejectNote("");
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
