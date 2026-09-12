"use client";

import { useCallback, useEffect, useState } from "react";
import ModuleManager from "@/components/dashboard/ModuleManager";
import {
  DepartmentsManager,
  RequestTypesManager,
} from "@/components/dashboard/TaxonomyManager";
import RoutingRulesManager from "@/components/dashboard/RoutingRulesManager";
import AdministrationsManager from "@/components/dashboard/AdministrationsManager";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";

type SettingsSection =
  | "modules"
  | "workflow"
  | "administrations"
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

const NAV: { id: SettingsSection; label: string }[] = [
  { id: "modules", label: "الخدمات والأدوات" },
  { id: "workflow", label: "مسار الطلبات" },
  { id: "administrations", label: "الإدارات ومدراؤها" },
  { id: "departments", label: "جهات استقبال الطلبات" },
  { id: "requestTypes", label: "أنواع الطلبات" },
  { id: "rooms", label: "القاعات" },
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
  const [error, setError] = useState("");
  const [skipApproval, setSkipApproval] = useState(false);
  const [roomsText, setRoomsText] = useState("");
  const [dayStart, setDayStart] = useState("08:00");
  const [dayEnd, setDayEnd] = useState("16:00");
  const [appSaving, setAppSaving] = useState(false);
  const [appStatus, setAppStatus] = useState("");

  const load = useCallback(async () => {
    try {
      const [deptRes, appRes] = await Promise.all([
        fetch("/api/manager/settings/departments"),
        fetch("/api/manager/settings/app"),
      ]);

      const deptPayload = await parseApiResponse<{ departments: Department[] }>(deptRes);
      const appPayload = await parseApiResponse<{
        workflow: { skipDepartmentApproval: boolean };
        hospitality: { rooms: string[]; dayStart: string; dayEnd: string };
        rooms: string[];
      }>(appRes);

      if (deptPayload.success) {
        setDepartments(deptPayload.data.departments);
      }
      if (appPayload.success) {
        setSkipApproval(appPayload.data.workflow.skipDepartmentApproval);
        setRoomsText(appPayload.data.hospitality.rooms.join("\n"));
        setDayStart(appPayload.data.hospitality.dayStart);
        setDayEnd(appPayload.data.hospitality.dayEnd);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveWorkflow() {
    setAppSaving(true);
    setAppStatus("");
    try {
      const res = await fetch("/api/manager/settings/app", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipDepartmentApproval: skipApproval }),
      });
      const payload = await parseApiResponse<unknown>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل الحفظ"));
      }
      setAppStatus("تم حفظ مسار الطلبات");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setAppSaving(false);
    }
  }

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
        body: JSON.stringify({ hospitality: { rooms, dayStart, dayEnd } }),
      });
      const payload = await parseApiResponse<{
        hospitality: { rooms: string[]; dayStart: string; dayEnd: string };
      }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل حفظ القاعات"));
      }
      setRoomsText(payload.data.hospitality.rooms.join("\n"));
      setDayStart(payload.data.hospitality.dayStart);
      setDayEnd(payload.data.hospitality.dayEnd);
      setAppStatus("تم حفظ القاعات");
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

        {section === "workflow" && (
          <div className="card space-y-4 p-4">
            <h2 className="text-lg font-bold text-primary">مسار الطلبات</h2>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[var(--zaad-primary)]"
                checked={skipApproval}
                onChange={(e) => setSkipApproval(e.target.checked)}
              />
              <span>
                <strong className="text-primary">إظهار الطلبات مباشرة في لوحة المدير</strong>
                <br />
                <span className="text-brand-gray">
                  عند التفعيل تُتجاوز موافقة مدير الجهة المستقبِلة ويصل الطلب فوراً للوحة العمل.
                </span>
              </span>
            </label>
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={appSaving}
              onClick={() => void saveWorkflow()}
            >
              حفظ
            </button>
          </div>
        )}

        {section === "administrations" && <AdministrationsManager />}

        {section === "departments" && <DepartmentsManager />}

        {section === "requestTypes" && (
          <RequestTypesManager departments={departments} />
        )}

        {section === "rooms" && (
          <div className="card space-y-3 p-4">
            <h2 className="text-lg font-bold text-primary">القاعات</h2>
            <p className="text-sm text-brand-gray">قاعة في كل سطر — تُستخدم في الحجوزات والنموذج العام.</p>
            <textarea
              className="input-field min-h-40 w-full"
              value={roomsText}
              onChange={(e) => setRoomsText(e.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="label-field" htmlFor="dayStart">
                  بداية ساعات العمل
                </label>
                <input
                  id="dayStart"
                  type="time"
                  className="input-field w-full"
                  dir="ltr"
                  value={dayStart}
                  onChange={(e) => setDayStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="dayEnd">
                  نهاية ساعات العمل
                </label>
                <input
                  id="dayEnd"
                  type="time"
                  className="input-field w-full"
                  dir="ltr"
                  value={dayEnd}
                  onChange={(e) => setDayEnd(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-brand-gray">
              تُستخدم ساعات العمل لحساب المواعيد المتاحة للحجز في نموذج الضيافة العام.
            </p>
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

        {section === "routing" && <RoutingRulesManager />}
      </div>
    </div>
  );
}
