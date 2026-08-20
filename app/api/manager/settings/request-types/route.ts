import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";

export async function GET() {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const requestTypes = await prisma.requestType.findMany({
      include: { department: { select: { id: true, name: true, slug: true } } },
      orderBy: { name: "asc" },
    });
    return jsonOk({ requestTypes });
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
      slug?: string;
      description?: string;
      requiresVisitDate?: boolean;
      departmentId?: string;
    };

    if (!body.name?.trim() || !body.slug?.trim()) {
      return jsonError("الاسم والمعرّف مطلوبان", "VALIDATION", 400);
    }

    const requestType = await prisma.requestType.create({
      data: {
        name: body.name.trim(),
        slug: body.slug.trim(),
        description: body.description?.trim() ?? "",
        requiresVisitDate: body.requiresVisitDate ?? false,
        departmentId: body.departmentId ?? null,
      },
    });

    return jsonOk(requestType, 201);
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
      description?: string;
      requiresVisitDate?: boolean;
      departmentId?: string | null;
      isActive?: boolean;
    };

    if (!body.id) {
      return jsonError("معرّف نوع الطلب مطلوب", "VALIDATION", 400);
    }

    const requestType = await prisma.requestType.update({
      where: { id: body.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined
          ? { description: body.description.trim() }
          : {}),
        ...(body.requiresVisitDate !== undefined
          ? { requiresVisitDate: body.requiresVisitDate }
          : {}),
        ...(body.departmentId !== undefined ? { departmentId: body.departmentId } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return jsonOk(requestType);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return jsonError("معرّف نوع الطلب مطلوب", "VALIDATION", 400);

    const used = await prisma.communicationRequest.count({ where: { requestTypeId: id } });
    const forms = await prisma.requestForm.count({ where: { requestTypeId: id } });
    if (used > 0 || forms > 0) {
      const deactivated = await prisma.requestType.update({
        where: { id },
        data: { isActive: false },
      });
      return jsonOk({
        id,
        deleted: false,
        deactivated: true,
        requestType: deactivated,
        message: "النوع مستخدم في طلبات أو نماذج — تم تعطيله بدل حذفه",
      });
    }

    await prisma.routingRule.deleteMany({ where: { requestTypeId: id } });
    await prisma.requestForm.updateMany({
      where: { requestTypeId: id },
      data: { requestTypeId: null },
    });
    await prisma.requestType.delete({ where: { id } });
    return jsonOk({ id, deleted: true, deactivated: false });
  } catch (error) {
    return handleApiError(error);
  }
}
