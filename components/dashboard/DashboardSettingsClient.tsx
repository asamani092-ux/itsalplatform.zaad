"use client";

import { useCallback, useEffect, useState } from "react";
import ModuleManager from "@/components/dashboard/ModuleManager";
import {
  DepartmentsManager,
  RequestTypesManager,
} from "@/components/dashboard/TaxonomyManager";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";

type SettingsSection =
  | "modules"
  | "departments"
  | "requestTypes"
  | "rooms"
  | "routing";

interface Department {
  id: string;
  name: string;
  slug: string;
  managerEmail: string;
  receptionToken: string | null;
}

interface RoutingRule {
  id: string;
  requestType: { name: string };
  employee: { name: string };
  isActive: boolean;
}

const NAV: { id: SettingsSection; label: string }[] = [
  { id: "modules", label: "الخدمات والأدوات" },
  { id: "departments", label: "جهات استقبال الطلبات" },
  { id: "requestTypes", label: "أنواع الطلبات" },
  { id: "rooms", label: "قاعات الضيافة" },
  { id: "routing", label: "قواعد التوجيه" },
];

export default function DashboardSettingsClient({
  initialSection,
}: {
  initialSection?: SettingsSection;
}) {
  const [section, setSection] = useState<SettingsSection>(
    initialSection ?? "modules",
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [error, setError] = useState("");
  const [roomsText, setRoomsText] = useState("");
  const [appSaving, setAppSaving] = useState(false);
  const [appStatus, setAppStatus] = useState("");

  const load = useCallback(async () => {
    try {
      const [deptRes, rulesRes, appRes] = await Promise.all([
        fetch("/api/manager/settings/departments"),
        fetch("/api/manager/settings/routing-rules"),
        fetch("/api/manager/settings/app"),
      ]);

      const deptPayload = await parseApiResponse<{ departments: Department[] }>(deptRes);
      const rulesPayload = await parseApiResponse<{ rules: RoutingRule[] }>(rulesRes);
      const appPayload = await parseApiResponse<{ rooms: string[] }>(appRes);

      if (deptPayload.success) {
        setDepartments(deptPayload.data.departments);
      }
      if (rulesPayload.success) setRules(rulesPayload.data.rules);
      if (appPayload.success) {
        setRoomsText(appPayload.data.rooms.join("\n"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveRooms() {
    setAppSaving(true);
    setAppStatus("");
    try {
      const rooms = roomsText
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);
      const res = await fetch("/api/manager/settings/app", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rooms }),
      });
      const payload = await parseApiResponse<{ rooms: string[] }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل حفظ القاعات"));
      }
      setRoomsText(payload.data.rooms.join("\n"));
      setAppStatus("تم حفظ قاعات الضيافة");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setAppSaving(false);
    }
  }

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
          <p className="text-sm text-[var(--zaad-danger)]" role="alert">
            {error}
          </p>
        )}
        {appStatus && (
          <p className="text-sm font-semibold text-primary" role="status">
            {appStatus}
          </p>
        )}

        {section === "modules" && <ModuleManager />}

        {section === "departments" && <DepartmentsManager />}

        {section === "requestTypes" && (
          <RequestTypesManager departments={departments} />
        )}

        {section === "rooms" && (
          <div className="card space-y-3 p-4">
            <h2 className="text-lg font-bold text-primary">قاعات الضيافة</h2>
            <p className="text-sm text-brand-gray">قاعة في كل سطر — تُستخدم في الحجوزات والنموذج العام.</p>
            <textarea
              className="input-field min-h-40 w-full"
              value={roomsText}
              onChange={(e) => setRoomsText(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={appSaving}
              onClick={() => void saveRooms()}
            >
              حفظ القاعات
            </button>
          </div>
        )}

        {section === "routing" && (
          <div className="card space-y-3 p-4">
            <h2 className="text-lg font-bold text-primary">
              قواعد التوجيه ({rules.length})
            </h2>
            {rules.length === 0 ? (
              <p className="text-sm text-brand-gray">لا توجد قواعد توجيه بعد.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {rules.map((rule) => (
                  <li
                    key={rule.id}
                    className="flex flex-wrap gap-2 border-b border-surface-border py-2"
                  >
                    <span className="font-semibold text-primary">
                      {rule.requestType.name}
                    </span>
                    <span className="text-brand-gray">←</span>
                    <span>{rule.employee.name}</span>
                    {!rule.isActive && <span className="badge-warning">معطّل</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
