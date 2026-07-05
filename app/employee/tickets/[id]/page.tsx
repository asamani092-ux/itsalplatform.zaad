"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import SlaDisplay from "@/components/shared/sla-display";
import { formatDurationMs } from "@/components/shared/format-sla";
import type { SlaMetrics } from "@/lib/sla";

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
  const [completing, setCompleting] = useState(false);
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

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

  async function handleComplete() {
    setCompleting(true);
    setError("");
    try {
      const formData = new FormData();
      if (proof) formData.append("proof", proof);

      const res = await fetch(`/api/employee/tickets/${id}/complete`, {
        method: "POST",
        body: formData,
      });
      const payload = await parseApiResponse<{ ticket: TicketDetail }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل الإكمال"));
      }
      setTicket(payload.data.ticket);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="page-shell min-h-screen p-8 text-center text-sm text-brand-gray">
        جاري التحميل...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="page-shell min-h-screen p-8 text-center">
        <p className="text-[var(--zaad-danger)]">{error || "التذكرة غير موجودة"}</p>
        <Link href="/employee" className="btn-secondary mt-4 inline-flex">
          العودة
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell min-h-screen">
      <header className="border-b border-surface-border bg-surface px-4 py-4">
        <Link href="/employee" className="text-xs text-brand-gray underline">
          ← التذاكر
        </Link>
        <h1 className="mt-2 text-lg font-bold text-primary">{ticket.title}</h1>
      </header>

      <main className="page-container space-y-4 py-6">
        <div className="card space-y-3">
          <p className="text-sm text-brand-gray">{ticket.description}</p>
          <p className="text-xs text-brand-gray">
            {ticket.department?.name} — {ticket.requestType?.name}
          </p>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-brand-gray">مقدّم الطلب</dt>
              <dd dir="ltr">{ticket.contactEmail}</dd>
            </div>
            <div className="flex justify-between">
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

        {done ? (
          <div className="card-section text-center">
            <span className="badge-success">تم الإكمال</span>
            <p className="mt-2 text-sm text-brand-gray">
              المدة الإجمالية:{" "}
              <strong>{formatDurationMs(ticket.sla.totalLifecycleMs)}</strong>
            </p>
          </div>
        ) : (
          <div className="card space-y-3">
            <label className="label-field" htmlFor="proof">
              شاهد الإكمال (اختياري — PDF/PNG/JPG)
            </label>
            <input
              id="proof"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="input-field text-sm"
              onChange={(e) => setProof(e.target.files?.[0] ?? null)}
            />
            {error && (
              <p className="text-sm text-[var(--zaad-danger)]" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              className="btn-primary w-full py-3"
              disabled={completing}
              onClick={() => void handleComplete()}
            >
              {completing ? "جاري الإكمال..." : "إكمال الطلب"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
