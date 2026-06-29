"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";

type Tab = "departments" | "requestTypes" | "routing";

interface Department {
  id: string;
  name: string;
  slug: string;
  managerEmail: string;
  receptionToken: string | null;
}

interface RequestType {
  id: string;
  name: string;
  slug: string;
  requiresVisitDate: boolean;
  departmentId: string | null;
}

interface RoutingRule {
  id: string;
  requestType: { name: string };
  employee: { name: string };
  isActive: boolean;
}

export default function DashboardSettingsPage() {
  const [tab, setTab] = useState<Tab>("departments");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [deptRes, rtRes, rulesRes] = await Promise.all([
        fetch("/api/manager/settings/departments"),
        fetch("/api/manager/settings/request-types"),
        fetch("/api/manager/settings/routing-rules"),
      ]);

      const deptPayload = await parseApiResponse<{ departments: Department[] }>(deptRes);
      const rtPayload = await parseApiResponse<{ requestTypes: RequestType[] }>(rtRes);
      const rulesPayload = await parseApiResponse<{ rules: RoutingRule[] }>(rulesRes);

      if (deptPayload.success) setDepartments(deptPayload.data.departments);
      if (rtPayload.success) setRequestTypes(rtPayload.data.requestTypes);
      if (rulesPayload.success) setRules(rulesPayload.data.rules);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="tab-bar max-w-lg">
        {(
          [
            ["departments", "الأقسام"],
            ["requestTypes", "أنواع الطلبات"],
            ["routing", "قواعد التوجيه"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "active" : ""}
            data-active={tab === id ? "true" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-[var(--zaad-danger)]">{error}</p>}

      {tab === "departments" && (
        <div className="card overflow-x-auto p-0">
          <table className="zaad-table">
            <thead>
              <tr>
                <th>القسم</th>
                <th>المعرّف</th>
                <th>بريد المدير</th>
                <th>رمز الاستقبال</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td dir="ltr">{d.slug}</td>
                  <td dir="ltr">{d.managerEmail}</td>
                  <td dir="ltr" className="text-xs">
                    {d.receptionToken ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "requestTypes" && (
        <div className="card overflow-x-auto p-0">
          <table className="zaad-table">
            <thead>
              <tr>
                <th>النوع</th>
                <th>المعرّف</th>
                <th>يتطلب زيارة</th>
              </tr>
            </thead>
            <tbody>
              {requestTypes.map((rt) => (
                <tr key={rt.id}>
                  <td>{rt.name}</td>
                  <td dir="ltr">{rt.slug}</td>
                  <td>{rt.requiresVisitDate ? "نعم" : "لا"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "routing" && (
        <div className="card overflow-x-auto p-0">
          <table className="zaad-table">
            <thead>
              <tr>
                <th>نوع الطلب</th>
                <th>الموظف</th>
                <th>نشط</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>{r.requestType.name}</td>
                  <td>{r.employee.name}</td>
                  <td>{r.isActive ? "نعم" : "لا"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card-section text-sm text-brand-gray">
        <p>
          معاينة النموذج العام:{" "}
          <Link
            href="/dashboard/settings/preview"
            className="font-semibold text-primary underline"
          >
            معاينة النموذج
          </Link>
        </p>
      </div>
    </div>
  );
}
