import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { getRequestById } from "@/lib/request-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const request = await getRequestById(id);

    if (!request) {
      return jsonError("الطلب غير موجود", 404, "NOT_FOUND");
    }

    return jsonOk({ request });
  } catch (error) {
    return handleApiError(error);
  }
}
