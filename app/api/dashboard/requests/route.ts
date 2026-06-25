import { NextRequest } from "next/server";
import { RequestStatus } from "@/generated/prisma/client";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { listRequests } from "@/lib/request-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const view = (searchParams.get("view") ?? "active") as
      | "active"
      | "archive"
      | "all";
    const statusParam = searchParams.get("status");

    const status = statusParam
      ? (statusParam as RequestStatus)
      : undefined;

    const requests = await listRequests({ view, status });

    return jsonOk({ requests, count: requests.length, view });
  } catch (error) {
    return handleApiError(error);
  }
}
