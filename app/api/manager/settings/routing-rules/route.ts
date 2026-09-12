import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { listRoutingRules } from "@/lib/routing-service";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";

const ruleInclude = {
  requestType: { select: { id: true, name: true, slug: true } },
  employee: { select: { id: true, name: true, email: true } },
} as const;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const requestTypeId = request.nextUrl.searchParams.get("requestTypeId") ?? undefined;
    const includeInactive = request.nextUrl.searchParams.get("all") === "1";
    const rules = await listRoutingRules({ requestTypeId, includeInactive });
    return jsonOk({ rules });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      requestTypeId?: string;
      employeeId?: string;
    };

    if (!body.requestTypeId || !body.employeeId) {
      return jsonError("نوع الطلب والموظف مطلوبان", "VALIDATION", 400);
    }

    const [requestType, employee] = await Promise.all([
      prisma.requestType.findFirst({
        where: { id: body.requestTypeId, isActive: true },
      }),
      prisma.commEmployee.findFirst({
        where: {
          id: body.employeeId,
          isActive: true,
          role: "EMPLOYEE",
        },
      }),
    ]);

    if (!requestType) {
      return jsonError("نوع الطلب غير موجود أو غير نشط", "NOT_FOUND", 404);
    }
    if (!employee) {
      return jsonError("الموظف غير موجود أو غير نشط", "NOT_FOUND", 404);
    }

    const rule = await prisma.routingRule.create({
      data: {
        requestTypeId: body.requestTypeId,
        employeeId: body.employeeId,
      },
      include: ruleInclude,
    });

    return jsonOk({ rule }, 201);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return jsonError(
        "هذه القاعدة موجودة مسبقاً لنفس نوع الطلب والموظف",
        "CONFLICT",
        409,
      );
    }
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      id?: string;
      isActive?: boolean;
    };

    if (!body.id) {
      return jsonError("معرّف القاعدة مطلوب", "VALIDATION", 400);
    }
    if (typeof body.isActive !== "boolean") {
      return jsonError("حالة التفعيل مطلوبة", "VALIDATION", 400);
    }

    const rule = await prisma.routingRule.update({
      where: { id: body.id },
      data: { isActive: body.isActive },
      include: ruleInclude,
    });

    return jsonOk({ rule });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return jsonError("معرّف القاعدة مطلوب", "VALIDATION", 400);
    }

    await prisma.routingRule.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
