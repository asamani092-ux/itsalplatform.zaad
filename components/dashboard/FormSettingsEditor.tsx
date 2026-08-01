"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import {
  DEFAULT_FORM_SETTINGS,
  FORM_FIELD_KEYS,
  isLockedField,
  type FormFieldConfig,
  type FormFieldKey,
  type FormSettingsData,
} from "@/lib/form-settings/schema";

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

export default function FormSettingsEditor({
  onChange,
}: {
  onChange?: (settings: FormSettingsData) => void;
}) {
  const [settings, setSettings] = useState<FormSettingsData>(DEFAULT_FORM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manager/settings/form");
      const payload = await parseApiResponse<{ settings: FormSettingsData }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل إعدادات النموذج"));
      }
      setSettings(payload.data.settings);
      onChange?.(payload.data.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateField(key: FormFieldKey, patch: Partial<FormFieldConfig>) {
    setSettings((prev) => {
      const next: FormSettingsData = {
        ...prev,
        fields: { ...prev.fields, [key]: { ...prev.fields[key], ...patch } },
      };
      onChange?.(next);
      return next;
    });
  }

  function updateContent(patch: Partial<Omit<FormSettingsData, "fields">>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      onChange?.(next);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/manager/settings/form", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = await parseApiResponse<{ settings: FormSettingsData }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل الحفظ"));
      }
      setSettings(payload.data.settings);
      onChange?.(payload.data.settings);
      setStatus("تم حفظ الإعدادات — ستظهر مباشرة على /request");
      window.setTimeout(() => setStatus(""), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card py-10 text-center text-sm text-brand-gray">
        جاري تحميل إعدادات النموذج...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-primary">حالة النشر</h2>
            <p className="mt-1 text-xs text-brand-gray">
              الرابط العام:{" "}
              <a
                href="/request"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary underline"
                dir="ltr"
              >
                /request
              </a>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={settings.isPublished ? "badge-success" : "badge-danger"}>
              {settings.isPublished ? "منشور" : "غير منشور"}
            </span>
            <button
              type="button"
              className={
                settings.isPublished
                  ? "btn-secondary border-[var(--tmkeen-danger)] text-sm text-[var(--tmkeen-danger)]"
                  : "btn-primary text-sm"
              }
              onClick={() => updateContent({ isPublished: !settings.isPublished })}
            >
              {settings.isPublished ? "إيقاف النشر" : "نشر النموذج"}
            </button>
          </div>
        </div>
        <p className="text-xs text-brand-gray">
          عند إيقاف النشر تظهر للزائر رسالة أن استقبال الطلبات متوقف مؤقتاً، دون تعطيل
          الطلبات القائمة.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-bold text-primary">محتوى الصفحة</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="label-field" htmlFor="fs-title">
              العنوان الرئيسي
            </label>
            <input
              id="fs-title"
              className="input-field w-full"
              value={settings.pageTitle}
              onChange={(e) => updateContent({ pageTitle: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="fs-subtitle">
              العنوان الفرعي
            </label>
            <input
              id="fs-subtitle"
              className="input-field w-full"
              value={settings.pageSubtitle}
              onChange={(e) => updateContent({ pageSubtitle: e.target.value })}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="label-field" htmlFor="fs-intro">
              نص تعريفي (اختياري)
            </label>
            <textarea
              id="fs-intro"
              className="input-field min-h-20 w-full"
              value={settings.introText}
              onChange={(e) => updateContent({ introText: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="fs-submit">
              نص زر الإرسال
            </label>
            <input
              id="fs-submit"
              className="input-field w-full"
              value={settings.submitLabel}
              onChange={(e) => updateContent({ submitLabel: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label-field" htmlFor="fs-success-title">
              عنوان رسالة النجاح
            </label>
            <input
              id="fs-success-title"
              className="input-field w-full"
              value={settings.successTitle}
              onChange={(e) => updateContent({ successTitle: e.target.value })}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="label-field" htmlFor="fs-success-message">
              نص رسالة النجاح
            </label>
            <textarea
              id="fs-success-message"
              className="input-field min-h-20 w-full"
              value={settings.successMessage}
              onChange={(e) => updateContent({ successMessage: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <div>
          <h2 className="text-lg font-bold text-primary">حقول النموذج</h2>
          <p className="mt-1 text-xs text-brand-gray">
            الحقول المقفلة أساسية لسير العمل (التوجيه، الموافقة، الإشعارات) — يمكن تغيير
            تسميتها فقط.
          </p>
        </div>

        <div className="space-y-3">
          {FORM_FIELD_KEYS.map((key) => {
            const field = settings.fields[key];
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
                      aria-pressed={field.enabled}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                        field.enabled
                          ? "bg-primary text-white"
                          : "border border-surface-border bg-surface text-brand-gray"
                      }`}
                      onClick={() => updateField(key, { enabled: !field.enabled })}
                    >
                      {field.enabled ? "ظاهر" : "مخفي"}
                    </button>
                    <button
                      type="button"
                      disabled={locked || !field.enabled}
                      aria-pressed={field.required}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                        field.required
                          ? "bg-secondary text-[var(--tmkeen-warning)]"
                          : "border border-surface-border bg-surface text-brand-gray"
                      }`}
                      onClick={() => updateField(key, { required: !field.required })}
                    >
                      {field.required ? "إلزامي" : "اختياري"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="label-field text-xs" htmlFor={`label-${key}`}>
                      التسمية
                    </label>
                    <input
                      id={`label-${key}`}
                      className="input-field w-full text-sm"
                      value={field.label}
                      onChange={(e) => updateField(key, { label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="label-field text-xs" htmlFor={`ph-${key}`}>
                      نص المساعدة
                    </label>
                    <input
                      id={`ph-${key}`}
                      className="input-field w-full text-sm"
                      value={field.placeholder}
                      onChange={(e) => updateField(key, { placeholder: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={saving}
          onClick={() => void load()}
        >
          استرجاع المحفوظ
        </button>
      </div>
    </div>
  );
}
