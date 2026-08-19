"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/shared/empty-state";
import Skeleton from "@/components/ui/skeleton";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import SlaDisplay from "@/components/shared/sla-display";
import type { SlaMetrics } from "@/lib/sla";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-primary">التذاكر المسندة</h2>
        <p className="text-xs text-brand-gray">الطلبات المعيّنة إليك للتنفيذ</p>
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
              <h2 className="font-bold text-primary">{ticket.title}</h2>
              <span className="badge-primary text-[10px]">قيد التنفيذ</span>
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
