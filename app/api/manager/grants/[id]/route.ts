import { NextRequest } from "next/server";
import { requireDirectorSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { deleteGrant, getGrantById, setGrantStatus } from "@/lib/grants/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireDirectorSession();
    if (auth.error) return auth.error;
    const { id } = await params;
    const grant = await getGrantById(id);
    return jsonOk(grant);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireDirectorSession();
    if (auth.error) return auth.error;
    const { id } = await params;

    const body = (await request.json()) as { status?: "Open" | "Closed" };
    if (body.status !== "Open" && body.status !== "Closed") {
      return jsonError("حالة غير صحيحة", "VALIDATION", 400);
    }

    const grant = await setGrantStatus({ id, status: body.status });
    return jsonOk(grant);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireDirectorSession();
    if (auth.error) return auth.error;
    const { id } = await params;
    const result = await deleteGrant(id);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
