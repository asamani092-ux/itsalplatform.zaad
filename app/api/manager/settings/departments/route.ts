import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";

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

    if (!body.name?.trim() || !body.slug?.trim() || !body.managerEmail?.trim()) {
      return jsonError("الاسم والمعرّف والبريد مطلوبة", "VALIDATION", 400);
    }

    const department = await prisma.department.create({
      data: {
        name: body.name.trim(),
        slug: body.slug.trim(),
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
