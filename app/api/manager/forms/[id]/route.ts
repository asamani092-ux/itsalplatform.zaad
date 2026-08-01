import { NextRequest } from "next/server";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import {
  deleteRequestForm,
  getFormById,
  updateRequestForm,
  type RequestFormInput,
} from "@/lib/forms/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const form = await getFormById(id);
    if (!form) throw new Error("NOT_FOUND: النموذج غير موجود");
    return jsonOk({ form });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = (await request.json()) as RequestFormInput;
    const form = await updateRequestForm(id, body);
    return jsonOk({ form });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await deleteRequestForm(id);
    return jsonOk({ id, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
