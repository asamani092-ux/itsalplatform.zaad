import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonOk } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const departmentId = request.nextUrl.searchParams.get("departmentId");

    const requestTypes = await prisma.requestType.findMany({
      where: {
        isActive: true,
        ...(departmentId ? { departmentId } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        requiresVisitDate: true,
        departmentId: true,
      },
      orderBy: { name: "asc" },
    });

    return jsonOk({ requestTypes });
  } catch (error) {
    return handleApiError(error);
  }
}
