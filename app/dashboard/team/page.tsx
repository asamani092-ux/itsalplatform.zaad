"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";

interface Employee {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
}

interface MemberForm {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: string;
}

const EMPTY_FORM: MemberForm = {
  name: "",
  email: "",
  phoneNumber: "",
  password: "",
  role: "EMPLOYEE",
};

function AddMemberModal({
  open,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: MemberForm) => Promise<void>;
  submitting: boolean;
  error: string;
}) {
  const [form, setForm] = useState<MemberForm>(EMPTY_FORM);

  useEffect(() => {
    if (open) setForm(EMPTY_FORM);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-member-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel card space-y-4">
        <h2 id="add-member-title" className="text-lg font-bold text-primary">
          إضافة عضو للفريق
        </h2>

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
              className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="member-email">
              البريد
            </label>
            <input
              id="member-email"
              className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
              dir="ltr"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="member-phone">
              الهاتف
            </label>
            <input
              id="member-phone"
              className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
              dir="ltr"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="label-field" htmlFor="member-password">
              كلمة المرور
            </label>
            <input
              id="member-password"
              className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="label-field" htmlFor="member-role">
              الدور
            </label>
            <select
              id="member-role"
              className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="EMPLOYEE">موظف</option>
              <option value="MANAGER">مدير</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-[var(--tmkeen-danger)] sm:col-span-2" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
            <button
              type="button"
              className="btn-secondary flex-1 focus-visible:ring-2 focus-visible:ring-primary/20"
              onClick={onClose}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 focus-visible:ring-2 focus-visible:ring-primary/20"
              disabled={submitting}
            >
              {submitting ? "جاري الإضافة..." : "إضافة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardTeamPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

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

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(form: MemberForm) {
    setSubmitting(true);
    setModalError("");
    const res = await fetch("/api/manager/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await parseApiResponse<unknown>(res);
    if (!res.ok || !payload.success) {
      setModalError(getApiErrorMessage(payload, "فشل الإنشاء"));
      setSubmitting(false);
      return;
    }
    setModalOpen(false);
    setSubmitting(false);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-gray">إدارة حسابات الموظفين والمديرين</p>
        <button
          type="button"
          className="btn-primary text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
          onClick={() => {
            setModalError("");
            setModalOpen(true);
          }}
        >
          + إضافة عضو
        </button>
      </div>

      {error && (
        <p className="text-sm text-[var(--tmkeen-danger)]" role="alert">
          {error}
        </p>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="tmkeen-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الهاتف</th>
              <th>الدور</th>
              <th>الحالة</th>
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
              employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="font-semibold">{emp.name}</td>
                  <td dir="ltr">{emp.phoneNumber}</td>
                  <td>{emp.role === "MANAGER" ? "مدير" : "موظف"}</td>
                  <td>
                    <span className={emp.isActive ? "badge-success" : "badge-danger"}>
                      {emp.isActive ? "نشط" : "معطّل"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddMemberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        submitting={submitting}
        error={modalError}
      />
    </div>
  );
}
