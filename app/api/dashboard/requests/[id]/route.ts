import { getRequestById } from "@/lib/request-service";
import { handleApiError, jsonOk } from "@/lib/api-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const request = await getRequestById(id);
    return jsonOk(request);
  } catch (error) {
    return handleApiError(error);
  }
}
