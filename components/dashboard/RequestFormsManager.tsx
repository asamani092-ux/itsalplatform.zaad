"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import DynamicSubmitForm from "@/components/public/DynamicSubmitForm";
import {
  FORM_FIELD_KEYS,
  formPublicPath,
  isLockedField,
  normalizeSlug,
  type FormFieldConfig,
  type FormFieldKey,
  type RequestFormData,
} from "@/lib/forms/schema";

interface Department {
  id: string;
  name: string;
  slug: string;
}

interface RequestType {
  id: string;
  name: string;
  slug: string;
  requiresVisitDate: boolean;
  departmentId: string | null;
}

const FIELD_TITLES: Record<FormFieldKey, string> = {
  department: "القسم",
  requestType: "نوع الطلب",
  title: "عنوان الطلب",
  description: "الوصف",
  requiredDate: "التاريخ المطلوب",
  visitDate: "تاريخ الزيارة",
  contactEmail: "البريد الإلكتروني",
  contactPhone: "رقم الجوال",
};

export default function RequestFormsManager({
  departments,
  requestTypes,
}: {
  departments: Department[];
  requestTypes: RequestType[];
}) {
  const [forms, setForms] = useState<RequestFormData[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<RequestFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [qrFormId, setQrFormId] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manager/forms");
      const payload = await parseApiResponse<{ forms: RequestFormData[] }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل النماذج"));
      }
      setForms(payload.data.forms);
      setSelectedId((prev) => prev || payload.data.forms[0]?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const found = forms.find((f) => f.id === selectedId) ?? null;
    setDraft(found ? { ...found, fields: { ...found.fields } } : null);
  }, [selectedId, forms]);

  const publicUrl = useMemo(
    () => (draft ? `${origin}${formPublicPath(draft.slug)}` : ""),
    [draft, origin],
  );

  function patchDraft(patch: Partial<RequestFormData>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function patchField(key: FormFieldKey, patch: Partial<FormFieldConfig>) {
    setDraft((prev) =>
      prev
        ? { ...prev, fields: { ...prev.fields, [key]: { ...prev.fields[key], ...patch } } }
        : prev,
    );
  }

  async function handleCreate() {
    if (!newName.trim()) {
      setError("اسم النموذج مطلوب");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/manager/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim() || newName }),
      });
      const payload = await parseApiResponse<{ form: RequestFormData }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل إنشاء النموذج"));
      }
      setCreating(false);
      setNewName("");
      setNewSlug("");
      await load();
      setSelectedId(payload.data.form.id);
      setStatus("تم إنشاء النموذج");
      window.setTimeout(() => setStatus(""), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`/api/manager/forms/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await parseApiResponse<{ form: RequestFormData }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل الحفظ"));
      }
      await load();
      setStatus("تم الحفظ — الرابط العام محدّث");
      window.setTimeout(() => setStatus(""), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!draft || draft.isDefault) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/manager/forms/${draft.id}`, { method: "DELETE" });
      const payload = await parseApiResponse<{ deleted: boolean }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل الحذف"));
      }
      setSelectedId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setStatus("تم نسخ الرابط");
    } catch {
      setStatus("تعذّر النسخ — انسخ الرابط يدوياً");
    }
    window.setTimeout(() => setStatus(""), 4000);
  }

  if (loading) {
    return (
      <div className="card py-10 text-center text-sm text-brand-gray">
        جاري تحميل النماذج...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card-section flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary">نماذج الطلبات</h2>
          <p className="mt-1 text-sm text-brand-gray">
            أنشئ أكثر من نموذج — لكل نموذج رابط عام و QR مستقل.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? "إلغاء" : "نموذج جديد"}
        </button>
      </div>

      {creating && (
        <div className="card grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="label-field" htmlFor="new-form-name">
              اسم النموذج
            </label>
            <input
              id="new-form-name"
              className="input-field w-full"
              value={newName}
              placeholder="مثال: طلبات التغطية الإعلامية"
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="new-form-slug">
              المعرّف في الرابط
            </label>
            <input
              id="new-form-slug"
              className="input-field w-full"
              dir="ltr"
              value={newSlug}
              placeholder="media-coverage"
              onChange={(e) => setNewSlug(normalizeSlug(e.target.value))}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={saving}
              onClick={() => void handleCreate()}
            >
              {saving ? "جاري الإنشاء..." : "إنشاء"}
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="tmkeen-table">
          <thead>
            <tr>
              <th>النموذج</th>
              <th>الرابط</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((form) => (
              <tr key={form.id}>
                <td className="font-semibold text-primary">
                  {form.name}
                  {form.isDefault && <span className="badge-warning ms-2">افتراضي</span>}
                </td>
                <td dir="ltr" className="text-xs">
                  {formPublicPath(form.slug)}
                </td>
                <td>
                  <span className={form.isPublished ? "badge-success" : "badge-danger"}>
                    {form.isPublished ? "منشور" : "غير منشور"}
                  </span>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() => setSelectedId(form.id)}
                    >
                      تحرير
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() => setQrFormId(form.id)}
                    >
                      QR
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="text-sm text-[var(--tmkeen-danger)]" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="text-sm font-semibold text-primary" role="status">
          {status}
        </p>
      )}

      {draft && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-primary">تحرير: {draft.name}</h3>
              <div className="flex items-center gap-2">
                <span className={draft.isPublished ? "badge-success" : "badge-danger"}>
                  {draft.isPublished ? "منشور" : "غير منشور"}
                </span>
                <button
                  type="button"
                  className={
                    draft.isPublished
                      ? "btn-secondary border-[var(--tmkeen-danger)] text-sm text-[var(--tmkeen-danger)]"
                      : "btn-primary text-sm"
                  }
                  onClick={() => patchDraft({ isPublished: !draft.isPublished })}
                >
                  {draft.isPublished ? "إيقاف النشر" : "نشر"}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="label-field" htmlFor="form-name">
                  اسم النموذج (داخلي)
                </label>
                <input
                  id="form-name"
                  className="input-field w-full"
                  value={draft.name}
                  onChange={(e) => patchDraft({ name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="form-slug">
                  المعرّف في الرابط
                </label>
                <input
                  id="form-slug"
                  className="input-field w-full"
                  dir="ltr"
                  value={draft.slug}
                  onChange={(e) => patchDraft({ slug: normalizeSlug(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="form-dept">
                  تثبيت القسم (اختياري)
                </label>
                <select
                  id="form-dept"
                  className="input-field w-full"
                  value={draft.departmentId ?? ""}
                  onChange={(e) => patchDraft({ departmentId: e.target.value || null })}
                >
                  <option value="">يختاره مقدّم الطلب</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="form-type">
                  تثبيت نوع الطلب (اختياري)
                </label>
                <select
                  id="form-type"
                  className="input-field w-full"
                  value={draft.requestTypeId ?? ""}
                  onChange={(e) => patchDraft({ requestTypeId: e.target.value || null })}
                >
                  <option value="">يختاره مقدّم الطلب</option>
                  {requestTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-surface-border bg-surface-muted p-3">
              <p className="text-xs text-brand-gray">الرابط العام</p>
              <p className="mt-1 break-all font-mono text-sm text-primary" dir="ltr">
                {publicUrl || formPublicPath(draft.slug)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn-secondary text-xs" onClick={() => void copyLink()}>
                  نسخ الرابط
                </button>
                <a
                  href={formPublicPath(draft.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-xs"
                >
                  فتح
                </a>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setQrFormId(draft.id)}
                >
                  عرض QR
                </button>
              </div>
            </div>
          </div>

          <div className="card space-y-3">
            <h3 className="font-bold text-primary">محتوى الصفحة</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="label-field" htmlFor="form-title">
                  العنوان الرئيسي
                </label>
                <input
                  id="form-title"
                  className="input-field w-full"
                  value={draft.pageTitle}
                  onChange={(e) => patchDraft({ pageTitle: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="form-subtitle">
                  العنوان الفرعي
                </label>
                <input
                  id="form-subtitle"
                  className="input-field w-full"
                  value={draft.pageSubtitle}
                  onChange={(e) => patchDraft({ pageSubtitle: e.target.value })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="label-field" htmlFor="form-intro">
                  نص تعريفي
                </label>
                <textarea
                  id="form-intro"
                  className="input-field min-h-20 w-full"
                  value={draft.introText}
                  onChange={(e) => patchDraft({ introText: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="form-submit">
                  نص زر الإرسال
                </label>
                <input
                  id="form-submit"
                  className="input-field w-full"
                  value={draft.submitLabel}
                  onChange={(e) => patchDraft({ submitLabel: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="label-field" htmlFor="form-success-title">
                  عنوان رسالة النجاح
                </label>
                <input
                  id="form-success-title"
                  className="input-field w-full"
                  value={draft.successTitle}
                  onChange={(e) => patchDraft({ successTitle: e.target.value })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="label-field" htmlFor="form-success-message">
                  نص رسالة النجاح
                </label>
                <textarea
                  id="form-success-message"
                  className="input-field min-h-20 w-full"
                  value={draft.successMessage}
                  onChange={(e) => patchDraft({ successMessage: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="card space-y-3">
            <div>
              <h3 className="font-bold text-primary">حقول النموذج</h3>
              <p className="mt-1 text-xs text-brand-gray">
                الحقول المقفلة أساسية لسير العمل — يمكن تغيير تسميتها فقط.
              </p>
            </div>
            {FORM_FIELD_KEYS.map((key) => {
              const field = draft.fields[key];
              const locked = isLockedField(key);
              return (
                <div
                  key={key}
                  className="space-y-2 rounded-lg border border-surface-border p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-primary">
                      {FIELD_TITLES[key]}
                      {locked && <span className="badge-warning ms-2">مقفل</span>}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={locked}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                          field.enabled
                            ? "bg-primary text-white"
                            : "border border-surface-border bg-surface text-brand-gray"
                        }`}
                        onClick={() => patchField(key, { enabled: !field.enabled })}
                      >
                        {field.enabled ? "ظاهر" : "مخفي"}
                      </button>
                      <button
                        type="button"
                        disabled={locked || !field.enabled}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                          field.required
                            ? "bg-secondary text-[var(--tmkeen-warning)]"
                            : "border border-surface-border bg-surface text-brand-gray"
                        }`}
                        onClick={() => patchField(key, { required: !field.required })}
                      >
                        {field.required ? "إلزامي" : "اختياري"}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="label-field text-xs" htmlFor={`fl-${key}`}>
                        التسمية
                      </label>
                      <input
                        id={`fl-${key}`}
                        className="input-field w-full text-sm"
                        value={field.label}
                        onChange={(e) => patchField(key, { label: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="label-field text-xs" htmlFor={`fp-${key}`}>
                        نص المساعدة
                      </label>
                      <input
                        id={`fp-${key}`}
                        className="input-field w-full text-sm"
                        value={field.placeholder}
                        onChange={(e) => patchField(key, { placeholder: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? "جاري الحفظ..." : "حفظ النموذج"}
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={saving}
              onClick={() => void load()}
            >
              استرجاع المحفوظ
            </button>
            {!draft.isDefault && (
              <button
                type="button"
                className="btn-secondary border-[var(--tmkeen-danger)] text-sm text-[var(--tmkeen-danger)]"
                disabled={saving}
                onClick={() => void handleDelete()}
              >
                حذف النموذج
              </button>
            )}
          </div>

          <div className="card-section">
            <h3 className="font-bold text-primary">معاينة</h3>
            <p className="mt-1 text-xs text-brand-gray">
              هذا ما يراه مقدّم الطلب عند فتح الرابط.
            </p>
          </div>
          <DynamicSubmitForm
            slug={draft.slug}
            preview
            initialDepartments={departments}
            initialRequestTypes={requestTypes.map((rt) => ({ ...rt, description: "" }))}
            settings={draft}
            pinnedDepartmentId={draft.departmentId}
            pinnedRequestTypeId={draft.requestTypeId}
          />
        </div>
      )}

      {qrFormId && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQrFormId("");
          }}
        >
          <div className="modal-panel card space-y-4 text-center">
            <h3 className="text-lg font-bold text-primary">رمز QR للنموذج</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/manager/forms/${qrFormId}/qr`}
              alt="رمز QR للنموذج"
              className="mx-auto h-64 w-64 rounded-lg border border-surface-border bg-white p-2"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={`/api/manager/forms/${qrFormId}/qr`}
                download
                className="btn-primary flex-1 text-sm"
              >
                تنزيل QR
              </a>
              <button
                type="button"
                className="btn-secondary flex-1 text-sm"
                onClick={() => setQrFormId("")}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
