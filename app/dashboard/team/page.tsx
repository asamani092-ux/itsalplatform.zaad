"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { IconButton } from "@/components/ui/icon-button";
import {
  IconEdit,
  IconPlus,
  IconPower,
  IconSend,
  IconTrash,
  IconX,
} from "@/components/shared/icons";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import Skeleton from "@/components/ui/skeleton";

interface DepartmentOption {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  isActive: boolean;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
}

interface MemberForm {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: string;
  departmentId: string;
}

const EMPTY_FORM: MemberForm = {
  name: "",
  email: "",
  phoneNumber: "",
  password: "",
  role: "EMPLOYEE",
  departmentId: "",
};

function mergeEmployee(employees: Employee[], next: Employee): Employee[] {
  const idx = employees.findIndex((e) => e.id === next.id);
  if (idx === -1) return [...employees, next].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const copy = [...employees];
  copy[idx] = { ...copy[idx], ...next };
  return copy;
}

function MemberModal({
  open,
  mode,
  initial,
  departments,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: MemberForm;
  departments: DepartmentOption[];
  onClose: () => void;
  onSubmit: (form: MemberForm) => Promise<void>;
  submitting: boolean;
  error: string;
}) {
  const [form, setForm] = useState<MemberForm>(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel card space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h2 id="member-modal-title" className="text-lg font-bold text-primary">
            {mode === "create" ? "إضافة عضو للفريق" : "تعديل بيانات العضو"}
          </h2>
          <IconButton label="إغلاق" icon={<IconX size={18} />} onClick={onClose} />
        </div>

        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit(form);
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <label className="label-field" htmlFor="member-name">
              الاسم
            </label>
            <input
              id="member-name"
              className="input-field w-full"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="member-email">
              البريد (إلزامي)
            </label>
            <input
              id="member-email"
              className="input-field w-full"
              dir="ltr"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="member-phone">
              الهاتف (اختياري)
            </label>
            <input
              id="member-phone"
              className="input-field w-full"
              dir="ltr"
              inputMode="tel"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="label-field" htmlFor="member-password">
              {mode === "create" ? "كلمة المرور" : "كلمة مرور جديدة (اتركها فارغة للإبقاء)"}
            </label>
            <input
              id="member-password"
              className="input-field w-full"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={mode === "create"}
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="member-role">
              الدور
            </label>
            <select
              id="member-role"
              className="input-field w-full"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="EMPLOYEE">موظف</option>
              <option value="RECEPTION">استقبال</option>
              <option value="MANAGER">مدير</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="member-department">
              القسم (اختياري)
            </label>
            <select
              id="member-department"
              className="input-field w-full"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            >
              <option value="">— بدون قسم —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-[var(--zaad-danger)] sm:col-span-2" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              إلغاء
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardTeamPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState("");
  const [modalInitial, setModalInitial] = useState<MemberForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [resettingId, setResettingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manager/team");
      const payload = await parseApiResponse<{ employees: Employee[] }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر التحميل"));
      }
      setEmployees(payload.data.employees);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/manager/settings/departments");
      const payload = await parseApiResponse<{ departments: DepartmentOption[] }>(res);
      if (!res.ok || !payload.success) return;
      setDepartments(
        (payload.data.departments ?? []).map((d) => ({ id: d.id, name: d.name })),
      );
    } catch {
      // optional field
    }
  }, []);

  useEffect(() => {
    void load();
    void loadDepartments();
  }, [load, loadDepartments]);

  function openCreate() {
    setModalMode("create");
    setModalInitial(EMPTY_FORM);
    setEditingId("");
    setModalError("");
    setModalOpen(true);
  }

  function openEdit(employee: Employee) {
    setModalMode("edit");
    setModalInitial({
      name: employee.name,
      email: employee.email,
      phoneNumber: employee.phoneNumber ?? "",
      password: "",
      role: employee.role,
      departmentId: employee.departmentId ?? "",
    });
    setEditingId(employee.id);
    setModalError("");
    setModalOpen(true);
  }

  async function handleSubmit(form: MemberForm) {
    setSubmitting(true);
    setModalError("");
    try {
      const isEdit = modalMode === "edit";
      const departmentId = form.departmentId || null;
      const body = isEdit
        ? {
            id: editingId,
            name: form.name,
            email: form.email,
            phoneNumber: form.phoneNumber,
            role: form.role,
            departmentId,
            ...(form.password ? { password: form.password } : {}),
          }
        : {
            name: form.name,
            email: form.email,
            phoneNumber: form.phoneNumber,
            password: form.password,
            role: form.role,
            departmentId,
          };

      const res = await fetch("/api/manager/team", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await parseApiResponse<Employee>(res);
      if (!res.ok || !payload.success) {
        setModalError(getApiErrorMessage(payload, "فشل الحفظ"));
        return;
      }
      setModalOpen(false);
      if (payload.data?.id) {
        setEmployees((prev) => mergeEmployee(prev, payload.data));
      } else {
        await load();
      }
      setStatus(isEdit ? "تم تحديث بيانات العضو" : "تمت إضافة العضو");
      window.setTimeout(() => setStatus(""), 4000);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(employee: Employee) {
    setError("");
    const res = await fetch("/api/manager/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: employee.id, isActive: !employee.isActive }),
    });
    const payload = await parseApiResponse<Employee>(res);
    if (!res.ok || !payload.success) {
      setError(getApiErrorMessage(payload, "فشل التحديث"));
      return;
    }
    if (payload.data?.id) {
      setEmployees((prev) => mergeEmployee(prev, payload.data));
    } else {
      await load();
    }
  }

  async function sendResetLink(emp: Employee) {
    setError("");
    setResettingId(emp.id);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emp.email }),
      });
      const payload = await parseApiResponse<{ message?: string }>(res);
      if (!res.ok || !payload.success) {
        setError(getApiErrorMessage(payload, "تعذّر إرسال رابط الاستعادة"));
        return;
      }
      setStatus(payload.data.message ?? "تم إرسال رابط الاستعادة إن وُجد الحساب");
      window.setTimeout(() => setStatus(""), 5000);
    } finally {
      setResettingId("");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        `/api/manager/team?id=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" },
      );
      const payload = await parseApiResponse<{
        deleted: boolean;
        deactivated: boolean;
        message?: string;
        employee?: Employee;
      }>(res);
      if (!res.ok || !payload.success) {
        setError(getApiErrorMessage(payload, "فشل الحذف"));
        return;
      }
      setStatus(
        payload.data.deactivated
          ? (payload.data.message ?? "تم تعطيل الحساب")
          : "تم حذف العضو",
      );
      window.setTimeout(() => setStatus(""), 5000);
      const deletedId = deleteTarget.id;
      setDeleteTarget(null);
      if (payload.data.deactivated && payload.data.employee) {
        setEmployees((prev) => mergeEmployee(prev, payload.data.employee as Employee));
      } else if (payload.data.deleted) {
        setEmployees((prev) => prev.filter((e) => e.id !== deletedId));
      } else {
        await load();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-gray">إدارة حسابات الموظفين والمديرين</p>
        <button type="button" className="btn-primary text-sm" onClick={openCreate}>
          <IconPlus size={18} />
          إضافة عضو
        </button>
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
              <th>الاسم</th>
              <th>البريد</th>
              <th>الهاتف</th>
              <th>الدور</th>
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
              employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="font-semibold">{emp.name}</td>
                  <td dir="ltr" className="text-sm">
                    {emp.email}
                  </td>
                  <td dir="ltr">{emp.phoneNumber || "—"}</td>
                  <td>
                    {emp.role === "MANAGER"
                      ? "مدير"
                      : emp.role === "RECEPTION"
                        ? "استقبال"
                        : "موظف"}
                  </td>
                  <td>
                    <span className={emp.isActive ? "badge-success" : "badge-danger"}>
                      {emp.isActive ? "نشط" : "معطّل"}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <IconButton
                        label="تعديل"
                        icon={<IconEdit size={18} />}
                        onClick={() => openEdit(emp)}
                      />
                      <IconButton
                        label="إرسال رابط إعادة تعيين كلمة المرور"
                        icon={<IconSend size={18} />}
                        disabled={resettingId === emp.id}
                        onClick={() => void sendResetLink(emp)}
                      />
                      <IconButton
                        label={emp.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                        icon={<IconPower size={18} />}
                        tone={emp.isActive ? "neutral" : "primary"}
                        onClick={() => void toggleActive(emp)}
                      />
                      <IconButton
                        label="حذف"
                        icon={<IconTrash size={18} />}
                        tone="danger"
                        onClick={() => setDeleteTarget(emp)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MemberModal
        open={modalOpen}
        mode={modalMode}
        initial={modalInitial}
        departments={departments}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={modalError}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="تأكيد الحذف"
        body={
          deleteTarget
            ? `هل أنت متأكد من حذف «${deleteTarget.name}»؟ إذا كانت له طلبات مرتبطة سيُعطَّل الحساب بدل حذفه للحفاظ على سجل الطلبات.`
            : undefined
        }
        confirmLabel="تأكيد"
        destructive
        busy={submitting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
