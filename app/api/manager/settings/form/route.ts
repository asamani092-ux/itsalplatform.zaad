import { NextRequest } from "next/server";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { getFormSettings, saveFormSettings } from "@/lib/form-settings/server";

export async function GET() {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const settings = await getFormSettings();
    return jsonOk({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

interface FormSettingsBody {
  pageTitle?: string;
  pageSubtitle?: string;
  introText?: string;
  submitLabel?: string;
  successTitle?: string;
  successMessage?: string;
  fields?: unknown;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as FormSettingsBody;
    const settings = await saveFormSettings(body);
    return jsonOk({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}
