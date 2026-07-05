import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import {
  listReceptionVisits,
  markVisitAttendance,
} from "@/lib/request-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const result = await listReceptionVisits(token);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = (await request.json()) as {
      requestId?: string;
      attended?: boolean;
    };

    if (!body.requestId || body.attended === undefined) {
      return jsonError("معرّف الطلب وحالة الحضور مطلوبان", "VALIDATION", 400);
    }

    const result = await markVisitAttendance({
      token,
      requestId: body.requestId,
      attended: body.attended,
    });

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
