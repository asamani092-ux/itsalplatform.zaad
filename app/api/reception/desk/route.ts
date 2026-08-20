import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { requireReceptionDeskSession } from "@/lib/auth/route-guard";
import {
  checkInScheduledVisit,
  createVisitorLog,
  listTodayScheduledVisits,
  listTodayVisitorLogs,
  undoScheduledAttendance,
} from "@/lib/reception-service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await requireReceptionDeskSession();
    if (auth.error) return auth.error;

    const [scheduled, attendance, departments] = await Promise.all([
      listTodayScheduledVisits(),
      listTodayVisitorLogs(),
      prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return jsonOk({
      day: scheduled.day,
      visits: scheduled.visits,
      attendanceLogs: attendance.logs,
      departments,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireReceptionDeskSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      visitorName?: string;
      visitorPhone?: string;
      reason?: string;
      organization?: string | null;
      visitAt?: string;
      departmentId?: string | null;
    };

    if (!body.visitorName?.trim() || !body.visitorPhone?.trim() || !body.reason?.trim()) {
      return jsonError("الاسم والجوال والسبب مطلوبة", "VALIDATION", 400);
    }

    const log = await createVisitorLog({
      visitorName: body.visitorName,
      visitorPhone: body.visitorPhone,
      reason: body.reason,
      organization: body.organization,
      visitAt: body.visitAt ? new Date(body.visitAt) : undefined,
      departmentId: body.departmentId,
      markedById: auth.session.sub,
    });

    return jsonOk({ log }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireReceptionDeskSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      action?: "check_in" | "undo";
      requestId?: string;
      visitorName?: string;
      visitorPhone?: string;
      reason?: string;
      organization?: string | null;
      visitAt?: string;
    };

    if (!body.requestId) {
      return jsonError("معرّف الطلب مطلوب", "VALIDATION", 400);
    }

    if (body.action === "undo") {
      const result = await undoScheduledAttendance(body.requestId);
      return jsonOk(result);
    }

    if (
      !body.visitorName?.trim() ||
      !body.visitorPhone?.trim() ||
      !body.reason?.trim()
    ) {
      return jsonError("الاسم والجوال والسبب مطلوبة لتسجيل الحضور", "VALIDATION", 400);
    }

    const result = await checkInScheduledVisit({
      requestId: body.requestId,
      visitorName: body.visitorName,
      visitorPhone: body.visitorPhone,
      reason: body.reason,
      organization: body.organization,
      visitAt: body.visitAt ? new Date(body.visitAt) : undefined,
      markedById: auth.session.sub,
    });

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
