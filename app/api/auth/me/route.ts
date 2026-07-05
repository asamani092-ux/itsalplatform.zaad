import { getRouteSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await getRouteSession();
    if (!session) {
      return jsonError("غير مسجل الدخول", "UNAUTHORIZED", 401);
    }

    return jsonOk({
      user: {
        id: session.sub,
        name: session.name,
        email: session.email,
        phoneNumber: session.phoneNumber,
        role: session.role,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
