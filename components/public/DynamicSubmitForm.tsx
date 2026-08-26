"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";
import {
  DEFAULT_FORM_SETTINGS,
  type FormSettingsData,
} from "@/lib/forms/schema";
import Stepper from "@/components/ui/stepper";
import RoomAvailabilityCalendar from "@/components/public/RoomAvailabilityCalendar";

/** Client-safe duplicate of lib/hospitality HOSPITALITY_TYPE_SLUG (server-only module). */
const HOSPITALITY_TYPE_SLUG = "hospitality-booking";

interface Department {
  id: string;
  name: string;
  slug: string;
}

interface RequestType {
  id: string;
  name: string;
  slug: string;
  description: string;
  requiresVisitDate: boolean;
  departmentId: string | null;
}

interface Administration {
  id: string;
  name: string;
  slug: string;
}

interface FieldErrors {
  departmentId?: string;
  requestTypeId?: string;
  title?: string;
  description?: string;
  requiredDate?: string;
  visitDate?: string;
  contactEmail?: string;
  contactPhone?: string;
}

function resolveSlugDefaults(
  slug: string,
  departments: Department[],
  requestTypes: RequestType[],
) {
  let departmentId = "";
  let requestTypeId = "";
  const deptBySlug = departments.find((d) => d.slug === slug);
  const typeBySlug = requestTypes.find((rt) => rt.slug === slug);
  if (deptBySlug) departmentId = deptBySlug.id;
  if (typeBySlug) {
    requestTypeId = typeBySlug.id;
    if (typeBySlug.departmentId) departmentId = typeBySlug.departmentId;
  }
  return { departmentId, requestTypeId };
}

function validateFields(
  values: {
    departmentId: string;
    requestTypeId: string;
    title: string;
    description: string;
    requiredDate: string;
    visitDate: string;
    contactEmail: string;
    contactPhone: string;
    needsVisit: boolean;
  },
  settings: FormSettingsData,
): FieldErrors {
  const errors: FieldErrors = {};
  const f = settings.fields;

  if (!values.departmentId) errors.departmentId = "اختر القسم";
  if (!values.requestTypeId) errors.requestTypeId = "اختر نوع الطلب";
  if (!values.title.trim()) errors.title = "العنوان مطلوب";

  if (f.description.enabled && f.description.required && !values.description.trim()) {
    errors.description = "الوصف مطلوب";
  }
  if (f.requiredDate.enabled && f.requiredDate.required && !values.requiredDate) {
    errors.requiredDate = "التاريخ المطلوب مطلوب";
  }
  if (values.needsVisit && f.visitDate.enabled && !values.visitDate) {
    errors.visitDate = "تاريخ الزيارة مطلوب";
  }

  if (!values.contactEmail.trim()) {
    errors.contactEmail = "البريد الإلكتروني مطلوب";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail.trim())) {
    errors.contactEmail = "صيغة البريد غير صحيحة";
  }

  if (f.contactPhone.enabled) {
    if (f.contactPhone.required && !values.contactPhone.trim()) {
      errors.contactPhone = "رقم الجوال مطلوب";
    } else if (
      values.contactPhone.trim() &&
      !/^05\d{8}$/.test(values.contactPhone.trim())
    ) {
      errors.contactPhone = "أدخل رقم جوال سعودي صحيح (05xxxxxxxx)";
    }
  }

  return errors;
}

export default function DynamicSubmitForm({
  slug,
  preview = false,
  initialDepartments,
  initialRequestTypes,
  settings = DEFAULT_FORM_SETTINGS,
  pinnedDepartmentId = null,
  pinnedRequestTypeId = null,
}: {
  slug: string;
  preview?: boolean;
  initialDepartments?: Department[];
  initialRequestTypes?: RequestType[];
  settings?: FormSettingsData;
  pinnedDepartmentId?: string | null;
  pinnedRequestTypeId?: string | null;
}) {
  const fields = settings.fields;
  const hasInitial = Boolean(initialDepartments?.length);
  const defaults = hasInitial
    ? resolveSlugDefaults(slug, initialDepartments!, initialRequestTypes ?? [])
    : { departmentId: "", requestTypeId: "" };

  const [departments, setDepartments] = useState<Department[]>(
    initialDepartments ?? [],
  );
  const [requestTypes, setRequestTypes] = useState<RequestType[]>(
    initialRequestTypes ?? [],
  );
  const [administrations, setAdministrations] = useState<Administration[]>([]);
  const [requesterAdministrationId, setRequesterAdministrationId] = useState("");
  const [departmentId, setDepartmentId] = useState(
    pinnedDepartmentId ?? defaults.departmentId,
  );
  const [requestTypeId, setRequestTypeId] = useState(
    pinnedRequestTypeId ?? defaults.requestTypeId,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(!hasInitial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const selectedType = requestTypes.find((rt) => rt.id === requestTypeId);
  const showHospitalityAvailability =
    selectedType?.slug === HOSPITALITY_TYPE_SLUG || slug === HOSPITALITY_TYPE_SLUG;

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [deptRes, rtRes] = await Promise.all([
        fetchWithTimeout("/api/public/departments"),
        fetchWithTimeout("/api/public/request-types"),
      ]);
      const deptPayload = await parseApiResponse<{ departments: Department[] }>(deptRes);
      const rtPayload = await parseApiResponse<{ requestTypes: RequestType[] }>(rtRes);

      if (!deptPayload.success || !rtPayload.success) {
        throw new Error("تعذّر تحميل الإعدادات");
      }

      setDepartments(deptPayload.data.departments);
      setRequestTypes(rtPayload.data.requestTypes);

      const resolved = resolveSlugDefaults(
        slug,
        deptPayload.data.departments,
        rtPayload.data.requestTypes,
      );
      setDepartmentId(resolved.departmentId);
      setRequestTypeId(resolved.requestTypeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!hasInitial) void loadMeta();
  }, [hasInitial, loadMeta]);

  // Requester administrations are always loaded (never passed as initial props).
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchWithTimeout("/api/public/administrations");
        const payload = await parseApiResponse<{ administrations: Administration[] }>(res);
        if (payload.success) setAdministrations(payload.data.administrations);
      } catch {
        // Optional field — ignore load failures.
      }
    })();
  }, []);

  useEffect(() => {
    if (!departmentId || hasInitial) return;
    void (async () => {
      try {
        const res = await fetchWithTimeout(
          `/api/public/request-types?departmentId=${departmentId}`,
        );
        const payload = await parseApiResponse<{ requestTypes: RequestType[] }>(res);
        if (payload.success) setRequestTypes(payload.data.requestTypes);
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطأ");
      }
    })();
  }, [departmentId, hasInitial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const errors = validateFields(
      {
        departmentId,
        requestTypeId,
        title,
        description,
        requiredDate,
        visitDate,
        contactEmail,
        contactPhone,
        needsVisit: Boolean(selectedType?.requiresVisitDate),
      },
      settings,
    );
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);

    try {
      const res = await fetchWithTimeout("/api/public/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          requiredDate,
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          departmentId,
          requestTypeId,
          requesterAdministrationId: requesterAdministrationId || undefined,
          formSlug: slug,
          visitDate:
            selectedType?.requiresVisitDate && fields.visitDate.enabled
              ? visitDate
              : undefined,
        }),
      });
      const payload = await parseApiResponse<{ id: string; approvalUrl: string }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل التقديم"));
      }
      setSubmittedId(payload.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedId) {
    return (
      <div className="space-y-4 text-center" role="status">
        <Stepper
          currentId="done"
          steps={[
            { id: "fill", label: "تعبئة الطلب" },
            { id: "send", label: "الإرسال" },
            { id: "done", label: "التأكيد" },
          ]}
        />
        <span className="badge-success">{settings.successTitle}</span>
        <div className="card-section space-y-2 text-sm text-brand-gray">
          <p>
            رقم مرجعي للطلب:{" "}
            <span className="font-mono font-bold text-primary" dir="ltr">
              #{submittedId.slice(-8).toUpperCase()}
            </span>
          </p>
          <p>{settings.successMessage}</p>
          <p>الخطوات التالية:</p>
          <ol className="list-decimal space-y-1 ps-5 text-start">
            <li>سيُرسل رابط الموافقة لمدير القسم المستقبِل تلقائياً.</li>
            <li>إذا حددت إدارتك، يُشعَر مديرك المباشر بالطلب.</li>
            <li>بعد الموافقة ينتقل الطلب إلى لوحة القسم المستقبِل.</li>
            <li>ستصلك تحديثات على البريد المُدخل.</li>
          </ol>
        </div>
        <Link
          href="/request"
          className="btn-secondary inline-flex focus-visible:ring-2 focus-visible:ring-primary/20"
        >
          تقديم طلب آخر
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="w-full space-y-4">
      <Stepper
        currentId={submitting ? "send" : "fill"}
        steps={[
          { id: "fill", label: "تعبئة الطلب" },
          { id: "send", label: "الإرسال" },
          { id: "done", label: "التأكيد" },
        ]}
      />
      {preview && (
        <div className="rounded-lg border border-primary bg-[color-mix(in_srgb,var(--zaad-primary)_8%,transparent)] px-3 py-2 text-xs text-brand-gray">
          وضع المعاينة — هذا ما يراه مقدّم الطلب. الإرسال يعمل للاختبار.
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-8">
          <div
            className="h-8 w-8 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--zaad-primary)_15%,transparent)]"
            aria-hidden
          />
          <p className="text-sm text-brand-gray">جاري تحميل النموذج...</p>
        </div>
      ) : error && !departments.length ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--zaad-danger)]" role="alert">
            {error}
          </p>
          <button
            type="button"
            className="btn-secondary focus-visible:ring-2 focus-visible:ring-primary/20"
            onClick={() => void loadMeta()}
          >
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          {administrations.length > 0 && (
            <div className="space-y-1 rounded-lg border border-[color-mix(in_srgb,var(--zaad-primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--zaad-primary)_5%,transparent)] p-3">
              <label className="label-field" htmlFor="requesterAdministration">
                إدارتك (مقدّم الطلب)
                <span className="text-brand-gray"> (اختياري)</span>
              </label>
              <select
                id="requesterAdministration"
                className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
                value={requesterAdministrationId}
                onChange={(e) => setRequesterAdministrationId(e.target.value)}
              >
                <option value="">— اختر إدارتك —</option>
                {administrations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-brand-gray">
                يُستخدم لإشعار مديرك المباشر بالطلب. الحقول أدناه تخص القسم المستقبِل للطلب.
              </p>
            </div>
          )}

          {!pinnedDepartmentId && (
          <div className="space-y-1">
            <label className="label-field" htmlFor="department">
              {fields.department.label}
            </label>
            <select
              id="department"
              className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setFieldErrors((prev) => ({ ...prev, departmentId: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.departmentId)}
              aria-describedby={fieldErrors.departmentId ? "department-error" : undefined}
              required
            >
              <option value="">{fields.department.placeholder}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {fieldErrors.departmentId && (
              <p id="department-error" className="text-xs text-[var(--zaad-danger)]">
                {fieldErrors.departmentId}
              </p>
            )}
          </div>
          )}

          {!pinnedRequestTypeId && (
          <div className="space-y-1">
            <label className="label-field" htmlFor="requestType">
              {fields.requestType.label}
            </label>
            <select
              id="requestType"
              className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
              value={requestTypeId}
              onChange={(e) => {
                setRequestTypeId(e.target.value);
                setFieldErrors((prev) => ({ ...prev, requestTypeId: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.requestTypeId)}
              aria-describedby={fieldErrors.requestTypeId ? "requestType-error" : undefined}
              required
            >
              <option value="">{fields.requestType.placeholder}</option>
              {requestTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
            {fieldErrors.requestTypeId && (
              <p id="requestType-error" className="text-xs text-[var(--zaad-danger)]">
                {fieldErrors.requestTypeId}
              </p>
            )}
          </div>
          )}

          <div className="space-y-1">
            <label className="label-field" htmlFor="title">
              {fields.title.label}
            </label>
            <input
              id="title"
              className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
              placeholder={fields.title.placeholder}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setFieldErrors((prev) => ({ ...prev, title: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? "title-error" : undefined}
              required
            />
            {fieldErrors.title && (
              <p id="title-error" className="text-xs text-[var(--zaad-danger)]">
                {fieldErrors.title}
              </p>
            )}
          </div>

          {fields.description.enabled && (
            <div className="space-y-1">
              <label className="label-field" htmlFor="description">
                {fields.description.label}
                {!fields.description.required && (
                  <span className="text-brand-gray"> (اختياري)</span>
                )}
              </label>
              <textarea
                id="description"
                className="input-field min-h-24 w-full focus-visible:ring-2 focus-visible:ring-primary/20"
                placeholder={fields.description.placeholder}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, description: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.description)}
                aria-describedby={fieldErrors.description ? "description-error" : undefined}
                required={fields.description.required}
              />
              {fieldErrors.description && (
                <p id="description-error" className="text-xs text-[var(--zaad-danger)]">
                  {fieldErrors.description}
                </p>
              )}
            </div>
          )}

          {fields.requiredDate.enabled && (
            <div className="space-y-1">
              <label className="label-field" htmlFor="requiredDate">
                {fields.requiredDate.label}
                {!fields.requiredDate.required && (
                  <span className="text-brand-gray"> (اختياري)</span>
                )}
              </label>
              <input
                id="requiredDate"
                className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
                type="date"
                value={requiredDate}
                onChange={(e) => {
                  setRequiredDate(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, requiredDate: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.requiredDate)}
                aria-describedby={
                  fieldErrors.requiredDate ? "requiredDate-error" : undefined
                }
                required={fields.requiredDate.required}
              />
              {fieldErrors.requiredDate && (
                <p id="requiredDate-error" className="text-xs text-[var(--zaad-danger)]">
                  {fieldErrors.requiredDate}
                </p>
              )}
            </div>
          )}

          {showHospitalityAvailability && (
            <RoomAvailabilityCalendar
              date={requiredDate}
              onDateChange={(next) => {
                setRequiredDate(next);
                setFieldErrors((prev) => ({ ...prev, requiredDate: undefined }));
              }}
            />
          )}

          {selectedType?.requiresVisitDate && fields.visitDate.enabled && (
            <div className="space-y-1">
              <label className="label-field" htmlFor="visitDate">
                {fields.visitDate.label}
              </label>
              <input
                id="visitDate"
                className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
                type="datetime-local"
                value={visitDate}
                onChange={(e) => {
                  setVisitDate(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, visitDate: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.visitDate)}
                aria-describedby={fieldErrors.visitDate ? "visitDate-error" : undefined}
                required
              />
              {fieldErrors.visitDate && (
                <p id="visitDate-error" className="text-xs text-[var(--zaad-danger)]">
                  {fieldErrors.visitDate}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="label-field" htmlFor="contactEmail">
              {fields.contactEmail.label}
            </label>
            <input
              id="contactEmail"
              className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
              type="email"
              placeholder={fields.contactEmail.placeholder}
              dir="ltr"
              value={contactEmail}
              onChange={(e) => {
                setContactEmail(e.target.value);
                setFieldErrors((prev) => ({ ...prev, contactEmail: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.contactEmail)}
              aria-describedby={fieldErrors.contactEmail ? "contactEmail-error" : undefined}
              required
            />
            {fieldErrors.contactEmail && (
              <p id="contactEmail-error" className="text-xs text-[var(--zaad-danger)]">
                {fieldErrors.contactEmail}
              </p>
            )}
          </div>

          {fields.contactPhone.enabled && (
            <div className="space-y-1">
              <label className="label-field" htmlFor="contactPhone">
                {fields.contactPhone.label}
                {!fields.contactPhone.required && (
                  <span className="text-brand-gray"> (اختياري)</span>
                )}
              </label>
              <input
                id="contactPhone"
                className="input-field w-full focus-visible:ring-2 focus-visible:ring-primary/20"
                placeholder={fields.contactPhone.placeholder}
                dir="ltr"
                inputMode="tel"
                value={contactPhone}
                onChange={(e) => {
                  setContactPhone(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, contactPhone: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.contactPhone)}
                aria-describedby={
                  fieldErrors.contactPhone ? "contactPhone-error" : undefined
                }
                required={fields.contactPhone.required}
              />
              {fieldErrors.contactPhone && (
                <p id="contactPhone-error" className="text-xs text-[var(--zaad-danger)]">
                  {fieldErrors.contactPhone}
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-[var(--zaad-danger)]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary w-full py-2.5 focus-visible:ring-2 focus-visible:ring-primary/20"
            disabled={submitting}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 animate-pulse rounded-full bg-white/60"
                  aria-hidden
                />
                جاري الإرسال...
              </span>
            ) : (
              settings.submitLabel
            )}
          </button>
        </>
      )}
    </form>
  );
}
