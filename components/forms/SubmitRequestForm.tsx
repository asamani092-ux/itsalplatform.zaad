"use client";

import { FormEvent, useState } from "react";

interface SubmitFormData {
  title: string;
  description: string;
  requiredDate: string;
  contactEmail: string;
  contactPhone: string;
  managerEmail: string;
}

interface ApiSuccessResponse {
  success: true;
  data: {
    id: string;
    status: string;
    approvalToken: string;
    approvalUrl: string;
  };
}

interface ApiErrorResponse {
  success: false;
  error: { message: string; code: string };
}

const INITIAL_FORM: SubmitFormData = {
  title: "",
  description: "",
  requiredDate: "",
  contactEmail: "",
  contactPhone: "",
  managerEmail: "",
};

export default function SubmitRequestForm() {
  const [form, setForm] = useState<SubmitFormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  function updateField<K extends keyof SubmitFormData>(
    key: K,
    value: SubmitFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as
        | ApiSuccessResponse
        | ApiErrorResponse;

      if (!response.ok || !payload.success) {
        const message =
          !payload.success
            ? payload.error.message
            : "تعذّر إرسال الطلب. حاول مرة أخرى.";
        throw new Error(message);
      }

      setSubmittedId(payload.data.id);
      setForm(INITIAL_FORM);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "حدث خطأ غير متوقع",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSubmittedId(null);
    setError(null);
    setForm(INITIAL_FORM);
  }

  if (submittedId) {
    return (
      <div className="card space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--zaad-success)_15%,transparent)]">
          <span className="text-2xl text-[var(--zaad-success)]" aria-hidden>
            ✓
          </span>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-primary">تم إرسال طلبك بنجاح</h2>
          <p className="text-sm text-brand-gray">
            رقم الطلب:{" "}
            <span className="font-mono font-semibold text-primary" dir="ltr">
              {submittedId}
            </span>
          </p>
        </div>
        <div className="card-section text-start text-sm text-brand-gray">
          <p>
            تم إرسال رابط الموافقة إلى بريد المدير المباشر. بعد موافقته، ينتقل
            الطلب تلقائياً إلى لوحة قسم الاتصال المؤسسي.
          </p>
        </div>
        <button type="button" className="btn-primary w-full" onClick={handleReset}>
          تقديم طلب جديد
        </button>
      </div>
    );
  }

  return (
    <form className="card space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-primary">بيانات الطلب</h2>
        <p className="text-sm text-brand-gray">
          املأ النموذج أدناه — سيُرسل رابط موافقة لمديرك المباشر.
        </p>
      </div>

      {error && (
        <div
          className="rounded-lg border border-[var(--zaad-danger)] bg-[var(--zaad-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--zaad-danger)]"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="label-field" htmlFor="title">
            عنوان الطلب
          </label>
          <input
            id="title"
            type="text"
            className="input-field"
            placeholder="مثال: تصميم بوستر فعالية"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="label-field" htmlFor="description">
            وصف الطلب
          </label>
          <textarea
            id="description"
            className="input-field min-h-28 resize-y"
            placeholder="اشرح احتياجك بالتفصيل..."
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="label-field" htmlFor="requiredDate">
            التاريخ المطلوب
          </label>
          <input
            id="requiredDate"
            type="date"
            className="input-field"
            dir="ltr"
            value={form.requiredDate}
            onChange={(e) => updateField("requiredDate", e.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="card-section space-y-4">
        <h3 className="text-lg font-bold text-primary">بيانات التواصل</h3>

        <div>
          <label className="label-field" htmlFor="contactEmail">
            بريدك الإلكتروني
          </label>
          <input
            id="contactEmail"
            type="email"
            className="input-field"
            dir="ltr"
            placeholder="you@zaad.org"
            value={form.contactEmail}
            onChange={(e) => updateField("contactEmail", e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="label-field" htmlFor="contactPhone">
            الجوال / واتساب
          </label>
          <input
            id="contactPhone"
            type="tel"
            className="input-field"
            dir="ltr"
            placeholder="+966500000000"
            value={form.contactPhone}
            onChange={(e) => updateField("contactPhone", e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="label-field" htmlFor="managerEmail">
            بريد المدير المباشر
          </label>
          <input
            id="managerEmail"
            type="email"
            className="input-field"
            dir="ltr"
            placeholder="manager@zaad.org"
            value={form.managerEmail}
            onChange={(e) => updateField("managerEmail", e.target.value)}
            required
            disabled={loading}
          />
          <p className="mt-2 text-xs text-brand-gray">
            سيستلم المدير رابط موافقة على هذا البريد — لا حاجة لتسجيل دخول.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? "جاري الإرسال..." : "إرسال الطلب"}
        </button>
        <button
          type="reset"
          className="btn-secondary flex-1"
          disabled={loading}
          onClick={() => {
            setForm(INITIAL_FORM);
            setError(null);
          }}
        >
          مسح الحقول
        </button>
      </div>
    </form>
  );
}
