import { prisma } from "@/lib/prisma";
import { handleApiError, jsonOk } from "@/lib/api-utils";

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        managerEmail: true,
      },
      orderBy: { name: "asc" },
    });
    return jsonOk({ departments });
  } catch (error) {
    return handleApiError(error);
  }
}
