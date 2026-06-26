import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { getManagerKpis } from "@/lib/request-service";

export async function GET() {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const kpis = await getManagerKpis();
    return jsonOk({ kpis });
  } catch (error) {
    return handleApiError(error);
  }
}
