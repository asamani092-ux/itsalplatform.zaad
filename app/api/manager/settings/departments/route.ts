import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { slugFromDisplayName } from "@/lib/slug";

/** Unique department slug; O(k) lookups on collision. */
async function uniqueDepartmentSlug(base: string): Promise<string> {
  let candidate = base;
  let suffix = 2;
  while (await prisma.department.findUnique({ where: { slug: candidate } })) {
    candidate = `${base.slice(0, 36)}-${suffix}`;
    suffix += 1;
    if (suffix > 50) {
      candidate = `${base.slice(0, 30)}-${Date.now().toString(36)}`;
      break;
    }
  }
  return candidate;
}

export async function GET() {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    });
    return jsonOk({ departments });
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
      managerEmail?: string;
      receptionToken?: string;
    };

    if (!body.name?.trim() || !body.managerEmail?.trim()) {
      return jsonError("الاسم وبريد المدير مطلوبان", "VALIDATION", 400);
    }

    const baseSlug = body.slug?.trim()
      ? slugFromDisplayName(body.slug, "dept")
      : slugFromDisplayName(body.name, "dept");
    const slug = await uniqueDepartmentSlug(baseSlug);

    const department = await prisma.department.create({
      data: {
        name: body.name.trim(),
        slug,
        managerEmail: body.managerEmail.trim(),
        receptionToken: body.receptionToken?.trim() || null,
      },
    });

    return jsonOk(department, 201);
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
      managerEmail?: string;
      receptionToken?: string;
      isActive?: boolean;
    };

    if (!body.id) {
      return jsonError("معرّف القسم مطلوب", "VALIDATION", 400);
    }

    const department = await prisma.department.update({
      where: { id: body.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.managerEmail !== undefined
          ? { managerEmail: body.managerEmail.trim() }
          : {}),
        ...(body.receptionToken !== undefined
          ? { receptionToken: body.receptionToken?.trim() || null }
          : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return jsonOk(department);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return jsonError("معرّف القسم مطلوب", "VALIDATION", 400);

    const used = await prisma.communicationRequest.count({ where: { departmentId: id } });
    const types = await prisma.requestType.count({ where: { departmentId: id } });
    const forms = await prisma.requestForm.count({ where: { departmentId: id } });

    if (used > 0 || types > 0 || forms > 0) {
      const deactivated = await prisma.department.update({
        where: { id },
        data: { isActive: false },
      });
      return jsonOk({
        id,
        deleted: false,
        deactivated: true,
        department: deactivated,
        message: "القسم مرتبط ببيانات — تم تعطيله بدل حذفه",
      });
    }

    await prisma.requestForm.updateMany({
      where: { departmentId: id },
      data: { departmentId: null },
    });
    await prisma.receptionVisitorLog.updateMany({
      where: { departmentId: id },
      data: { departmentId: null },
    });
    await prisma.commEmployee.updateMany({
      where: { departmentId: id },
      data: { departmentId: null },
    });
    await prisma.department.delete({ where: { id } });
    return jsonOk({ id, deleted: true, deactivated: false });
  } catch (error) {
    return handleApiError(error);
  }
}
