import { requireManagerSession } from "@/lib/auth/route-guard";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonOk } from "@/lib/api-utils";

export async function GET() {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

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
