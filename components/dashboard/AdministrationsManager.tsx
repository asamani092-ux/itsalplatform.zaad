"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { IconButton } from "@/components/ui/icon-button";
import { IconPower, IconTrash } from "@/components/shared/icons";
import Skeleton from "@/components/ui/skeleton";

interface Administration {
  id: string;
  name: string;
  slug: string;
  managerEmail: string;
  managerName: string;
  kind: "INTERNAL" | "EXTERNAL";
  isActive: boolean;
}

const EMPTY = {
  name: "",
  managerEmail: "",
  managerName: "",
  kind: "EXTERNAL" as const,
};

export default function AdministrationsManager() {
  const [items, setItems] = useState<Administration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<{
    name: string;
    managerEmail: string;
    managerName: string;
    kind: "INTERNAL" | "EXTERNAL";
  }>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manager/settings/administrations");
      const payload = await parseApiResponse<{ administrations: Administration[] }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر التحميل"));
      }
      setItems(payload.data.administrations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addAdministration() {
    if (!form.name.trim() || !form.managerEmail.trim()) {
      setError("الاسم وبريد المدير مطلوبان");
      return false;
    }
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/manager/settings/administrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await parseApiResponse<Administration>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل الإضافة"));
      }
      setForm(EMPTY);
      setStatus("تمت إضافة الإدارة");
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: Administration) {
    setError("");
    const res = await fetch("/api/manager/settings/administrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
    });
    const payload = await parseApiResponse<Administration>(res);
    if (!res.ok || !payload.success) {
      setError(getApiErrorMessage(payload, "فشل التحديث"));
      return;
    }
    await load();
  }

  async function remove(item: Administration) {
    setError("");
    const res = await fetch(
      `/api/manager/settings/administrations?id=${encodeURIComponent(item.id)}`,
      { method: "DELETE" },
    );
    const payload = await parseApiResponse<{ message?: string }>(res);
    if (!res.ok || !payload.success) {
      setError(getApiErrorMessage(payload, "فشل الحذف"));
      return;
    }
    setStatus(payload.data.message ?? "تم الحذف");
    await load();
  }

  return (
    <div className="card space-y-4 p-4">
      <div>
        <h2 className="text-lg font-bold text-primary">الإدارات ومدراؤها</h2>
        <p className="text-sm text-brand-gray">
          الإدارة الداخلية تملك الأقسام؛ الإدارات الخارجية تُستخدم لمعرفة مدير مقدّم الطلب.
        </p>
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

      <div className="flex justify-end">
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={() => {
            setForm(EMPTY);
            setCreating(true);
          }}
        >
          إضافة إدارة
        </button>
      </div>

      {creating && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-admin-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreating(false);
          }}
        >
          <div className="modal-panel card space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 id="create-admin-title" className="text-lg font-bold text-primary">
                إضافة إدارة
              </h3>
              <button type="button" className="btn-secondary text-sm" onClick={() => setCreating(false)}>
                إغلاق
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="input-field"
                placeholder="اسم الإدارة"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="اسم المدير"
                value={form.managerName}
                onChange={(e) => setForm({ ...form, managerName: e.target.value })}
              />
              <input
                className="input-field"
                dir="ltr"
                placeholder="بريد المدير"
                value={form.managerEmail}
                onChange={(e) => setForm({ ...form, managerEmail: e.target.value })}
              />
              <select
                className="input-field"
                value={form.kind}
                onChange={(e) =>
                  setForm({ ...form, kind: e.target.value as "INTERNAL" | "EXTERNAL" })
                }
              >
                <option value="EXTERNAL">خارجية (مقدّمة للطلبات)</option>
                <option value="INTERNAL">داخلية (اتصال مؤسسي)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setCreating(false)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={saving}
                onClick={async () => {
                  const ok = await addAdministration();
                  if (ok !== false) setCreating(false);
                }}
              >
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="tmkeen-table">
          <thead>
            <tr>
              <th>الإدارة</th>
              <th>النوع</th>
              <th>اسم المدير</th>
              <th>بريد المدير</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-6">
                  <Skeleton lines={3} />
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="font-semibold">{item.name}</td>
                  <td>{item.kind === "INTERNAL" ? "داخلية" : "خارجية"}</td>
                  <td className="text-sm">{item.managerName || "—"}</td>
                  <td dir="ltr" className="text-sm">
                    {item.managerEmail}
                  </td>
                  <td>
                    <span className={item.isActive ? "badge-success" : "badge-danger"}>
                      {item.isActive ? "نشطة" : "معطّلة"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <IconButton
                        label={item.isActive ? "تعطيل" : "تفعيل"}
                        icon={<IconPower size={18} />}
                        tone={item.isActive ? "neutral" : "primary"}
                        onClick={() => void toggleActive(item)}
                      />
                      <IconButton
                        label="حذف"
                        icon={<IconTrash size={18} />}
                        tone="danger"
                        onClick={() => void remove(item)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
