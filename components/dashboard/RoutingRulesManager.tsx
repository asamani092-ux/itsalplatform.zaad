"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { IconButton } from "@/components/ui/icon-button";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { IconPlus, IconPower, IconTrash } from "@/components/shared/icons";

interface RoutingRuleRow {
  id: string;
  isActive: boolean;
  requestType: { id: string; name: string; slug: string };
  employee: { id: string; name: string; email: string };
}

interface RequestTypeOption {
  id: string;
  name: string;
  isActive?: boolean;
}

interface EmployeeOption {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

export default function RoutingRulesManager() {
  const [rules, setRules] = useState<RoutingRuleRow[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestTypeOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [requestTypeId, setRequestTypeId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RoutingRuleRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rulesRes, typesRes, teamRes] = await Promise.all([
        fetch("/api/manager/settings/routing-rules?all=1"),
        fetch("/api/manager/settings/request-types"),
        fetch("/api/manager/team"),
      ]);

      const rulesPayload = await parseApiResponse<{ rules: RoutingRuleRow[] }>(rulesRes);
      const typesPayload = await parseApiResponse<{ requestTypes: RequestTypeOption[] }>(
        typesRes,
      );
      const teamPayload = await parseApiResponse<{ employees: EmployeeOption[] }>(teamRes);

      if (!rulesRes.ok || !rulesPayload.success) {
        throw new Error(getApiErrorMessage(rulesPayload, "تعذّر تحميل القواعد"));
      }
      if (!typesRes.ok || !typesPayload.success) {
        throw new Error(getApiErrorMessage(typesPayload, "تعذّر تحميل أنواع الطلبات"));
      }
      if (!teamRes.ok || !teamPayload.success) {
        throw new Error(getApiErrorMessage(teamPayload, "تعذّر تحميل الموظفين"));
      }

      setRules(rulesPayload.data.rules);
      setRequestTypes(
        typesPayload.data.requestTypes.filter((t) => t.isActive !== false),
      );
      setEmployees(
        teamPayload.data.employees.filter(
          (e) => e.isActive && e.role === "EMPLOYEE",
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function mergeRule(updated: RoutingRuleRow) {
    setRules((prev) => {
      const without = prev.filter((r) => r.id !== updated.id);
      return [...without, updated].sort((a, b) =>
        a.requestType.name.localeCompare(b.requestType.name, "ar"),
      );
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!requestTypeId || !employeeId) {
      setError("اختر نوع الطلب والموظف");
      return;
    }
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/manager/settings/routing-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestTypeId, employeeId }),
      });
      const payload = await parseApiResponse<{ rule: RoutingRuleRow }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل إضافة القاعدة"));
      }
      mergeRule(payload.data.rule);
      setRequestTypeId("");
      setEmployeeId("");
      setStatus("تمت إضافة قاعدة التوجيه");
      window.setTimeout(() => setStatus(""), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rule: RoutingRuleRow) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/manager/settings/routing-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
      });
      const payload = await parseApiResponse<{ rule: RoutingRuleRow }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل التحديث"));
      }
      mergeRule(payload.data.rule);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/manager/settings/routing-rules?id=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" },
      );
      const payload = await parseApiResponse<{ deleted: boolean }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل الحذف"));
      }
      setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      setStatus("تم حذف القاعدة");
      window.setTimeout(() => setStatus(""), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <h2 className="text-lg font-bold text-primary">قواعد التوجيه</h2>
        <p className="text-sm text-brand-gray">
          عند وصول طلب جديد، يُسنَد تلقائياً للموظف حسب نوع الطلب. إن وُجدت أكثر من
          قاعدة لنفس النوع، تُستخدم الأقدم المفعّلة.
        </p>

        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => void handleCreate(e)}
        >
          <div className="space-y-1">
            <label className="label-field text-xs" htmlFor="routing-type">
              نوع الطلب
            </label>
            <select
              id="routing-type"
              className="input-field w-full text-sm"
              value={requestTypeId}
              disabled={saving || loading}
              onChange={(e) => setRequestTypeId(e.target.value)}
            >
              <option value="">اختر نوعاً...</option>
              {requestTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="label-field text-xs" htmlFor="routing-employee">
              الموظف المسؤول
            </label>
            <select
              id="routing-employee"
              className="input-field w-full text-sm"
              value={employeeId}
              disabled={saving || loading}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">اختر موظفاً...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="btn-primary w-full text-sm sm:w-auto"
              disabled={saving || loading}
            >
              <IconPlus size={16} />
              إضافة قاعدة
            </button>
          </div>
        </form>
      </div>

      {error && (
        <p className="text-sm text-[var(--zaad-danger)]" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="text-sm font-semibold text-primary" role="status">
          {status}
        </p>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="tmkeen-table">
          <thead>
            <tr>
              <th scope="col">نوع الطلب</th>
              <th scope="col">الموظف</th>
              <th scope="col">الحالة</th>
              <th scope="col">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-brand-gray">
                  جاري التحميل...
                </td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-brand-gray">
                  لا توجد قواعد بعد — أضف قاعدة أعلاه.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id}>
                  <td className="font-semibold text-primary">{rule.requestType.name}</td>
                  <td>{rule.employee.name}</td>
                  <td>
                    <span className={rule.isActive ? "badge-success" : "badge-warning"}>
                      {rule.isActive ? "مفعّلة" : "معطّلة"}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <IconButton
                        label={rule.isActive ? "تعطيل القاعدة" : "تفعيل القاعدة"}
                        icon={<IconPower size={18} />}
                        tone={rule.isActive ? "neutral" : "primary"}
                        disabled={saving}
                        onClick={() => void toggleActive(rule)}
                      />
                      <IconButton
                        label="حذف القاعدة"
                        icon={<IconTrash size={18} />}
                        tone="danger"
                        disabled={saving}
                        onClick={() => setDeleteTarget(rule)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف قاعدة التوجيه"
        body={
          deleteTarget
            ? `حذف ربط «${deleteTarget.requestType.name}» → «${deleteTarget.employee.name}»؟`
            : undefined
        }
        confirmLabel="حذف"
        destructive
        busy={saving}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
