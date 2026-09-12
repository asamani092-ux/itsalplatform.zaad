/**
 * Regression: hidden fields must never appear in validation errors.
 * Run: npx tsx scripts/check-public-submit-validation.ts
 */
import { DEFAULT_FORM_SETTINGS } from "../lib/forms/schema";
import {
  getPublicSubmitVisibility,
  validatePublicSubmit,
  type PublicSubmitValues,
} from "../lib/forms/validate-public-submit";

const baseValues: PublicSubmitValues = {
  departmentId: "d1",
  requestTypeId: "rt1",
  title: "حجز",
  contactName: "أحمد",
  description: "وصف",
  requiredDate: "",
  visitDate: "",
  contactEmail: "a@b.com",
  contactPhone: "0512345678",
  hallBooking: null,
};

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Hospitality: requiredDate/visitDate hidden → must not error on them; hall required.
{
  const visibility = getPublicSubmitVisibility({
    settings: DEFAULT_FORM_SETTINGS,
    isHospitality: true,
    requiresVisitDate: true,
    pinnedDepartmentId: "d1",
    pinnedRequestTypeId: "rt1",
  });
  assert(visibility.requiredDate === false, "hospitality hides requiredDate");
  assert(visibility.visitDate === false, "hospitality hides visitDate");
  assert(visibility.hallBooking === true, "hospitality shows hall");

  const errors = validatePublicSubmit(baseValues, DEFAULT_FORM_SETTINGS, visibility);
  assert(!errors.requiredDate, "must not require hidden requiredDate");
  assert(!errors.visitDate, "must not require hidden visitDate");
  assert(Boolean(errors.hallBooking), "must require hall slot when visible");

  const ok = validatePublicSubmit(
    { ...baseValues, hallBooking: { meetingDate: "2026-09-10" } },
    DEFAULT_FORM_SETTINGS,
    visibility,
  );
  assert(Object.keys(ok).length === 0, `hospitality+slot should pass: ${JSON.stringify(ok)}`);
}

// Normal form: requiredDate required when visible.
{
  const visibility = getPublicSubmitVisibility({
    settings: DEFAULT_FORM_SETTINGS,
    isHospitality: false,
    requiresVisitDate: false,
  });
  assert(visibility.requiredDate === true, "normal shows requiredDate");
  assert(visibility.hallBooking === false, "normal hides hall");
  const errors = validatePublicSubmit(baseValues, DEFAULT_FORM_SETTINGS, visibility);
  assert(Boolean(errors.requiredDate), "must require visible requiredDate");
  assert(!errors.hallBooking, "must not require hidden hall");
}

// Disabled optional field: not required.
{
  const settings = {
    ...DEFAULT_FORM_SETTINGS,
    fields: {
      ...DEFAULT_FORM_SETTINGS.fields,
      description: {
        ...DEFAULT_FORM_SETTINGS.fields.description,
        enabled: false,
        required: true,
      },
    },
  };
  const visibility = getPublicSubmitVisibility({
    settings,
    isHospitality: false,
    requiresVisitDate: false,
  });
  assert(visibility.description === false, "disabled description hidden");
  const errors = validatePublicSubmit(
    { ...baseValues, description: "", requiredDate: "2026-09-10" },
    settings,
    visibility,
  );
  assert(!errors.description, "hidden description must not block submit");
}

console.log("check-public-submit-validation: ok");
