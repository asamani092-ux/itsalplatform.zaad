import { NextRequest } from "next/server";
import {
  assertManagerTicketAccess,
  requireManagerSession,
} from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { updateRequestStatus } from "@/lib/request-service";
import { RequestStatus } from "@/generated/prisma/client";

const ALLOWED: RequestStatus[] = [RequestStatus.Archived];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await assertManagerTicketAccess(auth.session, id);

    const body = (await request.json()) as {
      status?: RequestStatus;
      changedBy?: string;
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
      changedBy: body.changedBy ?? auth.session.sub,
      note: body.note,
    });

    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
