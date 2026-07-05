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

export default function DashboardTeamPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    role: "EMPLOYEE",
  });

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/manager/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await parseApiResponse<unknown>(res);
    if (!res.ok || !payload.success) {
      setError(getApiErrorMessage(payload, "فشل الإنشاء"));
      return;
    }
    setForm({ name: "", email: "", phoneNumber: "", password: "", role: "EMPLOYEE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={(e) => void handleCreate(e)} className="card grid gap-3 sm:grid-cols-2">
        <input
          className="input-field rounded-lg"
          placeholder="الاسم"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="input-field rounded-lg"
          placeholder="البريد"
          dir="ltr"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="input-field rounded-lg"
          placeholder="الهاتف"
          dir="ltr"
          value={form.phoneNumber}
          onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          required
        />
        <input
          className="input-field rounded-lg"
          type="password"
          placeholder="كلمة المرور"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <select
          className="input-field rounded-lg sm:col-span-2"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="EMPLOYEE">موظف</option>
          <option value="MANAGER">مدير</option>
        </select>
        <button type="submit" className="btn-primary rounded-lg sm:col-span-2">
          إضافة موظف
        </button>
      </form>

      {error && <p className="text-sm text-[var(--zaad-danger)]">{error}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="zaad-table">
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
                  <td>{emp.isActive ? "نشط" : "معطّل"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
