"use client";

import { useCallback, useEffect, useState } from "react";
import DynamicSubmitForm from "@/components/public/DynamicSubmitForm";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";

type SettingsSection = "departments" | "requestTypes" | "routing" | "form";

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

const NAV: { id: SettingsSection; label: string }[] = [
  { id: "departments", label: "الأقسام" },
  { id: "requestTypes", label: "أنواع الطلبات" },
  { id: "routing", label: "قواعد التوجيه" },
  { id: "form", label: "النموذج" },
];

export default function DashboardSettingsClient({
  initialSection,
}: {
  initialSection?: SettingsSection;
}) {
  const [section, setSection] = useState<SettingsSection>(
    initialSection ?? "departments",
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [previewDepartments, setPreviewDepartments] = useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [previewRequestTypes, setPreviewRequestTypes] = useState<
    {
      id: string;
      name: string;
      slug: string;
      description: string;
      requiresVisitDate: boolean;
      departmentId: string | null;
    }[]
  >([]);
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

      if (deptPayload.success) {
        setDepartments(deptPayload.data.departments);
        setPreviewDepartments(
          deptPayload.data.departments.map((d) => ({
            id: d.id,
            name: d.name,
            slug: d.slug,
          })),
        );
      }
      if (rtPayload.success) {
        setRequestTypes(rtPayload.data.requestTypes);
        setPreviewRequestTypes(
          rtPayload.data.requestTypes.map((rt) => ({
            id: rt.id,
            name: rt.name,
            slug: rt.slug,
            description: "",
            requiresVisitDate: rt.requiresVisitDate,
            departmentId: rt.departmentId,
          })),
        );
      }
      if (rulesPayload.success) setRules(rulesPayload.data.rules);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <nav
        className="flex shrink-0 flex-row flex-wrap gap-1 lg:w-48 lg:flex-col"
        aria-label="أقسام الإعدادات"
      >
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            aria-current={section === item.id ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-start text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/20 ${
              section === item.id
                ? "bg-primary/10 text-primary"
                : "text-brand-gray hover:bg-surface-muted"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1 space-y-4">
        {error && (
          <p className="text-sm text-[var(--tmkeen-danger)]" role="alert">
            {error}
          </p>
        )}

        {section === "departments" && (
          <div className="card overflow-x-auto p-0">
            <table className="tmkeen-table">
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

        {section === "requestTypes" && (
          <div className="card overflow-x-auto p-0">
            <table className="tmkeen-table">
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

        {section === "routing" && (
          <div className="card overflow-x-auto p-0">
            <table className="tmkeen-table">
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

        {section === "form" && (
          <div className="space-y-4">
            <div className="card-section">
              <h2 className="text-lg font-bold text-primary">معاينة النموذج العام</h2>
              <p className="mt-1 text-sm text-brand-gray">
                عرض حي لنموذج التقديم كما يراه مقدّمو الطلبات — بناءً على الإعدادات الحالية
              </p>
            </div>
            <DynamicSubmitForm
              slug="communications"
              preview
              initialDepartments={previewDepartments}
              initialRequestTypes={previewRequestTypes}
            />
          </div>
        )}
      </div>
    </div>
  );
}
