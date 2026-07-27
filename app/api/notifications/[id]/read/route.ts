import { requireEmployeeSession } from "@/lib/auth/route-guard";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonOk } from "@/lib/api-utils";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireEmployeeSession();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("NOT_FOUND: الإشعار غير موجود");
    }
    if (existing.recipientId !== auth.session.sub) {
      throw new Error("FORBIDDEN: لا يمكنك تعديل إشعار مستخدم آخر");
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: existing.readAt ?? new Date() },
    });

    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
