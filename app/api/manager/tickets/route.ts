import { NextRequest } from "next/server";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { listRequests } from "@/lib/request-service";
import { RequestStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const view = request.nextUrl.searchParams.get("view") as
      | "active"
      | "archive"
      | "all"
      | null;
    const statusParam = request.nextUrl.searchParams.get("status");
    const departmentId = request.nextUrl.searchParams.get("departmentId") ?? undefined;
    const requestTypeId = request.nextUrl.searchParams.get("requestTypeId") ?? undefined;

    const status = statusParam ? (statusParam as RequestStatus) : undefined;

    const requests = await listRequests({
      view: view ?? "all",
      status,
      departmentId,
      requestTypeId,
    });

    return jsonOk({ requests, count: requests.length });
  } catch (error) {
    return handleApiError(error);
  }
}
