import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  DEFAULT_FORM_SETTINGS,
  FORM_FIELD_KEYS,
  normalizeFields,
  normalizeSlug,
  type FormFieldsConfig,
  type RequestFormData,
} from "./schema";

interface RequestFormRow {
  id: string;
  slug: string;
  name: string;
  isPublished: boolean;
  isDefault: boolean;
  departmentId: string | null;
  requestTypeId: string | null;
  pageTitle: string;
  pageSubtitle: string;
  introText: string;
  submitLabel: string;
  successTitle: string;
  successMessage: string;
  fields: Prisma.JsonValue;
}

/** Prisma's Json input type needs a plain indexable object. */
function fieldsToJson(fields: FormFieldsConfig): Prisma.InputJsonObject {
  const entries = FORM_FIELD_KEYS.map((key) => {
    const field = fields[key];
    return [
      key,
      {
        enabled: field.enabled,
        required: field.required,
        label: field.label,
        placeholder: field.placeholder,
      },
    ] as const;
  });

  return Object.fromEntries(entries) satisfies Prisma.InputJsonObject;
}

function toFormData(row: RequestFormRow): RequestFormData {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isDefault: row.isDefault,
    isPublished: row.isPublished,
    departmentId: row.departmentId,
    requestTypeId: row.requestTypeId,
    pageTitle: row.pageTitle,
    pageSubtitle: row.pageSubtitle,
    introText: row.introText,
    submitLabel: row.submitLabel,
    successTitle: row.successTitle,
    successMessage: row.successMessage,
    fields: normalizeFields(row.fields),
  };
}

export async function listRequestForms(): Promise<RequestFormData[]> {
  try {
    const rows = await prisma.requestForm.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return rows.map(toFormData);
  } catch {
    return [];
  }
}

export async function listPublishedForms(): Promise<RequestFormData[]> {
  const forms = await listRequestForms();
  return forms.filter((form) => form.isPublished);
}

export async function getFormBySlug(slug: string): Promise<RequestFormData | null> {
  try {
    const row = await prisma.requestForm.findUnique({ where: { slug } });
    return row ? toFormData(row) : null;
  } catch {
    return null;
  }
}

export async function getFormById(id: string): Promise<RequestFormData | null> {
  try {
    const row = await prisma.requestForm.findUnique({ where: { id } });
    return row ? toFormData(row) : null;
  } catch {
    return null;
  }
}

export async function getDefaultForm(): Promise<RequestFormData | null> {
  const forms = await listRequestForms();
  return forms.find((f) => f.isDefault && f.isPublished) ?? forms.find((f) => f.isPublished) ?? null;
}

export interface RequestFormInput {
  name?: string;
  slug?: string;
  isPublished?: boolean;
  departmentId?: string | null;
  requestTypeId?: string | null;
  pageTitle?: string;
  pageSubtitle?: string;
  introText?: string;
  submitLabel?: string;
  successTitle?: string;
  successMessage?: string;
  fields?: unknown;
}

export async function createRequestForm(input: RequestFormInput): Promise<RequestFormData> {
  const name = input.name?.trim();
  if (!name) throw new Error("VALIDATION: اسم النموذج مطلوب");

  const slug = normalizeSlug(input.slug?.trim() || name);
  if (!slug) throw new Error("VALIDATION: المعرّف (slug) غير صالح");

  const existing = await prisma.requestForm.findUnique({ where: { slug } });
  if (existing) throw new Error("VALIDATION: المعرّف مستخدم بالفعل");

  const row = await prisma.requestForm.create({
    data: {
      slug,
      name,
      isPublished: input.isPublished ?? false,
      departmentId: input.departmentId || null,
      requestTypeId: input.requestTypeId || null,
      pageTitle: input.pageTitle?.trim() || DEFAULT_FORM_SETTINGS.pageTitle,
      pageSubtitle: input.pageSubtitle?.trim() || name,
      introText: input.introText?.trim() ?? "",
      submitLabel: input.submitLabel?.trim() || DEFAULT_FORM_SETTINGS.submitLabel,
      successTitle: input.successTitle?.trim() || DEFAULT_FORM_SETTINGS.successTitle,
      successMessage:
        input.successMessage?.trim() || DEFAULT_FORM_SETTINGS.successMessage,
      fields: fieldsToJson(normalizeFields(input.fields)),
    },
  });

  return toFormData(row);
}

export async function updateRequestForm(
  id: string,
  input: RequestFormInput,
): Promise<RequestFormData> {
  const current = await getFormById(id);
  if (!current) throw new Error("NOT_FOUND: النموذج غير موجود");

  let slug = current.slug;
  if (input.slug !== undefined) {
    const candidate = normalizeSlug(input.slug);
    if (!candidate) throw new Error("VALIDATION: المعرّف (slug) غير صالح");
    if (candidate !== current.slug) {
      const clash = await prisma.requestForm.findUnique({ where: { slug: candidate } });
      if (clash) throw new Error("VALIDATION: المعرّف مستخدم بالفعل");
      slug = candidate;
    }
  }

  const row = await prisma.requestForm.update({
    where: { id },
    data: {
      slug,
      name: input.name?.trim() || current.name,
      isPublished:
        typeof input.isPublished === "boolean" ? input.isPublished : current.isPublished,
      departmentId:
        input.departmentId === undefined ? current.departmentId : input.departmentId || null,
      requestTypeId:
        input.requestTypeId === undefined
          ? current.requestTypeId
          : input.requestTypeId || null,
      pageTitle: input.pageTitle?.trim() || current.pageTitle,
      pageSubtitle: input.pageSubtitle?.trim() || current.pageSubtitle,
      introText:
        typeof input.introText === "string" ? input.introText.trim() : current.introText,
      submitLabel: input.submitLabel?.trim() || current.submitLabel,
      successTitle: input.successTitle?.trim() || current.successTitle,
      successMessage: input.successMessage?.trim() || current.successMessage,
      fields:
        input.fields === undefined
          ? fieldsToJson(current.fields)
          : fieldsToJson(normalizeFields(input.fields)),
    },
  });

  return toFormData(row);
}

export async function deleteRequestForm(id: string): Promise<void> {
  const current = await getFormById(id);
  if (!current) throw new Error("NOT_FOUND: النموذج غير موجود");
  if (current.isDefault) {
    throw new Error("VALIDATION: لا يمكن حذف النموذج الافتراضي");
  }
  await prisma.requestForm.delete({ where: { id } });
}
