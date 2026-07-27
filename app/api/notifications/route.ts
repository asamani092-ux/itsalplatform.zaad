import { requireEmployeeSession } from "@/lib/auth/route-guard";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonOk } from "@/lib/api-utils";

export async function GET() {
  const auth = await requireEmployeeSession();
  if (auth.error) return auth.error;

  try {
    const recipientId = auth.session.sub;
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: { recipientId, readAt: null },
      }),
    ]);

    return jsonOk({ notifications, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}
