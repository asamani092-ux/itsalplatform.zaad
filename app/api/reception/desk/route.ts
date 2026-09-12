import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { requireReceptionDeskSession } from "@/lib/auth/route-guard";
import {
  checkInScheduledVisit,
  createVisitorLog,
  getVisitorDashboardStats,
  listTodayScheduledVisits,
  listVisitorLogs,
  searchVisitorSuggestions,
  undoScheduledAttendance,
} from "@/lib/reception-service";
import {
  VISIT_TARGETS,
  VISIT_TIME_SLOTS,
  VISIT_TYPES,
} from "@/lib/reception/constants";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireReceptionDeskSession();
    if (auth.error) return auth.error;

    const q = request.nextUrl.searchParams.get("q");
    if (q !== null) {
      const suggestions = await searchVisitorSuggestions(q);
      return jsonOk({ suggestions });
    }

    const [scheduled, logs, stats] = await Promise.all([
      listTodayScheduledVisits(),
      listVisitorLogs({ limit: 300 }),
      getVisitorDashboardStats(),
    ]);

    return jsonOk({
      day: scheduled.day,
      visits: scheduled.visits,
      attendanceLogs: logs.logs,
      stats,
      meta: {
        visitTargets: VISIT_TARGETS,
        visitTypes: VISIT_TYPES,
        visitTimeSlots: VISIT_TIME_SLOTS,
      },
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
      organization?: string;
      visitType?: string;
      visitTarget?: string;
      reason?: string;
      visitDate?: string;
      visitTimeSlot?: string;
    };

    if (
      !body.visitorName?.trim() ||
      !body.visitorPhone?.trim() ||
      !body.organization?.trim() ||
      !body.visitType?.trim() ||
      !body.visitTarget?.trim() ||
      !body.visitDate ||
      !body.visitTimeSlot?.trim()
    ) {
      return jsonError("أكمل حقول تسجيل الزائر", "VALIDATION", 400);
    }

    const log = await createVisitorLog({
      visitorName: body.visitorName,
      visitorPhone: body.visitorPhone,
      organization: body.organization,
      visitType: body.visitType,
      visitTarget: body.visitTarget,
      reason: body.reason,
      visitDate: body.visitDate,
      visitTimeSlot: body.visitTimeSlot,
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
      organization?: string;
      visitType?: string;
      visitTarget?: string;
      reason?: string;
      visitDate?: string;
      visitTimeSlot?: string;
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
      !body.organization?.trim() ||
      !body.visitType?.trim() ||
      !body.visitTarget?.trim() ||
      !body.visitDate ||
      !body.visitTimeSlot?.trim()
    ) {
      return jsonError("أكمل بيانات تأكيد الحضور", "VALIDATION", 400);
    }

    const result = await checkInScheduledVisit({
      requestId: body.requestId,
      visitorName: body.visitorName,
      visitorPhone: body.visitorPhone,
      organization: body.organization,
      visitType: body.visitType,
      visitTarget: body.visitTarget,
      reason: body.reason,
      visitDate: body.visitDate,
      visitTimeSlot: body.visitTimeSlot,
      markedById: auth.session.sub,
    });

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
