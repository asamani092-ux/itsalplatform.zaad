import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  DEFAULT_FORM_SETTINGS,
  FORM_FIELD_KEYS,
  normalizeFields,
  type FormFieldsConfig,
  type FormSettingsData,
} from "./schema";

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

export async function getFormSettings(): Promise<FormSettingsData> {
  try {
    const row = await prisma.formSettings.findUnique({ where: { key: "default" } });
    if (!row) return DEFAULT_FORM_SETTINGS;

    return {
      isPublished: row.isPublished,
      pageTitle: row.pageTitle,
      pageSubtitle: row.pageSubtitle,
      introText: row.introText,
      submitLabel: row.submitLabel,
      successTitle: row.successTitle,
      successMessage: row.successMessage,
      fields: normalizeFields(row.fields),
    };
  } catch {
    return DEFAULT_FORM_SETTINGS;
  }
}

export async function saveFormSettings(
  input: Partial<Omit<FormSettingsData, "fields">> & { fields?: unknown },
): Promise<FormSettingsData> {
  const current = await getFormSettings();

  const next: FormSettingsData = {
    isPublished:
      typeof input.isPublished === "boolean" ? input.isPublished : current.isPublished,
    pageTitle: input.pageTitle?.trim() || current.pageTitle,
    pageSubtitle: input.pageSubtitle?.trim() || current.pageSubtitle,
    introText:
      typeof input.introText === "string" ? input.introText.trim() : current.introText,
    submitLabel: input.submitLabel?.trim() || current.submitLabel,
    successTitle: input.successTitle?.trim() || current.successTitle,
    successMessage: input.successMessage?.trim() || current.successMessage,
    fields: input.fields === undefined ? current.fields : normalizeFields(input.fields),
  };

  const fieldsJson = fieldsToJson(next.fields);

  await prisma.formSettings.upsert({
    where: { key: "default" },
    update: {
      isPublished: next.isPublished,
      pageTitle: next.pageTitle,
      pageSubtitle: next.pageSubtitle,
      introText: next.introText,
      submitLabel: next.submitLabel,
      successTitle: next.successTitle,
      successMessage: next.successMessage,
      fields: fieldsJson,
    },
    create: {
      key: "default",
      isPublished: next.isPublished,
      pageTitle: next.pageTitle,
      pageSubtitle: next.pageSubtitle,
      introText: next.introText,
      submitLabel: next.submitLabel,
      successTitle: next.successTitle,
      successMessage: next.successMessage,
      fields: fieldsJson,
    },
  });

  return next;
}
