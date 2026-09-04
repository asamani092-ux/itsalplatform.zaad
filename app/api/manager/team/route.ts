import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { createEmployee, updateEmployee } from "@/lib/auth-service";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { EmployeeRole } from "@/generated/prisma/client";

/** Section managers are scoped to their own section; directors see everything. */
function sectionScope(session: { role: EmployeeRole; departmentId: string | null }) {
  return session.role === EmployeeRole.SECTION_MANAGER
    ? session.departmentId
    : null;
}

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  phoneNumber: true,
  role: true,
  isActive: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
  createdAt: true,
} as const;

export async function GET() {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const scopedDeptId = sectionScope(auth.session);
    const employees = await prisma.commEmployee.findMany({
      where: scopedDeptId
        ? { OR: [{ departmentId: scopedDeptId }, { id: auth.session.sub }] }
        : {},
      orderBy: { name: "asc" },
      select: employeeSelect,
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
      departmentId?: string | null;
    };

    if (!body.name?.trim() || !body.email?.trim() || !body.password) {
      return jsonError("الاسم والبريد وكلمة المرور مطلوبة", "VALIDATION", 400);
    }

    // Section managers may only add employees inside their own section.
    const scopedDeptId = sectionScope(auth.session);
    const role = scopedDeptId ? EmployeeRole.EMPLOYEE : body.role ?? EmployeeRole.EMPLOYEE;
    const departmentId = scopedDeptId ?? body.departmentId ?? null;

    const employee = await createEmployee({
      name: body.name,
      email: body.email,
      phoneNumber: body.phoneNumber?.trim() || null,
      password: body.password,
      role,
      departmentId,
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
      departmentId?: string | null;
    };

    if (!body.id) {
      return jsonError("معرّف الموظف مطلوب", "VALIDATION", 400);
    }

    // Section managers may only edit members of their own section, and may not
    // promote roles or reassign sections.
    const scopedDeptId = sectionScope(auth.session);
    if (scopedDeptId) {
      const target = await prisma.commEmployee.findUnique({
        where: { id: body.id },
        select: { departmentId: true },
      });
      if (!target || target.departmentId !== scopedDeptId) {
        return jsonError("لا يمكنك تعديل عضو خارج قسمك", "FORBIDDEN", 403);
      }
      delete body.role;
      delete body.departmentId;
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

    const scopedDeptId = sectionScope(auth.session);
    if (scopedDeptId) {
      const target = await prisma.commEmployee.findUnique({
        where: { id },
        select: { departmentId: true },
      });
      if (!target || target.departmentId !== scopedDeptId) {
        return jsonError("لا يمكنك حذف عضو خارج قسمك", "FORBIDDEN", 403);
      }
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
