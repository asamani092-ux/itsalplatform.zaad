"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/shared/empty-state";
import Skeleton from "@/components/ui/skeleton";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import SlaDisplay from "@/components/shared/sla-display";
import StatusBadge from "@/components/shared/status-badge";
import type { SlaMetrics } from "@/lib/sla";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  requiredDate?: string | null;
  createdAt: string;
  assignedAt: string | null;
  completedAt: string | null;
  department?: { name: string };
  requestType?: { name: string };
  sla: SlaMetrics;
}

export default function EmployeeTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employee/tickets");
      const payload = await parseApiResponse<{ tickets: Ticket[] }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل التذاكر"));
      }
      setTickets(payload.data.tickets);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = useMemo(() => {
    const assigned = tickets.filter(
      (t) => t.status === "In_Progress" || t.status === "Returned",
    ).length;
    const pendingReview = tickets.filter((t) => t.status === "Pending_Review").length;
    const now = Date.now();
    const overdue = tickets.filter((t) => {
      if (t.status === "Completed" || t.status === "Archived" || t.status === "Rejected") {
        return false;
      }
      if (!t.requiredDate) return false;
      return new Date(t.requiredDate).getTime() < now;
    }).length;
    const completed = tickets.filter((t) => t.status === "Completed").length;
    return { assigned, pendingReview, overdue, completed };
  }, [tickets]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-primary">تذاكري</h2>
        <p className="text-sm text-brand-gray">
          الطلبات المسندة إليك للمتابعة والتنفيذ
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-primary">{kpis.assigned}</p>
          <p className="text-xs text-brand-gray">مسندة</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-primary">{kpis.pendingReview}</p>
          <p className="text-xs text-brand-gray">بانتظار المراجعة</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-[var(--zaad-danger)]">{kpis.overdue}</p>
          <p className="text-xs text-brand-gray">متأخرة</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-[var(--zaad-success)]">{kpis.completed}</p>
          <p className="text-xs text-brand-gray">مكتملة</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--zaad-danger)]" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="card space-y-3 p-6">
          <Skeleton lines={4} />
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          title="لا توجد تذاكر مسندة"
          description="ستظهر هنا الطلبات المسندة إليك من المدير"
        />
      ) : (
        tickets.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/employee/tickets/${ticket.id}`}
            className="card block space-y-3 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-primary">{ticket.title}</h3>
              <StatusBadge status={ticket.status} />
            </div>
            <p className="text-xs text-brand-gray">
              {ticket.department?.name} — {ticket.requestType?.name}
            </p>
            <SlaDisplay
              sla={ticket.sla}
              createdAt={ticket.createdAt}
              assignedAt={ticket.assignedAt}
              completedAt={ticket.completedAt}
            />
          </Link>
        ))
      )}
    </div>
  );
}
