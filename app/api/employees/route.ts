import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";

interface CreateEmployeeBody {
  name?: string;
  email?: string;
}

export async function GET() {
  try {
    const employees = await prisma.commEmployee.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return jsonOk({ employees, count: employees.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateEmployeeBody;
    if (!body.name?.trim() || !body.email?.trim()) {
      return jsonError("الاسم والبريد مطلوبان", "VALIDATION", 400);
    }

    const employee = await prisma.commEmployee.create({
      data: {
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
      },
    });

    return jsonOk(employee, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
