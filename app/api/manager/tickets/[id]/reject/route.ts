import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { rejectRequest } from "@/lib/request-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    if (!body.reason?.trim()) {
      return jsonError("سبب الرفض مطلوب", "VALIDATION", 400);
    }

    const updated = await rejectRequest({
      requestId: id,
      reason: body.reason,
      changedBy: auth.session.email,
    });

    return jsonOk({
      id: updated.id,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
      message: "تم رفض الطلب وإرسال السبب بالبريد لمقدّم الطلب",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
