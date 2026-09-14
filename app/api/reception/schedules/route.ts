import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import {
  requireReceptionDeskSession,
  requireReceptionManageSession,
} from "@/lib/auth/route-guard";
import {
  approveScheduledVisit,
  createManagerScheduledVisit,
  listPendingScheduledVisits,
  listRejectedScheduledVisits,
  listTodayScheduledVisits,
  listWeekReceptionFeed,
  rejectScheduledVisit,
  startOfWeekSunday,
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

    const scope = request.nextUrl.searchParams.get("scope") ?? "today";
    const includePending = auth.session.deskManage === true;

    if (scope === "pending") {
      if (!includePending) {
        return jsonError("صلاحيات إدارة الاستقبال مطلوبة", "FORBIDDEN", 403);
      }
      const pending = await listPendingScheduledVisits();
      return jsonOk({ pending });
    }

    if (scope === "rejected") {
      if (!includePending) {
        return jsonError("صلاحيات إدارة الاستقبال مطلوبة", "FORBIDDEN", 403);
      }
      const rejected = await listRejectedScheduledVisits();
      return jsonOk({ rejected });
    }

    if (scope === "week") {
      const weekParam = request.nextUrl.searchParams.get("weekStart");
      const weekStart = weekParam
        ? parseLocalDate(weekParam) ?? startOfWeekSunday(new Date())
        : startOfWeekSunday(new Date());
      const feed = await listWeekReceptionFeed({
        weekStart,
        includePending,
      });
      return jsonOk({
        ...feed,
        meta: {
          visitTargets: VISIT_TARGETS,
          visitTypes: VISIT_TYPES,
          visitTimeSlots: VISIT_TIME_SLOTS,
        },
      });
    }

    const scheduled = await listTodayScheduledVisits();
    return jsonOk({
      day: scheduled.day,
      visits: scheduled.visits,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireReceptionManageSession();
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
      title?: string;
    };

    if (
      !body.visitorName?.trim() ||
      !body.visitorPhone?.trim() ||
      !body.visitType?.trim() ||
      !body.visitTarget?.trim() ||
      !body.visitDate ||
      !body.visitTimeSlot?.trim()
    ) {
      return jsonError("أكمل حقول جدولة الزيارة", "VALIDATION", 400);
    }
    if (isOrganizationRequired(body.visitType) && !body.organization?.trim()) {
      return jsonError(
        "الجهة / المؤسسة مطلوبة للزيارات التابعة لجهة",
        "VALIDATION",
        400,
      );
    }

    const visit = await createManagerScheduledVisit({
      visitorName: body.visitorName,
      visitorPhone: body.visitorPhone,
      organization: body.organization ?? "",
      visitType: body.visitType,
      visitTarget: body.visitTarget,
      reason: body.reason,
      visitDate: body.visitDate,
      visitTimeSlot: body.visitTimeSlot,
      title: body.title,
      createdById: auth.session.sub,
    });

    return jsonOk({ visit }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireReceptionManageSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      action?: "approve" | "reject";
      scheduleId?: string;
      reason?: string;
    };

    if (!body.scheduleId?.trim()) {
      return jsonError("معرّف الجدولة مطلوب", "VALIDATION", 400);
    }

    if (body.action === "approve") {
      const visit = await approveScheduledVisit({
        scheduleId: body.scheduleId,
        approvedById: auth.session.sub,
      });
      return jsonOk({ visit });
    }

    if (body.action === "reject") {
      const visit = await rejectScheduledVisit({
        scheduleId: body.scheduleId,
        approvedById: auth.session.sub,
        reason: body.reason,
      });
      return jsonOk({ visit });
    }

    return jsonError("إجراء غير معروف", "VALIDATION", 400);
  } catch (error) {
    return handleApiError(error);
  }
}
