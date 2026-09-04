"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { IconButton } from "@/components/ui/icon-button";
import { IconEdit, IconPlus, IconTrash, IconX } from "@/components/shared/icons";

export interface DepartmentRow {
  id: string;
  name: string;
  slug: string;
  managerEmail: string;
  receptionToken: string | null;
  isActive?: boolean;
}

export interface RequestTypeRow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  requiresVisitDate: boolean;
  departmentId: string | null;
  isActive?: boolean;
}

type Mutation = { method: "POST" | "PATCH" | "DELETE"; body?: unknown; query?: string };

function useTaxonomy<T>(endpoint: string, extract: (data: unknown) => T[]) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      const payload = await parseApiResponse<unknown>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر التحميل"));
      }
      setItems(extract(payload.data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, [endpoint, extract]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = useCallback(
    async (mutation: Mutation, successMessage: string) => {
      setError("");
      setStatus("");
      const url = mutation.query ? `${endpoint}?${mutation.query}` : endpoint;
      const res = await fetch(url, {
        method: mutation.method,
        ...(mutation.body
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(mutation.body),
            }
          : {}),
      });
      const payload = await parseApiResponse<{ message?: string }>(res);
      if (!res.ok || !payload.success) {
        setError(getApiErrorMessage(payload, "فشلت العملية"));
        return false;
      }
      setStatus(payload.data?.message ?? successMessage);
      window.setTimeout(() => setStatus(""), 5000);
      await load();
      return true;
    },
    [endpoint, load],
  );

  return { items, loading, error, status, load, mutate, setError };
}

export function DepartmentsManager() {
  const extract = useCallback(
    (data: unknown) => (data as { departments: DepartmentRow[] }).departments,
    [],
  );
  const { items, loading, error, status, mutate } = useTaxonomy<DepartmentRow>(
    "/api/manager/settings/departments",
    extract,
  );

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", managerEmail: "" });
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentRow | null>(null);
  const [teamMembers, setTeamMembers] = useState<{ name: string; email: string }[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/manager/team");
        const payload = await parseApiResponse<{
          employees: { name: string; email: string; isActive: boolean }[];
        }>(res);
        if (!res.ok || !payload.success) return;
        setTeamMembers(
          (payload.data.employees ?? [])
            .filter((e) => e.isActive)
            .map((e) => ({ name: e.name, email: e.email })),
        );
      } catch {
        // keep empty select
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-gray">الأقسام التي تستقبل الطلبات</p>
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? <IconX size={18} /> : <IconPlus size={18} />}
          {creating ? "إلغاء" : "قسم جديد"}
        </button>
      </div>

      {creating && (
        <form
          className="card grid gap-3 sm:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await mutate({ method: "POST", body: form }, "تمت إضافة القسم");
            if (ok) {
              setForm({ name: "", slug: "", managerEmail: "" });
              setCreating(false);
            }
          }}
        >
          <div className="space-y-1">
            <label className="label-field" htmlFor="dept-name">
              اسم القسم
            </label>
            <input
              id="dept-name"
              className="input-field w-full"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="dept-slug">
              المعرّف
            </label>
            <input
              id="dept-slug"
              className="input-field w-full"
              dir="ltr"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="dept-manager">
              مدير الجهة (من الفريق)
            </label>
            <select
              id="dept-manager"
              className="input-field w-full"
              value={form.managerEmail}
              onChange={(e) => setForm({ ...form, managerEmail: e.target.value })}
              required
            >
              <option value="">— اختر من الفريق —</option>
              {teamMembers.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary text-sm">
              حفظ القسم
            </button>
          </div>
        </form>
      )}

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
              <th>القسم</th>
              <th>المعرّف</th>
              <th>بريد المدير</th>
              <th>رمز الاستقبال</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center">
                  جاري التحميل...
                </td>
              </tr>
            ) : (
              items.map((d) => (
                <tr key={d.id}>
                  <td className="font-semibold">{d.name}</td>
                  <td dir="ltr">{d.slug}</td>
                  <td dir="ltr">{d.managerEmail}</td>
                  <td dir="ltr" className="text-xs">
                    {d.receptionToken ?? "—"}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <IconButton
                        label="تعديل القسم"
                        icon={<IconEdit size={18} />}
                        onClick={() => setEditing(d)}
                      />
                      <IconButton
                        label="حذف القسم"
                        icon={<IconTrash size={18} />}
                        tone="danger"
                        onClick={() => setDeleteTarget(d)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-panel card space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-primary">تعديل القسم</h3>
              <IconButton
                label="إغلاق"
                icon={<IconX size={18} />}
                onClick={() => setEditing(null)}
              />
            </div>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await mutate(
                  {
                    method: "PATCH",
                    body: {
                      id: editing.id,
                      name: editing.name,
                      managerEmail: editing.managerEmail,
                    },
                  },
                  "تم تحديث القسم",
                );
                if (ok) setEditing(null);
              }}
            >
              <div className="space-y-1">
                <label className="label-field" htmlFor="edit-dept-name">
                  اسم القسم
                </label>
                <input
                  id="edit-dept-name"
                  className="input-field w-full"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="edit-dept-manager">
                  مدير الجهة (من الفريق)
                </label>
                <select
                  id="edit-dept-manager"
                  className="input-field w-full"
                  value={editing.managerEmail}
                  onChange={(e) =>
                    setEditing({ ...editing, managerEmail: e.target.value })
                  }
                  required
                >
                  <option value="">— اختر من الفريق —</option>
                  {!teamMembers.some((m) => m.email === editing.managerEmail) &&
                    editing.managerEmail && (
                      <option value={editing.managerEmail}>
                        {editing.managerEmail} (حالي)
                      </option>
                    )}
                  {teamMembers.map((m) => (
                    <option key={m.email} value={m.email}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setEditing(null)}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn-primary flex-1">
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-panel card space-y-4">
            <h3 className="text-lg font-bold text-primary">تأكيد الحذف</h3>
            <p className="text-sm text-brand-gray">
              حذف «{deleteTarget.name}»؟ إذا كان مرتبطاً بطلبات أو أنواع طلبات سيُعطَّل بدل
              حذفه.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setDeleteTarget(null)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn-primary flex-1 border-[var(--zaad-danger)] bg-[var(--zaad-danger)]"
                onClick={async () => {
                  const ok = await mutate(
                    { method: "DELETE", query: `id=${encodeURIComponent(deleteTarget.id)}` },
                    "تم حذف القسم",
                  );
                  if (ok) setDeleteTarget(null);
                }}
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RequestTypesManager({
  departments,
}: {
  departments: DepartmentRow[];
}) {
  const extract = useCallback(
    (data: unknown) => (data as { requestTypes: RequestTypeRow[] }).requestTypes,
    [],
  );
  const { items, loading, error, status, mutate } = useTaxonomy<RequestTypeRow>(
    "/api/manager/settings/request-types",
    extract,
  );

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    requiresVisitDate: false,
    departmentId: "",
  });
  const [editing, setEditing] = useState<RequestTypeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RequestTypeRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-gray">
          أنواع الطلبات المتاحة للمستقبلين (حجز قاعات، تصاميم، زيارات، ...)
        </p>
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? <IconX size={18} /> : <IconPlus size={18} />}
          {creating ? "إلغاء" : "نوع طلب جديد"}
        </button>
      </div>

      {creating && (
        <form
          className="card grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await mutate(
              {
                method: "POST",
                body: { ...form, departmentId: form.departmentId || null },
              },
              "تمت إضافة نوع الطلب",
            );
            if (ok) {
              setForm({
                name: "",
                slug: "",
                description: "",
                requiresVisitDate: false,
                departmentId: "",
              });
              setCreating(false);
            }
          }}
        >
          <div className="space-y-1">
            <label className="label-field" htmlFor="rt-name">
              اسم النوع
            </label>
            <input
              id="rt-name"
              className="input-field w-full"
              placeholder="مثال: طلب تصميم"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="rt-slug">
              المعرّف
            </label>
            <input
              id="rt-slug"
              className="input-field w-full"
              dir="ltr"
              placeholder="design-request"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="label-field" htmlFor="rt-desc">
              الوصف
            </label>
            <input
              id="rt-desc"
              className="input-field w-full"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="rt-dept">
              القسم
            </label>
            <select
              id="rt-dept"
              className="input-field w-full"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            >
              <option value="">بدون قسم محدد</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm text-brand-gray">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--zaad-primary)]"
              checked={form.requiresVisitDate}
              onChange={(e) =>
                setForm({ ...form, requiresVisitDate: e.target.checked })
              }
            />
            يتطلب تاريخ زيارة
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary text-sm">
              حفظ النوع
            </button>
          </div>
        </form>
      )}

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
              <th>النوع</th>
              <th>المعرّف</th>
              <th>يتطلب زيارة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center">
                  جاري التحميل...
                </td>
              </tr>
            ) : (
              items.map((rt) => (
                <tr key={rt.id}>
                  <td className="font-semibold">{rt.name}</td>
                  <td dir="ltr">{rt.slug}</td>
                  <td>{rt.requiresVisitDate ? "نعم" : "لا"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <IconButton
                        label="تعديل نوع الطلب"
                        icon={<IconEdit size={18} />}
                        onClick={() => setEditing(rt)}
                      />
                      <IconButton
                        label="حذف نوع الطلب"
                        icon={<IconTrash size={18} />}
                        tone="danger"
                        onClick={() => setDeleteTarget(rt)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-panel card space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-primary">تعديل نوع الطلب</h3>
              <IconButton
                label="إغلاق"
                icon={<IconX size={18} />}
                onClick={() => setEditing(null)}
              />
            </div>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await mutate(
                  {
                    method: "PATCH",
                    body: {
                      id: editing.id,
                      name: editing.name,
                      description: editing.description ?? "",
                      requiresVisitDate: editing.requiresVisitDate,
                      departmentId: editing.departmentId,
                    },
                  },
                  "تم تحديث نوع الطلب",
                );
                if (ok) setEditing(null);
              }}
            >
              <div className="space-y-1">
                <label className="label-field" htmlFor="edit-rt-name">
                  اسم النوع
                </label>
                <input
                  id="edit-rt-name"
                  className="input-field w-full"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="edit-rt-dept">
                  القسم
                </label>
                <select
                  id="edit-rt-dept"
                  className="input-field w-full"
                  value={editing.departmentId ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, departmentId: e.target.value || null })
                  }
                >
                  <option value="">بدون قسم محدد</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-brand-gray">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--zaad-primary)]"
                  checked={editing.requiresVisitDate}
                  onChange={(e) =>
                    setEditing({ ...editing, requiresVisitDate: e.target.checked })
                  }
                />
                يتطلب تاريخ زيارة
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setEditing(null)}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn-primary flex-1">
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-panel card space-y-4">
            <h3 className="text-lg font-bold text-primary">تأكيد الحذف</h3>
            <p className="text-sm text-brand-gray">
              حذف «{deleteTarget.name}»؟ إذا كان مستخدماً في طلبات قائمة سيُعطَّل بدل حذفه.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setDeleteTarget(null)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn-primary flex-1 border-[var(--zaad-danger)] bg-[var(--zaad-danger)]"
                onClick={async () => {
                  const ok = await mutate(
                    { method: "DELETE", query: `id=${encodeURIComponent(deleteTarget.id)}` },
                    "تم حذف نوع الطلب",
                  );
                  if (ok) setDeleteTarget(null);
                }}
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
