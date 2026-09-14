import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { requireReceptionDeskSession } from "@/lib/auth/route-guard";
import {
  checkInScheduledVisit,
  createVisitorLog,
  createVisitorLogsBulk,
  getVisitorDashboardStats,
  listPendingScheduledVisits,
  listRejectedScheduledVisits,
  listTodayScheduledVisits,
  listVisitorLogs,
  listWeekReceptionFeed,
  searchVisitorSuggestions,
  startOfWeekSunday,
  undoScheduledAttendance,
} from "@/lib/reception-service";
import {
  isOrganizationRequired,
  VISIT_TARGETS,
  VISIT_TIME_SLOTS,
  VISIT_TYPES,
} from "@/lib/reception/constants";

function parseLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireReceptionDeskSession();
    if (auth.error) return auth.error;

    const q = request.nextUrl.searchParams.get("q");
    if (q !== null) {
      const suggestions = await searchVisitorSuggestions(q);
      return jsonOk({ suggestions });
    }

    const weekParam = request.nextUrl.searchParams.get("weekStart");
    const weekStart = weekParam
      ? parseLocalDate(weekParam) ?? startOfWeekSunday(new Date())
      : startOfWeekSunday(new Date());
    const includePending = auth.session.deskManage === true;

    const [scheduled, logs, stats, weekFeed, pending, rejected] =
      await Promise.all([
        listTodayScheduledVisits(),
        listVisitorLogs({ limit: 300 }),
        getVisitorDashboardStats(),
        listWeekReceptionFeed({ weekStart, includePending }),
        includePending ? listPendingScheduledVisits() : Promise.resolve([]),
        includePending ? listRejectedScheduledVisits() : Promise.resolve([]),
      ]);

    return jsonOk({
      day: scheduled.day,
      visits: scheduled.visits,
      attendanceLogs: logs.logs,
      stats,
      week: weekFeed,
      pendingSchedules: pending,
      rejectedSchedules: rejected,
      meta: {
        visitTargets: VISIT_TARGETS,
        visitTypes: VISIT_TYPES,
        visitTimeSlots: VISIT_TIME_SLOTS,
      },
      caps: {
        deskManage: includePending,
        isReceptionDesk: auth.session.isReceptionDesk === true,
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

    // Managers without desk staff flag should not use walk-in register as primary path
    if (auth.session.deskManage && !auth.session.isReceptionDesk) {
      return jsonError(
        "تسجيل الزائر متاح لموظفي مكتب الاستقبال",
        "FORBIDDEN",
        403,
      );
    }

    const body = (await request.json()) as {
      visitorName?: string;
      visitorPhone?: string;
      visitors?: { visitorName?: string; visitorPhone?: string }[];
      organization?: string;
      visitType?: string;
      visitTarget?: string;
      reason?: string;
      visitDate?: string;
      visitTimeSlot?: string;
    };

    if (
      !body.visitType?.trim() ||
      !body.visitTarget?.trim() ||
      !body.visitDate ||
      !body.visitTimeSlot?.trim()
    ) {
      return jsonError("أكمل حقول تسجيل الزائر", "VALIDATION", 400);
    }
    if (isOrganizationRequired(body.visitType) && !body.organization?.trim()) {
      return jsonError("الجهة / المؤسسة مطلوبة للزيارات التابعة لجهة", "VALIDATION", 400);
    }

    const visitors =
      Array.isArray(body.visitors) && body.visitors.length > 0
        ? body.visitors
        : [{ visitorName: body.visitorName, visitorPhone: body.visitorPhone }];

    const normalized = visitors.map((v) => ({
      visitorName: (v.visitorName ?? "").trim(),
      visitorPhone: (v.visitorPhone ?? "").trim(),
    }));

    if (normalized.some((v) => !v.visitorName || !v.visitorPhone)) {
      return jsonError("اسم الزائر والجوال مطلوبان لكل صف", "VALIDATION", 400);
    }

    if (normalized.length === 1) {
      const log = await createVisitorLog({
        visitorName: normalized[0].visitorName,
        visitorPhone: normalized[0].visitorPhone,
        organization: body.organization ?? "",
        visitType: body.visitType,
        visitTarget: body.visitTarget,
        reason: body.reason,
        visitDate: body.visitDate,
        visitTimeSlot: body.visitTimeSlot,
        markedById: auth.session.sub,
      });
      return jsonOk({ log, logs: [log] }, 201);
    }

    const logs = await createVisitorLogsBulk({
      visitors: normalized,
      organization: body.organization ?? "",
      visitType: body.visitType,
      visitTarget: body.visitTarget,
      reason: body.reason,
      visitDate: body.visitDate,
      visitTimeSlot: body.visitTimeSlot,
      markedById: auth.session.sub,
    });

    return jsonOk({ log: logs[0], logs }, 201);
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
      scheduleId?: string;
      /** @deprecated use scheduleId — kept for transitional clients */
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

    const scheduleId = body.scheduleId || body.requestId;
    if (!scheduleId) {
      return jsonError("معرّف الجدولة مطلوب", "VALIDATION", 400);
    }

    if (body.action === "undo") {
      const result = await undoScheduledAttendance(scheduleId);
      return jsonOk(result);
    }

    if (
      !body.visitorName?.trim() ||
      !body.visitorPhone?.trim() ||
      !body.visitType?.trim() ||
      !body.visitTarget?.trim() ||
      !body.visitDate ||
      !body.visitTimeSlot?.trim()
    ) {
      return jsonError("أكمل بيانات تأكيد الحضور", "VALIDATION", 400);
    }
    if (isOrganizationRequired(body.visitType) && !body.organization?.trim()) {
      return jsonError("الجهة / المؤسسة مطلوبة للزيارات التابعة لجهة", "VALIDATION", 400);
    }

    const result = await checkInScheduledVisit({
      scheduleId,
      visitorName: body.visitorName,
      visitorPhone: body.visitorPhone,
      organization: body.organization ?? "",
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
