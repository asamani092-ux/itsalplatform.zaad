/**
 * Client-safe form settings contract: types, defaults and normalization.
 * Must stay free of database imports so client components can use it.
 */

/**
 * Fields the request workflow depends on. They can be relabelled but never
 * hidden, because routing, approval and notifications read their values.
 */
export const LOCKED_FIELDS = [
  "department",
  "requestType",
  "title",
  "contactEmail",
] as const;

export const FORM_FIELD_KEYS = [
  "department",
  "requestType",
  "title",
  "description",
  "requiredDate",
  "visitDate",
  "contactEmail",
  "contactPhone",
] as const;

export type FormFieldKey = (typeof FORM_FIELD_KEYS)[number];

export interface FormFieldConfig {
  enabled: boolean;
  required: boolean;
  label: string;
  placeholder: string;
}

export type FormFieldsConfig = Record<FormFieldKey, FormFieldConfig>;

export interface FormSettingsData {
  isPublished: boolean;
  pageTitle: string;
  pageSubtitle: string;
  introText: string;
  submitLabel: string;
  successTitle: string;
  successMessage: string;
  fields: FormFieldsConfig;
}

const DEFAULT_FIELDS: FormFieldsConfig = {
  department: {
    enabled: true,
    required: true,
    label: "القسم",
    placeholder: "اختر القسم...",
  },
  requestType: {
    enabled: true,
    required: true,
    label: "نوع الطلب",
    placeholder: "اختر النوع...",
  },
  title: {
    enabled: true,
    required: true,
    label: "عنوان الطلب",
    placeholder: "مثال: طلب تغطية إعلامية",
  },
  description: {
    enabled: true,
    required: true,
    label: "الوصف",
    placeholder: "اشرح طلبك بالتفصيل...",
  },
  requiredDate: {
    enabled: true,
    required: true,
    label: "التاريخ المطلوب",
    placeholder: "",
  },
  visitDate: {
    enabled: true,
    required: true,
    label: "تاريخ الزيارة",
    placeholder: "",
  },
  contactEmail: {
    enabled: true,
    required: true,
    label: "البريد الإلكتروني",
    placeholder: "name@example.com",
  },
  contactPhone: {
    enabled: true,
    required: true,
    label: "رقم الجوال",
    placeholder: "05xxxxxxxx",
  },
};

export const DEFAULT_FORM_SETTINGS: FormSettingsData = {
  isPublished: true,
  pageTitle: "جمعية الزاد",
  pageSubtitle: "تقديم طلب",
  introText: "",
  submitLabel: "تقديم الطلب",
  successTitle: "تم تقديم الطلب بنجاح",
  successMessage: "سيُرسل رابط الموافقة للمدير المباشر تلقائياً.",
  fields: DEFAULT_FIELDS,
};

export function isLockedField(key: FormFieldKey): boolean {
  return (LOCKED_FIELDS as readonly string[]).includes(key);
}

function readString(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = source[key];
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function readBoolean(
  source: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const value = source[key];
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeFields(raw: unknown): FormFieldsConfig {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const normalized = {} as FormFieldsConfig;

  for (const key of FORM_FIELD_KEYS) {
    const fallback = DEFAULT_FIELDS[key];
    const entry = source[key];
    const record =
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? (entry as Record<string, unknown>)
        : {};

    normalized[key] = {
      enabled: isLockedField(key)
        ? true
        : readBoolean(record, "enabled", fallback.enabled),
      required: isLockedField(key)
        ? true
        : readBoolean(record, "required", fallback.required),
      label: readString(record, "label", fallback.label),
      placeholder:
        typeof record.placeholder === "string"
          ? record.placeholder
          : fallback.placeholder,
    };
  }

  return normalized;
}
