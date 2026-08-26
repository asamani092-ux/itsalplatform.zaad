"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { IconButton } from "@/components/ui/icon-button";
import { IconTrash } from "@/components/shared/icons";
import Skeleton from "@/components/ui/skeleton";

interface GrantStage {
  id: string;
  index: number;
  label: string;
  amount: number | null;
  dueDate: string | null;
  status: "Pending" | "Done";
  note: string;
}

interface Grant {
  id: string;
  title: string;
  donorName: string;
  amount: number;
  details: string;
  stageCount: number;
  status: "Open" | "Closed";
  department?: { id: string; name: string } | null;
  stages: GrantStage[];
}

interface GrantKpis {
  totalGrants: number;
  openGrants: number;
  closedGrants: number;
  totalAmount: number;
  openAmount: number;
  overdueStages: number;
}

function formatAmount(value: number) {
  return `${value.toLocaleString("ar-SA")} ريال`;
}

const EMPTY_FORM = {
  title: "",
  donorName: "",
  amount: "",
  details: "",
  stageCount: "0",
};

export default function GrantsManager() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [kpis, setKpis] = useState<GrantKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manager/grants");
      const payload = await parseApiResponse<{ grants: Grant[]; kpis: GrantKpis }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل المنح"));
      }
      setGrants(payload.data.grants);
      setKpis(payload.data.kpis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addGrant() {
    setError("");
    setStatus("");
    if (!form.title.trim() || !form.donorName.trim()) {
      setError("اسم المنحة والمانح مطلوبان");
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("أدخل مبلغاً صحيحاً");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/manager/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          donorName: form.donorName,
          amount,
          details: form.details,
          stageCount: Number(form.stageCount) || 0,
        }),
      });
      const payload = await parseApiResponse<Grant>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل إضافة المنحة"));
      }
      setForm(EMPTY_FORM);
      setStatus("تمت إضافة المنحة");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function updateStage(
    grantId: string,
    stageId: string,
    patch: {
      status?: "Pending" | "Done";
      note?: string;
      dueDate?: string | null;
      amount?: number | null;
    },
  ) {
    setError("");
    const res = await fetch(`/api/manager/grants/${grantId}/stages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId, ...patch }),
    });
    const payload = await parseApiResponse<Grant>(res);
    if (!res.ok || !payload.success) {
      setError(getApiErrorMessage(payload, "فشل تحديث المرحلة"));
      return;
    }
    setGrants((prev) => prev.map((g) => (g.id === grantId ? payload.data : g)));
    await refreshKpis();
  }

  async function setGrantStatus(grantId: string, next: "Open" | "Closed") {
    setError("");
    const res = await fetch(`/api/manager/grants/${grantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const payload = await parseApiResponse<Grant>(res);
    if (!res.ok || !payload.success) {
      setError(getApiErrorMessage(payload, "فشل تحديث الحالة"));
      return;
    }
    setGrants((prev) => prev.map((g) => (g.id === grantId ? payload.data : g)));
    await refreshKpis();
  }

  async function removeGrant(grantId: string) {
    setError("");
    const res = await fetch(`/api/manager/grants/${grantId}`, { method: "DELETE" });
    const payload = await parseApiResponse<{ deleted: boolean }>(res);
    if (!res.ok || !payload.success) {
      setError(getApiErrorMessage(payload, "فشل الحذف"));
      return;
    }
    setGrants((prev) => prev.filter((g) => g.id !== grantId));
    await refreshKpis();
  }

  async function refreshKpis() {
    try {
      const res = await fetch("/api/manager/grants");
      const payload = await parseApiResponse<{ kpis: GrantKpis }>(res);
      if (payload.success) setKpis(payload.data.kpis);
    } catch {
      // non-critical
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-brand-gray">
        إدارة منح تنمية الموارد المالية — من إضافة المنحة ومتابعة مراحلها حتى الإغلاق.
      </p>

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

      {kpis && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="zad-kpi">
            <p className="zad-kpi__label">إجمالي المنح</p>
            <p className="zad-kpi__value">{kpis.totalGrants}</p>
            <span className="text-xs text-brand-gray">
              {kpis.openGrants} مفتوحة · {kpis.closedGrants} مغلقة
            </span>
          </div>
          <div className="zad-kpi">
            <p className="zad-kpi__label">إجمالي المبالغ</p>
            <p className="zad-kpi__value">{formatAmount(kpis.totalAmount)}</p>
          </div>
          <div className="zad-kpi">
            <p className="zad-kpi__label">مبالغ المنح المفتوحة</p>
            <p className="zad-kpi__value">{formatAmount(kpis.openAmount)}</p>
          </div>
          <div className="zad-kpi">
            <p className="zad-kpi__label">مراحل متأخرة</p>
            <p className="zad-kpi__value">{kpis.overdueStages}</p>
            <span className={kpis.overdueStages > 0 ? "badge-danger" : "badge-success"}>
              {kpis.overdueStages > 0 ? "تحتاج متابعة" : "منتظمة"}
            </span>
          </div>
        </div>
      )}

      <div className="card space-y-3 p-4">
        <h2 className="text-lg font-bold text-primary">إضافة منحة</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input
            className="input-field"
            placeholder="اسم المنحة"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="input-field"
            placeholder="المانح"
            value={form.donorName}
            onChange={(e) => setForm({ ...form, donorName: e.target.value })}
          />
          <input
            className="input-field"
            type="number"
            min={0}
            placeholder="المبلغ (ريال)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <input
            className="input-field"
            type="number"
            min={0}
            placeholder="عدد مراحل المتابعة (0 = إغلاق مباشر)"
            value={form.stageCount}
            onChange={(e) => setForm({ ...form, stageCount: e.target.value })}
          />
          <input
            className="input-field lg:col-span-2"
            placeholder="تفاصيل المنحة (اختياري)"
            value={form.details}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
          />
        </div>
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={saving}
          onClick={() => void addGrant()}
        >
          {saving ? "جاري الحفظ..." : "إضافة المنحة"}
        </button>
      </div>

      {loading ? (
        <div className="card p-4">
          <Skeleton lines={4} />
        </div>
      ) : grants.length === 0 ? (
        <p className="text-sm text-brand-gray">لا توجد منح مضافة بعد.</p>
      ) : (
        <div className="space-y-3">
          {grants.map((grant) => {
            const done = grant.stages.filter((s) => s.status === "Done").length;
            const expanded = expandedId === grant.id;
            return (
              <div key={grant.id} className="card space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-primary">{grant.title}</h3>
                      <span
                        className={grant.status === "Open" ? "badge-warning" : "badge-success"}
                      >
                        {grant.status === "Open" ? "مفتوحة" : "مغلقة"}
                      </span>
                    </div>
                    <p className="text-sm text-brand-gray">
                      المانح: {grant.donorName} · {formatAmount(grant.amount)} ·{" "}
                      {done}/{grant.stages.length} مرحلة
                    </p>
                    {grant.details && (
                      <p className="mt-1 text-xs text-brand-gray">{grant.details}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() => setExpandedId(expanded ? null : grant.id)}
                    >
                      {expanded ? "إخفاء المراحل" : "عرض المراحل"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() =>
                        void setGrantStatus(
                          grant.id,
                          grant.status === "Open" ? "Closed" : "Open",
                        )
                      }
                    >
                      {grant.status === "Open" ? "إغلاق المنحة" : "إعادة فتح"}
                    </button>
                    <IconButton
                      label="حذف المنحة"
                      icon={<IconTrash size={18} />}
                      tone="danger"
                      onClick={() => void removeGrant(grant.id)}
                    />
                  </div>
                </div>

                {expanded && (
                  <div className="overflow-x-auto">
                    <table className="tmkeen-table">
                      <thead>
                        <tr>
                          <th scope="col">المرحلة</th>
                          <th scope="col">المبلغ</th>
                          <th scope="col">تاريخ المتابعة</th>
                          <th scope="col">ملاحظة</th>
                          <th scope="col">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grant.stages.map((stage) => (
                          <tr key={stage.id}>
                            <td className="font-semibold">{stage.label}</td>
                            <td dir="ltr">
                              {stage.amount != null ? formatAmount(stage.amount) : "—"}
                            </td>
                            <td>
                              <input
                                type="date"
                                className="input-field"
                                defaultValue={
                                  stage.dueDate ? stage.dueDate.slice(0, 10) : ""
                                }
                                onBlur={(e) =>
                                  void updateStage(grant.id, stage.id, {
                                    dueDate: e.target.value || null,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="input-field"
                                defaultValue={stage.note}
                                placeholder="ملاحظة المتابعة"
                                onBlur={(e) =>
                                  void updateStage(grant.id, stage.id, {
                                    note: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className={
                                  stage.status === "Done"
                                    ? "badge-success"
                                    : "badge-warning"
                                }
                                onClick={() =>
                                  void updateStage(grant.id, stage.id, {
                                    status:
                                      stage.status === "Done" ? "Pending" : "Done",
                                  })
                                }
                              >
                                {stage.status === "Done" ? "مكتملة" : "قيد المتابعة"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
