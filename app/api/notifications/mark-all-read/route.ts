import { requireEmployeeSession } from "@/lib/auth/route-guard";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonOk } from "@/lib/api-utils";

export async function PATCH() {
  const auth = await requireEmployeeSession();
  if (auth.error) return auth.error;

  try {
    const result = await prisma.notification.updateMany({
      where: { recipientId: auth.session.sub, readAt: null },
      data: { readAt: new Date() },
    });

    return jsonOk({ updated: result.count });
  } catch (error) {
    return handleApiError(error);
  }
}