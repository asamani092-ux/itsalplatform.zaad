import type { FormSettingsData } from "@/lib/forms/schema";

/** Client-safe duplicate of lib/hospitality HOSPITALITY_TYPE_SLUG. */
export const HOSPITALITY_TYPE_SLUG = "hospitality-booking";

export interface PublicSubmitValues {
  departmentId: string;
  requestTypeId: string;
  title: string;
  contactName: string;
  description: string;
  requiredDate: string;
  visitDate: string;
  contactEmail: string;
  contactPhone: string;
  hallBooking: { meetingDate: string } | null;
}

export interface PublicSubmitVisibility {
  department: boolean;
  requestType: boolean;
  title: boolean;
  contactName: boolean;
  description: boolean;
  requiredDate: boolean;
  visitDate: boolean;
  hallBooking: boolean;
  contactEmail: boolean;
  contactPhone: boolean;
}

export type PublicSubmitFieldErrors = Partial<
  Record<
    | "departmentId"
    | "requestTypeId"
    | "title"
    | "contactName"
    | "description"
    | "requiredDate"
    | "visitDate"
    | "hallBooking"
    | "contactEmail"
    | "contactPhone",
    string
  >
>;

export function isHospitalityContext(opts: {
  formSlug: string;
  requestTypeSlug?: string | null;
}): boolean {
  return (
    opts.requestTypeSlug === HOSPITALITY_TYPE_SLUG ||
    opts.formSlug === HOSPITALITY_TYPE_SLUG
  );
}

/**
 * Visibility must match the public form UI exactly.
 * Rule: a field is validated as required only when visible AND configured required
 * (or always-required identity fields that are visible).
 */
export function getPublicSubmitVisibility(opts: {
  settings: FormSettingsData;
  isHospitality: boolean;
  requiresVisitDate: boolean;
  pinnedDepartmentId?: string | null;
  pinnedRequestTypeId?: string | null;
}): PublicSubmitVisibility {
  const f = opts.settings.fields;
  return {
    department: !opts.pinnedDepartmentId,
    requestType: !opts.pinnedRequestTypeId,
    title: true,
    contactName: true,
    description: true,
    // Hidden on hospitality — date comes from the selected hall slot.
    requiredDate: f.requiredDate.enabled && !opts.isHospitality,
    visitDate:
      opts.requiresVisitDate && f.visitDate.enabled && !opts.isHospitality,
    hallBooking: opts.isHospitality,
    contactEmail: true,
    contactPhone: f.contactPhone.enabled,
  };
}

function requireVisible(
  visible: boolean,
  enabled: boolean,
  required: boolean,
  empty: boolean,
  message: string,
): string | undefined {
  if (!visible) return undefined;
  if (!enabled || !required) return undefined;
  return empty ? message : undefined;
}

/**
 * Validate only fields the user can currently see.
 * Pinned department/type stay required as values even when their selects are hidden.
 */
export function validatePublicSubmit(
  values: PublicSubmitValues,
  settings: FormSettingsData,
  visibility: PublicSubmitVisibility,
): PublicSubmitFieldErrors {
  const errors: PublicSubmitFieldErrors = {};
  const f = settings.fields;

  // Always need routing ids — even when pinned selects are hidden.
  if (!values.departmentId) errors.departmentId = "اختر القسم";
  if (!values.requestTypeId) errors.requestTypeId = "اختر نوع الطلب";

  if (!values.title.trim()) errors.title = "العنوان مطلوب";

  const contactNameErr = requireVisible(
    visibility.contactName,
    f.contactName.enabled,
    f.contactName.required,
    !values.contactName.trim(),
    "اسم مقدّم الطلب مطلوب",
  );
  if (contactNameErr) errors.contactName = contactNameErr;

  const descriptionErr = requireVisible(
    visibility.description,
    f.description.enabled,
    f.description.required,
    !values.description.trim(),
    "الوصف مطلوب",
  );
  if (descriptionErr) errors.description = descriptionErr;

  const requiredDateErr = requireVisible(
    visibility.requiredDate,
    f.requiredDate.enabled,
    f.requiredDate.required,
    !values.requiredDate,
    "التاريخ المطلوب مطلوب",
  );
  if (requiredDateErr) errors.requiredDate = requiredDateErr;

  const visitDateErr = requireVisible(
    visibility.visitDate,
    f.visitDate.enabled,
    true,
    !values.visitDate,
    "تاريخ الزيارة مطلوب",
  );
  if (visitDateErr) errors.visitDate = visitDateErr;

  if (visibility.hallBooking && !values.hallBooking) {
    errors.hallBooking = "اختر موعداً متاحاً للقاعة";
  }

  if (visibility.contactEmail) {
    if (!values.contactEmail.trim()) {
      errors.contactEmail = "البريد الإلكتروني مطلوب";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail.trim())) {
      errors.contactEmail = "صيغة البريد غير صحيحة";
    }
  }

  if (visibility.contactPhone) {
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

/** Prefer hall slot date when hospitality is active. */
export function resolveEffectiveRequiredDate(opts: {
  isHospitality: boolean;
  requiredDate: string;
  hallMeetingDate?: string | null;
}): string {
  if (opts.isHospitality && opts.hallMeetingDate) return opts.hallMeetingDate;
  return opts.requiredDate;
}
