import { NextRequest } from "next/server";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import {
  createRequestForm,
  listRequestForms,
  type RequestFormInput,
} from "@/lib/forms/server";

export async function GET() {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const forms = await listRequestForms();
    return jsonOk({ forms });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as RequestFormInput;
    const form = await createRequestForm(body);
    return jsonOk({ form }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
