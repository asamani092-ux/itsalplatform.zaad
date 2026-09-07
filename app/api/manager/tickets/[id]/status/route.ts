import { NextRequest } from "next/server";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { updateRequestStatus } from "@/lib/request-service";
import { RequestStatus } from "@/generated/prisma/client";

/** Archive only — completion goes through approve-completion. */
const ALLOWED: RequestStatus[] = [RequestStatus.Archived];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = (await request.json()) as {
      status?: RequestStatus;
      note?: string;
    };

    if (!body.status || !ALLOWED.includes(body.status)) {
      return jsonError(
        "الحالة المطلوبة غير مدعومة — استخدم Archived (اعتماد الإكمال عبر مسار مخصص)",
        "VALIDATION",
        400,
      );
    }

    const updated = await updateRequestStatus({
      requestId: id,
      status: body.status,
      changedBy: auth.session.sub,
      note: body.note,
    });

    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
