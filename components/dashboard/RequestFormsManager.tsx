"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import {
  FORM_FIELD_KEYS,
  formPublicPath,
  isLockedField,
  normalizeSlug,
  type FormFieldConfig,
  type FormFieldKey,
  type RequestFormData,
} from "@/lib/forms/schema";
import { IconButton, IconLinkButton } from "@/components/ui/icon-button";
import {
  IconCopy,
  IconEdit,
  IconExternal,
  IconEye,
  IconPlus,
  IconQr,
  IconTrash,
  IconX,
} from "@/components/shared/icons";

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
  const [draft, setDraft] = useState<RequestFormData | null>(null);
  const [editOpen, setEditOpen] = useState(false);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const publicUrl = useMemo(
    () => (draft ? `${origin}${formPublicPath(draft.slug)}` : ""),
    [draft, origin],
  );

  function openEdit(form: RequestFormData) {
    setDraft({ ...form, fields: { ...form.fields } });
    setEditOpen(true);
    setError("");
  }

  function closeEdit() {
    setEditOpen(false);
    setDraft(null);
  }

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
      openEdit(payload.data.form);
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
      setDraft({ ...payload.data.form, fields: { ...payload.data.form.fields } });
      setStatus("تم الحفظ");
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
      closeEdit();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary">نماذج الطلبات</h2>
          <p className="mt-1 text-sm text-brand-gray">
            إدارة النماذج بروابط و QR مستقلة — التحرير في نافذة، والمعاينة في صفحة منفصلة.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? <IconX size={18} /> : <IconPlus size={18} />}
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

      {error && !editOpen && (
        <p className="text-sm text-[var(--zaad-danger)]" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="text-sm font-semibold text-primary" role="status">
          {status}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {forms.map((form) => {
          const url = `${origin}${formPublicPath(form.slug)}`;
          return (
            <article key={form.id} className="card flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-primary">{form.name}</h3>
                  <p className="mt-1 break-all font-mono text-xs text-brand-gray" dir="ltr">
                    {formPublicPath(form.slug)}
                  </p>
                </div>
                <span className={form.isPublished ? "badge-success" : "badge-danger"}>
                  {form.isPublished ? "منشور" : "مسودة"}
                </span>
              </div>
              {form.isDefault && <span className="badge-warning w-fit">افتراضي</span>}
              <div className="mt-auto flex flex-wrap gap-1">
                <IconButton
                  label="تحرير"
                  icon={<IconEdit size={18} />}
                  onClick={() => openEdit(form)}
                />
                <IconLinkButton
                  label="معاينة حقيقية"
                  icon={<IconEye size={18} />}
                  href={`/dashboard/forms/preview/${form.id}`}
                />
                <IconButton
                  label="نسخ الرابط"
                  icon={<IconCopy size={18} />}
                  onClick={() => void copyLink(url || formPublicPath(form.slug))}
                />
                <IconButton
                  label="رمز QR"
                  icon={<IconQr size={18} />}
                  onClick={() => setQrFormId(form.id)}
                />
                <IconLinkButton
                  label="الرابط العام"
                  icon={<IconExternal size={18} />}
                  href={formPublicPath(form.slug)}
                  target="_blank"
                  rel="noreferrer"
                />
              </div>
            </article>
          );
        })}
      </div>

      {editOpen && draft && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="form-edit-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div className="modal-panel wide card max-h-[90vh] space-y-4 overflow-y-auto">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 id="form-edit-title" className="text-lg font-bold text-primary">
                تحرير: {draft.name}
              </h3>
              <IconButton label="إغلاق" icon={<IconX size={18} />} onClick={closeEdit} />
            </div>

            {error && (
              <p className="text-sm text-[var(--zaad-danger)]" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span className={draft.isPublished ? "badge-success" : "badge-danger"}>
                {draft.isPublished ? "منشور" : "غير منشور"}
              </span>
              <button
                type="button"
                className={
                  draft.isPublished
                    ? "btn-secondary border-[var(--zaad-danger)] text-sm text-[var(--zaad-danger)]"
                    : "btn-primary text-sm"
                }
                onClick={() => patchDraft({ isPublished: !draft.isPublished })}
              >
                {draft.isPublished ? "إيقاف النشر" : "نشر"}
              </button>
              <Link
                href={`/dashboard/forms/preview/${draft.id}`}
                className="btn-secondary text-sm"
              >
                معاينة حقيقية
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="label-field" htmlFor="form-name">
                  اسم النموذج
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
                  تثبيت القسم
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
                  تثبيت نوع الطلب
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
            </div>

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

            <div className="space-y-3">
              <h4 className="font-bold text-primary">حقول النموذج</h4>
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
                              ? "bg-secondary text-[var(--zaad-warning)]"
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

            <div className="flex flex-wrap gap-2 border-t border-surface-border pt-3">
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={closeEdit}>
                إغلاق
              </button>
              {!draft.isDefault && (
                <IconButton
                  label="حذف النموذج"
                  icon={<IconTrash size={18} />}
                  tone="danger"
                  disabled={saving}
                  onClick={() => void handleDelete()}
                />
              )}
            </div>
          </div>
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
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-primary">رمز QR للنموذج</h3>
              <IconButton
                label="إغلاق"
                icon={<IconX size={18} />}
                onClick={() => setQrFormId("")}
              />
            </div>
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
