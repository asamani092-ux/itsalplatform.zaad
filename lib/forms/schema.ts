/**
 * Client-safe form settings contract: types, defaults and normalization.
 * Must stay free of database imports so client components can use it.
 */

/**
 * Core identity fields — always on for every form (label-only in settings).
 * department / requestType stay locked too for routing, but render after the
 * identity block so the public form leads with name → email → title → description.
 */
export const LOCKED_FIELDS = [
  "contactName",
  "contactEmail",
  "title",
  "description",
  "department",
  "requestType",
] as const;

/** Display / settings order: identity first, then routing, then type-specific. */
export const FORM_FIELD_KEYS = [
  "contactName",
  "contactEmail",
  "title",
  "description",
  "department",
  "requestType",
  "requiredDate",
  "visitDate",
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
  /** Newline-separated post-submit steps shown under the success message. */
  successNextSteps: string;
  fields: FormFieldsConfig;
}

/** A publishable request form with its own public link and QR code. */
export interface RequestFormData extends FormSettingsData {
  id: string;
  slug: string;
  name: string;
  isDefault: boolean;
  departmentId: string | null;
  requestTypeId: string | null;
}

export function formPublicPath(slug: string): string {
  return `/f/${slug}`;
}

export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
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
  contactName: {
    enabled: true,
    required: true,
    label: "الاسم",
    placeholder: "الاسم الكامل",
  },
  contactEmail: {
    enabled: true,
    required: true,
    label: "البريد",
    placeholder: "name@example.com",
  },
  title: {
    enabled: true,
    required: true,
    label: "العنوان",
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
  contactPhone: {
    enabled: true,
    required: false,
    label: "رقم الجوال",
    placeholder: "05xxxxxxxx",
  },
};

/** Default post-submit steps (one line = one step). Editable per form in dashboard. */
export const DEFAULT_SUCCESS_NEXT_STEPS = [
  "سيُرسل رابط الموافقة لمدير القسم المستقبِل تلقائياً.",
  "إذا حددت إدارتك، يُشعَر مديرك المباشر بالطلب.",
  "بعد الموافقة ينتقل الطلب إلى لوحة القسم المستقبِل.",
  "ستصلك تحديثات على البريد المُدخل.",
].join("\n");

export const DEFAULT_FORM_SETTINGS: FormSettingsData = {
  isPublished: true,
  pageTitle: "جمعية الزاد",
  pageSubtitle: "تقديم طلب",
  introText: "",
  submitLabel: "تقديم الطلب",
  successTitle: "تم تقديم الطلب بنجاح",
  successMessage: "سيُرسل رابط الموافقة للمدير المباشر تلقائياً.",
  successNextSteps: DEFAULT_SUCCESS_NEXT_STEPS,
  fields: DEFAULT_FIELDS,
};

export function parseSuccessNextSteps(raw: string | null | undefined): string[] {
  const text = (raw ?? "").trim() || DEFAULT_SUCCESS_NEXT_STEPS;
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, "").trim())
    .filter(Boolean);
}

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
