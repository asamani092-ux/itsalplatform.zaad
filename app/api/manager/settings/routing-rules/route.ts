import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { listRoutingRules } from "@/lib/routing-service";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const requestTypeId = request.nextUrl.searchParams.get("requestTypeId") ?? undefined;
    const rules = await listRoutingRules(requestTypeId);
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

    const rule = await prisma.routingRule.create({
      data: {
        requestTypeId: body.requestTypeId,
        employeeId: body.employeeId,
      },
      include: {
        requestType: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    });

    return jsonOk(rule, 201);
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
      isActive?: boolean;
    };

    if (!body.id) {
      return jsonError("معرّف القاعدة مطلوب", "VALIDATION", 400);
    }

    const rule = await prisma.routingRule.update({
      where: { id: body.id },
      data: { ...(body.isActive !== undefined ? { isActive: body.isActive } : {}) },
    });

    return jsonOk(rule);
  } catch (error) {
    return handleApiError(error);
  }
}
