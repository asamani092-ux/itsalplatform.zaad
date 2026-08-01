"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type EditorPanel = "main" | "content" | "fields";

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
  const [editorPanel, setEditorPanel] = useState<EditorPanel | null>(null);
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
      setDraft((prev) => {
        if (!prev) return prev;
        const fresh = payload.data.forms.find((f) => f.id === prev.id);
        return fresh ? { ...fresh, fields: { ...fresh.fields } } : prev;
      });
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

  function openEditor(form: RequestFormData) {
    setDraft({ ...form, fields: { ...form.fields } });
    setEditorPanel("main");
    setError("");
  }

  function closeEditor() {
    setEditorPanel(null);
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

  function flash(message: string) {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 4000);
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
      openEditor(payload.data.form);
      flash("تم إنشاء النموذج");
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
      flash("تم حفظ النموذج");
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
      closeEditor();
      await load();
      flash("تم حذف النموذج");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      flash("تم نسخ الرابط");
    } catch {
      flash("تعذّر النسخ — انسخ الرابط يدوياً");
    }
  }

  function openPreview(formId: string) {
    window.open(`/dashboard/forms/preview/${formId}`, "_blank", "noopener,noreferrer");
  }

  function deptName(id: string | null) {
    if (!id) return null;
    return departments.find((d) => d.id === id)?.name ?? null;
  }

  function typeName(id: string | null) {
    if (!id) return null;
    return requestTypes.find((rt) => rt.id === id)?.name ?? null;
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
            كل بطاقة = نموذج مستقل برابط وQR خاص به. افتح التحرير لنموذج واحد فقط.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={() => {
            setCreating(true);
            setError("");
          }}
        >
          <IconPlus size={18} />
          نموذج جديد
        </button>
      </div>

      {error && !editorPanel && !creating && (
        <p className="text-sm text-[var(--tmkeen-danger)]" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="text-sm font-semibold text-primary" role="status">
          {status}
        </p>
      )}

      {forms.length === 0 ? (
        <div className="card py-10 text-center text-sm text-brand-gray">
          لا توجد نماذج بعد — أنشئ النموذج الأول.
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {forms.map((form) => {
            const pinnedDept = deptName(form.departmentId);
            const pinnedType = typeName(form.requestTypeId);
            const url = `${origin}${formPublicPath(form.slug)}`;
            return (
              <li key={form.id}>
                <article className="card flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <h3 className="truncate text-base font-bold text-primary">
                        {form.name}
                      </h3>
                      <p className="truncate font-mono text-xs text-brand-gray" dir="ltr">
                        {formPublicPath(form.slug)}
                      </p>
                    </div>
                    <span
                      className={
                        form.isPublished ? "badge-success shrink-0" : "badge-danger shrink-0"
                      }
                    >
                      {form.isPublished ? "منشور" : "غير منشور"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {form.isDefault && <span className="badge-warning">افتراضي</span>}
                    {pinnedDept && (
                      <span className="badge-primary">قسم: {pinnedDept}</span>
                    )}
                    {pinnedType && (
                      <span className="badge-primary">نوع: {pinnedType}</span>
                    )}
                  </div>

                  <div className="mt-auto flex flex-wrap gap-1 border-t border-surface-border pt-3">
                    <IconButton
                      label={`تحرير نموذج ${form.name}`}
                      icon={<IconEdit size={18} />}
                      onClick={() => openEditor(form)}
                    />
                    <IconButton
                      label={`معاينة نموذج ${form.name}`}
                      icon={<IconEye size={18} />}
                      onClick={() => openPreview(form.id)}
                    />
                    <IconButton
                      label={`رمز QR لنموذج ${form.name}`}
                      icon={<IconQr size={18} />}
                      onClick={() => setQrFormId(form.id)}
                    />
                    <IconButton
                      label={`نسخ رابط نموذج ${form.name}`}
                      icon={<IconCopy size={18} />}
                      onClick={() => void copyLink(url || formPublicPath(form.slug))}
                    />
                    <IconLinkButton
                      label={`فتح الرابط العام لنموذج ${form.name}`}
                      icon={<IconExternal size={18} />}
                      href={formPublicPath(form.slug)}
                      target="_blank"
                      rel="noreferrer"
                    />
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {creating && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-form-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreating(false);
          }}
        >
          <div className="modal-panel card space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 id="create-form-title" className="text-lg font-bold text-primary">
                نموذج جديد
              </h3>
              <IconButton
                label="إغلاق"
                icon={<IconX size={18} />}
                onClick={() => setCreating(false)}
              />
            </div>
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
            {error && (
              <p className="text-sm text-[var(--tmkeen-danger)]" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={saving}
                onClick={() => void handleCreate()}
              >
                {saving ? "جاري الإنشاء..." : "إنشاء"}
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => setCreating(false)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {draft && editorPanel && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-form-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditor();
          }}
        >
          <div className="modal-panel wide card space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-brand-gray">تحرير نموذج واحد</p>
                <h3 id="edit-form-title" className="text-lg font-bold text-primary">
                  {draft.name}
                </h3>
              </div>
              <IconButton label="إغلاق" icon={<IconX size={18} />} onClick={closeEditor} />
            </div>

            {editorPanel === "main" && (
              <>
                <div className="flex flex-wrap items-center gap-2">
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
                    <p className="text-[11px] text-brand-gray">
                      إن ثُبّت القسم يختفي اختياره من النموذج العام.
                    </p>
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
                  <p className="text-xs text-brand-gray">رابط هذا النموذج</p>
                  <p className="mt-1 break-all font-mono text-sm text-primary" dir="ltr">
                    {publicUrl || formPublicPath(draft.slug)}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => setEditorPanel("content")}
                  >
                    محتوى هذا النموذج
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => setEditorPanel("fields")}
                  >
                    حقول هذا النموذج
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => openPreview(draft.id)}
                  >
                    <IconEye size={16} />
                    معاينة في نافذة
                  </button>
                  <p className="sm:col-span-3 text-[11px] text-brand-gray">
                    المعاينة تعرض آخر نسخة محفوظة — احفظ قبل المعاينة لرؤية التعديلات.
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-[var(--tmkeen-danger)]" role="alert">
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 border-t border-surface-border pt-3">
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
                    onClick={closeEditor}
                  >
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
              </>
            )}

            {editorPanel === "content" && (
              <>
                <p className="text-sm text-brand-gray">
                  نصوص الصفحة العامة لهذا النموذج فقط — لا تؤثر على النماذج الأخرى.
                </p>
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
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => setEditorPanel("main")}
                >
                  رجوع لإعدادات النموذج
                </button>
              </>
            )}

            {editorPanel === "fields" && (
              <>
                <p className="text-sm text-brand-gray">
                  الحقول الأساسية (مقفل) تظهر دائماً — يمكن تغيير تسميتها فقط. بقية الحقول
                  يمكن إظهارها أو إخفاؤها لهذا النموذج.
                </p>
                <div className="max-h-[50vh] space-y-3 overflow-y-auto pe-1">
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
                            {locked && (
                              <span className="badge-warning ms-2">أساسي — تسمية فقط</span>
                            )}
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
                              onChange={(e) =>
                                patchField(key, { placeholder: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => setEditorPanel("main")}
                >
                  رجوع لإعدادات النموذج
                </button>
              </>
            )}
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
