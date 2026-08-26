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
  kind: "INTERNAL" | "EXTERNAL";
  isActive: boolean;
}

const EMPTY = { name: "", slug: "", managerEmail: "", kind: "EXTERNAL" as const };

export default function AdministrationsManager() {
  const [items, setItems] = useState<Administration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<{
    name: string;
    slug: string;
    managerEmail: string;
    kind: "INTERNAL" | "EXTERNAL";
  }>(EMPTY);
  const [saving, setSaving] = useState(false);

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
    if (!form.name.trim() || !form.slug.trim() || !form.managerEmail.trim()) {
      setError("الاسم والمعرّف والبريد مطلوبة");
      return;
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
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

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <input
          className="input-field"
          placeholder="اسم الإدارة"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="input-field"
          dir="ltr"
          placeholder="المعرّف (slug)"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
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
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={saving}
          onClick={() => void addAdministration()}
        >
          إضافة
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="tmkeen-table">
          <thead>
            <tr>
              <th>الإدارة</th>
              <th>النوع</th>
              <th>مدير الإدارة</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6">
                  <Skeleton lines={3} />
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="font-semibold">{item.name}</td>
                  <td>{item.kind === "INTERNAL" ? "داخلية" : "خارجية"}</td>
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
