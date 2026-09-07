/** Shared request-body guards for new/sensitive surfaces. */

export const MAX_NOTE_LENGTH = 2000;

export function requireTrimmedText(
  value: unknown,
  label: string,
  maxLen = MAX_NOTE_LENGTH,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`VALIDATION: ${label} مطلوب`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLen) {
    throw new Error(`VALIDATION: ${label} يتجاوز الحد الأقصى (${maxLen} حرفاً)`);
  }
  return trimmed;
}

export function requireNonNegativeNumber(
  value: unknown,
  label: string,
  opts?: { allowZero?: boolean; integer?: boolean },
): number {
  const allowZero = opts?.allowZero ?? true;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || Number.isNaN(n)) {
    throw new Error(`VALIDATION: ${label} غير صالح`);
  }
  if (opts?.integer && !Number.isInteger(n)) {
    throw new Error(`VALIDATION: ${label} يجب أن يكون عدداً صحيحاً`);
  }
  if (allowZero ? n < 0 : n <= 0) {
    throw new Error(
      allowZero
        ? `VALIDATION: ${label} لا يمكن أن يكون سالباً`
        : `VALIDATION: ${label} يجب أن يكون أكبر من صفر`,
    );
  }
  return n;
}
