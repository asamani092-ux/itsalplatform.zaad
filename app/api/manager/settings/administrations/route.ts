import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { AdministrationKind } from "@/generated/prisma/client";

/** Directory of administrations (الإدارات) and their managers. */
export async function GET() {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const administrations = await prisma.administration.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    });
    return jsonOk({ administrations });
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
      kind?: AdministrationKind;
    };

    if (!body.name?.trim() || !body.slug?.trim() || !body.managerEmail?.trim()) {
      return jsonError("الاسم والمعرّف والبريد مطلوبة", "VALIDATION", 400);
    }

    const administration = await prisma.administration.create({
      data: {
        name: body.name.trim(),
        slug: body.slug.trim(),
        managerEmail: body.managerEmail.trim(),
        kind: body.kind === "INTERNAL" ? "INTERNAL" : "EXTERNAL",
      },
    });

    return jsonOk(administration, 201);
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
      kind?: AdministrationKind;
      isActive?: boolean;
    };

    if (!body.id) {
      return jsonError("معرّف الإدارة مطلوب", "VALIDATION", 400);
    }

    const administration = await prisma.administration.update({
      where: { id: body.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.managerEmail !== undefined
          ? { managerEmail: body.managerEmail.trim() }
          : {}),
        ...(body.kind !== undefined ? { kind: body.kind } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return jsonOk(administration);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return jsonError("معرّف الإدارة مطلوب", "VALIDATION", 400);

    const sections = await prisma.department.count({ where: { administrationId: id } });
    const requests = await prisma.communicationRequest.count({
      where: { requesterAdministrationId: id },
    });

    if (sections > 0 || requests > 0) {
      const deactivated = await prisma.administration.update({
        where: { id },
        data: { isActive: false },
      });
      return jsonOk({
        id,
        deleted: false,
        deactivated: true,
        administration: deactivated,
        message: "الإدارة مرتبطة ببيانات — تم تعطيلها بدل حذفها",
      });
    }

    await prisma.administration.delete({ where: { id } });
    return jsonOk({ id, deleted: true, deactivated: false });
  } catch (error) {
    return handleApiError(error);
  }
}
