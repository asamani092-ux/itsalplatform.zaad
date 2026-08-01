import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { createEmployee, updateEmployee } from "@/lib/auth-service";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { EmployeeRole } from "@/generated/prisma/client";

export async function GET() {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const employees = await prisma.commEmployee.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return jsonOk({ employees, count: employees.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phoneNumber?: string;
      password?: string;
      role?: EmployeeRole;
    };

    if (!body.name?.trim() || !body.email?.trim() || !body.phoneNumber?.trim() || !body.password) {
      return jsonError("الاسم والبريد والهاتف وكلمة المرور مطلوبة", "VALIDATION", 400);
    }

    const employee = await createEmployee({
      name: body.name,
      email: body.email,
      phoneNumber: body.phoneNumber,
      password: body.password,
      role: body.role ?? EmployeeRole.EMPLOYEE,
    });

    return jsonOk(employee, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      id?: string;
      name?: string;
      email?: string;
      phoneNumber?: string;
      password?: string;
      role?: EmployeeRole;
      isActive?: boolean;
    };

    if (!body.id) {
      return jsonError("معرّف الموظف مطلوب", "VALIDATION", 400);
    }

    const employee = await updateEmployee(body.id, body);
    return jsonOk(employee);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return jsonError("معرّف الموظف مطلوب", "VALIDATION", 400);
    if (id === auth.session.sub) {
      return jsonError("لا يمكنك حذف حسابك الحالي", "VALIDATION", 400);
    }

    const assigned = await prisma.communicationRequest.count({
      where: { assignedEmployeeId: id },
    });

    if (assigned > 0) {
      const deactivated = await updateEmployee(id, { isActive: false });
      return jsonOk({
        id,
        deleted: false,
        deactivated: true,
        employee: deactivated,
        message: "للموظف طلبات مرتبطة — تم تعطيل الحساب بدل حذفه",
      });
    }

    await prisma.commEmployee.delete({ where: { id } });
    return jsonOk({ id, deleted: true, deactivated: false });
  } catch (error) {
    return handleApiError(error);
  }
}
