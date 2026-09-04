import { prisma } from "@/lib/prisma";
import { handleApiError, jsonOk } from "@/lib/api-utils";

/** Public: external administrations (الإدارات الأخرى) a submitter can belong to. */
export async function GET() {
  try {
    const administrations = await prisma.administration.findMany({
      where: { isActive: true, kind: "EXTERNAL" },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
    return jsonOk({ administrations });
  } catch (error) {
    return handleApiError(error);
  }
}
