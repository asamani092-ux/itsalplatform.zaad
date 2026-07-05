import { prisma } from "@/lib/prisma";
import { handleApiError, jsonOk } from "@/lib/api-utils";

export async function GET() {
  try {
    const employees = await prisma.commEmployee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });
    return jsonOk({ employees, count: employees.length });
  } catch (error) {
    return handleApiError(error);
  }
}
