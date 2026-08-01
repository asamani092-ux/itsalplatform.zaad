import { NextRequest } from "next/server";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { approveRequestById } from "@/lib/request-service";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const updated = await approveRequestById(id);
    return jsonOk({
      id: updated.id,
      status: updated.status,
      message: "تمت الموافقة من داخل المنصة",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
