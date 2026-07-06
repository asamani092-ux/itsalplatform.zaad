import { NextRequest } from "next/server";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { regenerateApprovalLink } from "@/lib/request-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const result = await regenerateApprovalLink(id);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
