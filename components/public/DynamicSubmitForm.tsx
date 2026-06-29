"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

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

export default function DynamicSubmitForm({
  slug,
  preview = false,
  initialDepartments,
  initialRequestTypes,
}: {
  slug: string;
  preview?: boolean;
  initialDepartments?: Department[];
  initialRequestTypes?: RequestType[];
}) {
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
  const [departmentId, setDepartmentId] = useState(defaults.departmentId);
  const [requestTypeId, setRequestTypeId] = useState(defaults.requestTypeId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(!hasInitial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successUrl, setSuccessUrl] = useState("");

  const selectedType = requestTypes.find((rt) => rt.id === requestTypeId);

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
    setSubmitting(true);
    setError("");

    try {
      const res = await fetchWithTimeout("/api/public/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          requiredDate,
          contactEmail,
          contactPhone,
          departmentId,
          requestTypeId,
          visitDate: selectedType?.requiresVisitDate ? visitDate : undefined,
        }),
      });
      const payload = await parseApiResponse<{ approvalUrl: string }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل التقديم"));
      }
      setSuccessUrl(payload.data.approvalUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  if (successUrl) {
    return (
      <div className="card space-y-4 text-center">
        <span className="badge-success">تم تقديم الطلب</span>
        <p className="text-sm text-brand-gray">
          سيُرسل رابط الموافقة للمدير المباشر تلقائياً.
        </p>
        <Link href="/" className="btn-secondary inline-flex">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="card space-y-4">
      {preview && (
        <div className="rounded-lg border border-primary bg-[color-mix(in_srgb,var(--zaad-primary)_8%,transparent)] px-3 py-2 text-xs text-brand-gray">
          وضع المعاينة — هذا ما يراه مقدّم الطلب. الإرسال يعمل للاختبار.
        </div>
      )}
      {loading ? (
        <p className="text-sm text-brand-gray">جاري تحميل النموذج...</p>
      ) : error && !departments.length ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--zaad-danger)]" role="alert">{error}</p>
          <button type="button" className="btn-secondary" onClick={() => void loadMeta()}>
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <label className="label-field" htmlFor="department">
              القسم
            </label>
            <select
              id="department"
              className="input-field"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
            >
              <option value="">اختر القسم...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="label-field" htmlFor="requestType">
              نوع الطلب
            </label>
            <select
              id="requestType"
              className="input-field"
              value={requestTypeId}
              onChange={(e) => setRequestTypeId(e.target.value)}
              required
            >
              <option value="">اختر النوع...</option>
              {requestTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>

          <input
            className="input-field"
            placeholder="عنوان الطلب"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="input-field min-h-24"
            placeholder="الوصف"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="date"
            value={requiredDate}
            onChange={(e) => setRequiredDate(e.target.value)}
            required
          />

          {selectedType?.requiresVisitDate && (
            <input
              className="input-field"
              type="datetime-local"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              required
            />
          )}

          <input
            className="input-field"
            type="email"
            placeholder="البريد الإلكتروني"
            dir="ltr"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
          <input
            className="input-field"
            placeholder="رقم الجوال"
            dir="ltr"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            required
          />

          {error && (
            <p className="text-sm text-[var(--zaad-danger)]" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
            {submitting ? "جاري الإرسال..." : "تقديم الطلب"}
          </button>
        </>
      )}
    </form>
  );
}
