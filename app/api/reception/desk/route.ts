import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { requireReceptionDeskSession } from "@/lib/auth/route-guard";
import {
  listCentralReceptionVisits,
  markCentralVisitAttendance,
} from "@/lib/request-service";

export async function GET() {
  try {
    const auth = await requireReceptionDeskSession();
    if (auth.error) return auth.error;

    const result = await listCentralReceptionVisits();
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireReceptionDeskSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      requestId?: string;
      attended?: boolean;
    };

    if (!body.requestId || body.attended === undefined) {
      return jsonError("معرّف الطلب وحالة الحضور مطلوبان", "VALIDATION", 400);
    }

    const result = await markCentralVisitAttendance({
      requestId: body.requestId,
      attended: body.attended,
    });

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
