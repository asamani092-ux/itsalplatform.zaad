import { prisma } from "./prisma";
import { VisitScheduleStatus } from "../generated/prisma/client";
import {
  combineVisitAt,
  isOrganizationRequired,
  VISIT_TIME_SLOTS,
} from "./reception/constants";

const logInclude = {
  department: { select: { id: true, name: true } },
  markedBy: { select: { id: true, name: true } },
} as const;

const scheduleInclude = {
  request: {
    select: {
      id: true,
      title: true,
      contactName: true,
      contactPhone: true,
      contactEmail: true,
      department: { select: { id: true, name: true } },
      requestType: { select: { id: true, name: true } },
      visitAttended: true,
      visitMarkedAt: true,
    },
  },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
} as const;

function dayBounds(day: Date) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function startOfWeekSunday(day = new Date()) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function weekBounds(weekStart: Date) {
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function inferTimeSlotFromDate(d: Date): string {
  const hour = d.getHours();
  if (hour >= 15) return "المساء";
  if (hour >= 11) return "الظهر";
  return "الصباح";
}

function mapScheduleRow(row: {
  id: string;
  visitorName: string;
  visitorPhone: string;
  organization: string;
  visitType: string;
  visitTarget: string;
  reason: string;
  visitTimeSlot: string;
  scheduledAt: Date;
  status: VisitScheduleStatus;
  source: string;
  title: string;
  requestId: string | null;
  checkedInAt: Date | null;
  visitorLogId: string | null;
  rejectionReason: string | null;
  request?: {
    id: string;
    title: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    department: { id: string; name: string } | null;
    requestType: { id: string; name: string } | null;
    visitAttended: boolean | null;
    visitMarkedAt: Date | null;
  } | null;
}) {
  const secondaryTitle =
    row.title ||
    row.request?.title ||
    row.request?.requestType?.name ||
    "";
  return {
    id: row.id,
    visitorName: row.visitorName,
    visitorPhone: row.visitorPhone,
    organization: row.organization,
    visitType: row.visitType,
    visitTarget: row.visitTarget,
    reason: row.reason,
    visitTimeSlot: row.visitTimeSlot,
    scheduledAt: row.scheduledAt,
    status: row.status,
    source: row.source,
    title: secondaryTitle,
    requestId: row.requestId,
    checkedInAt: row.checkedInAt,
    visitorLogId: row.visitorLogId,
    rejectionReason: row.rejectionReason,
    visitAttended: Boolean(row.checkedInAt),
    department: row.request?.department ?? undefined,
    requestType: row.request?.requestType ?? undefined,
    contactPhone: row.visitorPhone || row.request?.contactPhone || "",
    contactEmail: row.request?.contactEmail || "",
    // Legacy aliases used by older desk UI paths
    visitDate: row.scheduledAt.toISOString(),
    description: row.reason || row.request?.title || "",
  };
}

/** Desk "today" list: APPROVED schedules only. */
export async function listTodayScheduledVisits(day = new Date()) {
  const { start, end } = dayBounds(day);
  const rows = await prisma.receptionScheduledVisit.findMany({
    where: {
      status: VisitScheduleStatus.APPROVED,
      scheduledAt: { gte: start, lt: end },
    },
    include: scheduleInclude,
    orderBy: [{ scheduledAt: "asc" }, { visitorName: "asc" }],
  });
  return {
    day: start.toISOString(),
    visits: rows.map(mapScheduleRow),
  };
}

export async function listPendingScheduledVisits() {
  const rows = await prisma.receptionScheduledVisit.findMany({
    where: { status: VisitScheduleStatus.PENDING_APPROVAL },
    include: scheduleInclude,
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapScheduleRow);
}

export async function listRejectedScheduledVisits(limit = 100) {
  const rows = await prisma.receptionScheduledVisit.findMany({
    where: { status: VisitScheduleStatus.REJECTED },
    include: scheduleInclude,
    orderBy: [{ rejectedAt: "desc" }, { scheduledAt: "desc" }],
    take: limit,
  });
  return rows.map(mapScheduleRow);
}

/** Week feed for calendar: schedules (+ optional pending/rejected for managers) + attendance. */
export async function listWeekReceptionFeed(params: {
  weekStart: Date;
  includePending?: boolean;
}) {
  const { start, end } = weekBounds(params.weekStart);
  const statusFilter: VisitScheduleStatus[] = [VisitScheduleStatus.APPROVED];
  if (params.includePending) {
    statusFilter.push(
      VisitScheduleStatus.PENDING_APPROVAL,
      VisitScheduleStatus.REJECTED,
    );
  }

  const [schedules, attendanceEvents] = await Promise.all([
    prisma.receptionScheduledVisit.findMany({
      where: {
        status: { in: statusFilter },
        scheduledAt: { gte: start, lt: end },
      },
      include: scheduleInclude,
      orderBy: [{ scheduledAt: "asc" }, { visitorName: "asc" }],
    }),
    prisma.attendanceEvent.findMany({
      where: { scheduledAt: { gte: start, lt: end } },
      include: {
        _count: { select: { attendees: true } },
        attendees: { select: { attended: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  return {
    weekStart: start.toISOString(),
    weekEnd: new Date(end.getTime() - 1).toISOString(),
    schedules: schedules.map(mapScheduleRow),
    attendanceEvents: attendanceEvents.map((e) => ({
      id: e.id,
      title: e.title,
      kind: e.kind,
      scheduledAt: e.scheduledAt,
      notes: e.notes,
      total: e._count.attendees,
      attended: e.attendees.filter((a) => a.attended).length,
    })),
  };
}

export async function createPendingScheduledVisitFromRequest(params: {
  requestId: string;
  title: string;
  contactName?: string | null;
  contactPhone?: string | null;
  visitDate: Date;
  requestTypeName?: string | null;
}) {
  const existing = await prisma.receptionScheduledVisit.findUnique({
    where: { requestId: params.requestId },
  });
  if (existing) return existing;

  const visitorName =
    (params.contactName ?? "").trim() ||
    params.title.trim() ||
    "زائر";
  const scheduledAt = new Date(params.visitDate);
  const visitTimeSlot = inferTimeSlotFromDate(scheduledAt);

  return prisma.receptionScheduledVisit.create({
    data: {
      visitorName,
      visitorPhone: (params.contactPhone ?? "").trim(),
      organization: "",
      visitType: "",
      visitTarget: "",
      reason: "",
      visitTimeSlot,
      scheduledAt,
      status: VisitScheduleStatus.PENDING_APPROVAL,
      source: "REQUEST",
      title: params.title.trim() || params.requestTypeName?.trim() || "",
      requestId: params.requestId,
    },
    include: scheduleInclude,
  });
}

export async function createManagerScheduledVisit(params: {
  visitorName: string;
  visitorPhone: string;
  organization: string;
  visitType: string;
  visitTarget: string;
  reason?: string;
  visitDate: string;
  visitTimeSlot: string;
  title?: string;
  createdById?: string | null;
}) {
  const visitorName = params.visitorName.trim();
  const visitorPhone = params.visitorPhone.trim();
  const organization = params.organization.trim();
  const visitType = params.visitType.trim();
  let visitTarget = params.visitTarget.trim();
  const reason = params.reason?.trim() ?? "";
  const visitTimeSlot = params.visitTimeSlot.trim();

  if (!visitorName || !visitorPhone || !visitType || !visitTarget || !visitTimeSlot) {
    throw new Error("VALIDATION: أكمل حقول جدولة الزيارة المطلوبة");
  }
  if (isOrganizationRequired(visitType) && !organization) {
    throw new Error("VALIDATION: الجهة / المؤسسة مطلوبة للزيارات التابعة لجهة");
  }
  if (visitTarget === "زائر" && !reason) {
    throw new Error("VALIDATION: سبب الزيارة مطلوب عند اختيار «زائر»");
  }
  if (visitTarget === "زائر" && reason) {
    visitTarget = `زائر - ${reason}`;
  }
  if (
    visitTimeSlot &&
    !VISIT_TIME_SLOTS.includes(visitTimeSlot as (typeof VISIT_TIME_SLOTS)[number])
  ) {
    // allow custom slots already persisted historically
  }

  const scheduledAt = combineVisitAt(params.visitDate, visitTimeSlot);
  const now = new Date();

  const created = await prisma.receptionScheduledVisit.create({
    data: {
      visitorName,
      visitorPhone,
      organization,
      visitType,
      visitTarget,
      reason,
      visitTimeSlot,
      scheduledAt,
      status: VisitScheduleStatus.APPROVED,
      source: "MANAGER",
      title: (params.title ?? "").trim(),
      createdById: params.createdById || null,
      approvedById: params.createdById || null,
      approvedAt: now,
    },
    include: scheduleInclude,
  });

  const { notifyReceptionDeskApprovedSchedule } = await import("./notifications");
  await notifyReceptionDeskApprovedSchedule({
    visitorName: created.visitorName,
    scheduledAt: created.scheduledAt,
    scheduleId: created.id,
  });

  return mapScheduleRow(created);
}

export async function approveScheduledVisit(params: {
  scheduleId: string;
  approvedById: string;
}) {
  const existing = await prisma.receptionScheduledVisit.findUnique({
    where: { id: params.scheduleId },
  });
  if (!existing) {
    throw new Error("NOT_FOUND: الزيارة المجدولة غير موجودة");
  }
  if (existing.status !== VisitScheduleStatus.PENDING_APPROVAL) {
    throw new Error("CONFLICT: لا يمكن اعتماد زيارة ليست بانتظار الموافقة");
  }

  const updated = await prisma.receptionScheduledVisit.update({
    where: { id: existing.id },
    data: {
      status: VisitScheduleStatus.APPROVED,
      approvedById: params.approvedById,
      approvedAt: new Date(),
      rejectedAt: null,
      rejectionReason: null,
    },
    include: scheduleInclude,
  });

  const { notifyReceptionDeskApprovedSchedule } = await import("./notifications");
  await notifyReceptionDeskApprovedSchedule({
    visitorName: updated.visitorName,
    scheduledAt: updated.scheduledAt,
    scheduleId: updated.id,
  });

  return mapScheduleRow(updated);
}

export async function rejectScheduledVisit(params: {
  scheduleId: string;
  approvedById: string;
  reason?: string;
}) {
  const existing = await prisma.receptionScheduledVisit.findUnique({
    where: { id: params.scheduleId },
  });
  if (!existing) {
    throw new Error("NOT_FOUND: الزيارة المجدولة غير موجودة");
  }
  if (existing.status !== VisitScheduleStatus.PENDING_APPROVAL) {
    throw new Error("CONFLICT: لا يمكن رفض زيارة ليست بانتظار الموافقة");
  }

  const updated = await prisma.receptionScheduledVisit.update({
    where: { id: existing.id },
    data: {
      status: VisitScheduleStatus.REJECTED,
      approvedById: params.approvedById,
      rejectedAt: new Date(),
      rejectionReason: params.reason?.trim() || null,
      approvedAt: null,
    },
    include: scheduleInclude,
  });

  return mapScheduleRow(updated);
}

export async function listVisitorLogs(params?: {
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  const where: {
    visitAt?: { gte?: Date; lt?: Date };
  } = {};
  if (params?.from || params?.to) {
    where.visitAt = {};
    if (params.from) {
      const from = new Date(params.from);
      from.setHours(0, 0, 0, 0);
      where.visitAt.gte = from;
    }
    if (params.to) {
      const toExclusive = new Date(params.to);
      toExclusive.setHours(0, 0, 0, 0);
      toExclusive.setDate(toExclusive.getDate() + 1);
      where.visitAt.lt = toExclusive;
    }
  }

  const logs = await prisma.receptionVisitorLog.findMany({
    where,
    include: logInclude,
    // Newest registration first; secondary key breaks ties within the same time slot.
    orderBy: [{ visitAt: "desc" }, { createdAt: "desc" }],
    take: params?.limit ?? 500,
  });
  return { logs };
}

export async function listTodayVisitorLogs(day = new Date()) {
  const { start, end } = dayBounds(day);
  return listVisitorLogs({ from: start, to: new Date(end.getTime() - 1) });
}

export async function searchVisitorSuggestions(query: string) {
  const q = query.trim();
  if (q.length < 2) return [];

  const logs = await prisma.receptionVisitorLog.findMany({
    where: {
      OR: [
        { visitorName: { contains: q, mode: "insensitive" } },
        { visitorPhone: { contains: q } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      visitorName: true,
      visitorPhone: true,
      organization: true,
      visitTarget: true,
    },
  });

  const seen = new Set<string>();
  const unique: typeof logs = [];
  for (const row of logs) {
    if (seen.has(row.visitorName)) continue;
    seen.add(row.visitorName);
    unique.push(row);
    if (unique.length >= 5) break;
  }
  return unique;
}

export async function createVisitorLog(params: {
  visitorName: string;
  visitorPhone: string;
  organization: string;
  visitType: string;
  visitTarget: string;
  reason?: string;
  visitDate: string;
  visitTimeSlot: string;
  departmentId?: string | null;
  requestId?: string | null;
  markedById?: string | null;
}) {
  const visitorName = params.visitorName.trim();
  const visitorPhone = params.visitorPhone.trim();
  const organization = params.organization.trim();
  const visitType = params.visitType.trim();
  let visitTarget = params.visitTarget.trim();
  const reason = params.reason?.trim() ?? "";
  const visitTimeSlot = params.visitTimeSlot.trim();

  if (!visitorName || !visitorPhone || !visitType || !visitTarget || !visitTimeSlot) {
    throw new Error("VALIDATION: أكمل حقول الزائر المطلوبة");
  }
  if (isOrganizationRequired(visitType) && !organization) {
    throw new Error("VALIDATION: الجهة / المؤسسة مطلوبة للزيارات التابعة لجهة");
  }
  if (visitTarget === "زائر" && !reason) {
    throw new Error("VALIDATION: سبب الزيارة مطلوب عند اختيار «زائر»");
  }
  if (visitTarget === "زائر" && reason) {
    visitTarget = `زائر - ${reason}`;
  }

  const visitAt = combineVisitAt(params.visitDate, visitTimeSlot);

  return prisma.receptionVisitorLog.create({
    data: {
      visitorName,
      visitorPhone,
      organization,
      visitType,
      visitTarget,
      reason,
      visitTimeSlot,
      visitAt,
      departmentId: params.departmentId || null,
      requestId: params.requestId || null,
      markedById: params.markedById || null,
    },
    include: logInclude,
  });
}

/** Create multiple visitor logs with shared visit fields. O(n) time. */
export async function createVisitorLogsBulk(params: {
  visitors: { visitorName: string; visitorPhone: string }[];
  organization: string;
  visitType: string;
  visitTarget: string;
  reason?: string;
  visitDate: string;
  visitTimeSlot: string;
  markedById?: string | null;
}) {
  if (!params.visitors.length) {
    throw new Error("VALIDATION: أضف زائراً واحداً على الأقل");
  }

  const logs = [];
  for (const visitor of params.visitors) {
    logs.push(
      await createVisitorLog({
        visitorName: visitor.visitorName,
        visitorPhone: visitor.visitorPhone,
        organization: params.organization,
        visitType: params.visitType,
        visitTarget: params.visitTarget,
        reason: params.reason,
        visitDate: params.visitDate,
        visitTimeSlot: params.visitTimeSlot,
        markedById: params.markedById,
      }),
    );
  }
  return logs;
}

export async function checkInScheduledVisit(params: {
  scheduleId: string;
  visitorName: string;
  visitorPhone: string;
  organization: string;
  visitType: string;
  visitTarget: string;
  reason?: string;
  visitDate: string;
  visitTimeSlot: string;
  markedById?: string | null;
}) {
  const schedule = await prisma.receptionScheduledVisit.findFirst({
    where: {
      id: params.scheduleId,
      status: VisitScheduleStatus.APPROVED,
    },
    include: scheduleInclude,
  });

  if (!schedule) {
    throw new Error("NOT_FOUND: الزيارة غير موجودة في قائمة الاستقبال");
  }

  const departmentId = schedule.request?.department?.id ?? null;

  if (schedule.visitorLogId && schedule.checkedInAt) {
    const existingLog = await prisma.receptionVisitorLog.findUnique({
      where: { id: schedule.visitorLogId },
      include: logInclude,
    });
    return {
      schedule: mapScheduleRow(schedule),
      log: existingLog,
    };
  }

  if (schedule.visitorLogId && !schedule.checkedInAt) {
    const existingLog = await prisma.receptionVisitorLog.findUnique({
      where: { id: schedule.visitorLogId },
      include: logInclude,
    });
    const updated = await prisma.receptionScheduledVisit.update({
      where: { id: schedule.id },
      data: { checkedInAt: new Date() },
      include: scheduleInclude,
    });
    if (schedule.requestId) {
      await prisma.communicationRequest.update({
        where: { id: schedule.requestId },
        data: { visitAttended: true, visitMarkedAt: new Date() },
      });
    }
    return { schedule: mapScheduleRow(updated), log: existingLog };
  }

  const log = await createVisitorLog({
    visitorName: params.visitorName,
    visitorPhone: params.visitorPhone,
    organization: params.organization,
    visitType: params.visitType,
    visitTarget: params.visitTarget,
    reason: params.reason,
    visitDate: params.visitDate,
    visitTimeSlot: params.visitTimeSlot,
    departmentId,
    requestId: schedule.requestId,
    markedById: params.markedById,
  });

  const updated = await prisma.receptionScheduledVisit.update({
    where: { id: schedule.id },
    data: {
      checkedInAt: new Date(),
      visitorLogId: log.id,
      visitorName: params.visitorName.trim() || schedule.visitorName,
      visitorPhone: params.visitorPhone.trim() || schedule.visitorPhone,
      organization: params.organization.trim() || schedule.organization,
      visitType: params.visitType.trim() || schedule.visitType,
      visitTarget: params.visitTarget.trim() || schedule.visitTarget,
      visitTimeSlot: params.visitTimeSlot.trim() || schedule.visitTimeSlot,
    },
    include: scheduleInclude,
  });

  if (schedule.requestId) {
    await prisma.communicationRequest.update({
      where: { id: schedule.requestId },
      data: { visitAttended: true, visitMarkedAt: new Date() },
    });
  }

  return { schedule: mapScheduleRow(updated), log };
}

export async function undoScheduledAttendance(scheduleId: string) {
  const existing = await prisma.receptionScheduledVisit.findFirst({
    where: {
      id: scheduleId,
      status: VisitScheduleStatus.APPROVED,
    },
    select: { id: true, requestId: true, visitorLogId: true },
  });
  if (!existing) {
    throw new Error("NOT_FOUND: الزيارة غير موجودة في قائمة الاستقبال");
  }

  const updated = await prisma.receptionScheduledVisit.update({
    where: { id: existing.id },
    data: {
      checkedInAt: null,
      // Keep visitorLogId — cumulative; only clear check-in flag for desk UX.
    },
    include: scheduleInclude,
  });

  // Soft-undo: keep the visitor log (cumulative) but mark schedule unchecked.
  // Clear visitAttended on linked request so UI stays consistent.
  if (existing.requestId) {
    await prisma.communicationRequest.update({
      where: { id: existing.requestId },
      data: { visitAttended: false, visitMarkedAt: null },
    });
  }

  return { schedule: mapScheduleRow(updated) };
}

export async function getVisitorDashboardStats() {
  const logs = await prisma.receptionVisitorLog.findMany({
    select: {
      visitType: true,
      visitTimeSlot: true,
      visitTarget: true,
    },
  });

  let personal = 0;
  let official = 0;
  let morning = 0;
  const byTarget: Record<string, number> = {};
  const bySlot: Record<string, number> = {};

  for (const log of logs) {
    if (log.visitType === "شخصي") personal += 1;
    if (log.visitType === "تابع لجهة") official += 1;
    if (log.visitTimeSlot === "الصباح") morning += 1;
    const target = log.visitTarget.replace(/^زائر\s*-\s*/, "زائر").trim();
    byTarget[target] = (byTarget[target] || 0) + 1;
    bySlot[log.visitTimeSlot] = (bySlot[log.visitTimeSlot] || 0) + 1;
  }

  return {
    totals: {
      loggedVisits: logs.length,
      personal,
      official,
      morning,
    },
    byTarget: Object.entries(byTarget)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    bySlot: Object.entries(bySlot)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function getReceptionReports(params: {
  from: Date;
  to: Date;
  departmentId?: string | null;
}) {
  const from = new Date(params.from);
  from.setHours(0, 0, 0, 0);
  const toExclusive = new Date(params.to);
  toExclusive.setHours(0, 0, 0, 0);
  toExclusive.setDate(toExclusive.getDate() + 1);

  const where = {
    visitAt: { gte: from, lt: toExclusive },
    ...(params.departmentId ? { departmentId: params.departmentId } : {}),
  };

  const [logs, departments, scheduledInRange] = await Promise.all([
    prisma.receptionVisitorLog.findMany({
      where,
      include: logInclude,
      orderBy: [{ visitAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.receptionScheduledVisit.findMany({
      where: {
        status: VisitScheduleStatus.APPROVED,
        scheduledAt: { gte: from, lt: toExclusive },
        ...(params.departmentId
          ? { request: { departmentId: params.departmentId } }
          : {}),
      },
      select: {
        id: true,
        checkedInAt: true,
        visitorLogId: true,
        request: { select: { departmentId: true } },
      },
    }),
  ]);

  type DeptKpi = {
    departmentId: string | null;
    departmentName: string;
    loggedVisits: number;
    scheduledVisits: number;
    attendedScheduled: number;
    attendanceRate: number | null;
  };

  const kpiMap = new Map<string, DeptKpi>();
  for (const d of departments) {
    kpiMap.set(d.id, {
      departmentId: d.id,
      departmentName: d.name,
      loggedVisits: 0,
      scheduledVisits: 0,
      attendedScheduled: 0,
      attendanceRate: null,
    });
  }
  const unassigned: DeptKpi = {
    departmentId: null,
    departmentName: "بدون إدارة",
    loggedVisits: 0,
    scheduledVisits: 0,
    attendedScheduled: 0,
    attendanceRate: null,
  };

  for (const log of logs) {
    if (!log.departmentId) {
      unassigned.loggedVisits += 1;
      continue;
    }
    const row = kpiMap.get(log.departmentId);
    if (row) row.loggedVisits += 1;
  }
  for (const s of scheduledInRange) {
    const deptId = s.request?.departmentId ?? null;
    const row = deptId ? kpiMap.get(deptId) : unassigned;
    if (!row) continue;
    row.scheduledVisits += 1;
    if (s.checkedInAt || s.visitorLogId) row.attendedScheduled += 1;
  }

  const departmentKpis = [...kpiMap.values(), unassigned].map((k: DeptKpi) => ({
    ...k,
    attendanceRate:
      k.scheduledVisits > 0
        ? Math.round((k.attendedScheduled / k.scheduledVisits) * 1000) / 10
        : null,
  }));

  interface ReceptionVisitorLogRow {
    id: string;
    visitorName: string;
    visitorPhone: string;
    organization: string;
    visitType: string;
    visitTarget: string;
    reason: string;
    visitTimeSlot: string;
    visitAt: Date;
    department: { id: string; name: string } | null;
    markedBy: { id: string; name: string } | null;
  }

  interface ScheduledVisitAttendanceRow {
    id: string;
    checkedInAt: Date | null;
    visitorLogId: string | null;
  }

  const visits = (logs as ReceptionVisitorLogRow[]).map(
    (log: ReceptionVisitorLogRow) => ({
      id: log.id,
      visitorName: log.visitorName,
      visitorPhone: log.visitorPhone,
      organization: log.organization,
      visitType: log.visitType,
      visitTarget: log.visitTarget,
      reason: log.reason,
      visitTimeSlot: log.visitTimeSlot,
      visitAt: log.visitAt,
      departmentName: log.department?.name ?? null,
      markedByName: log.markedBy?.name ?? null,
    }),
  );

  return {
    from: from.toISOString(),
    to: params.to.toISOString(),
    totals: {
      loggedVisits: logs.length,
      scheduledVisits: scheduledInRange.length,
      attendedScheduled: (scheduledInRange as ScheduledVisitAttendanceRow[]).filter(
        (s: ScheduledVisitAttendanceRow) => Boolean(s.checkedInAt || s.visitorLogId),
      ).length,
      departmentsWithVisits: departmentKpis.filter(
        (k: DeptKpi) => k.loggedVisits > 0,
      ).length,
    },
    departmentKpis,
    visits,
    departments,
  };
}

/* ——— Attendance lists (meetings / job interviews) ——— */

export async function listAttendanceEvents() {
  return prisma.attendanceEvent.findMany({
    include: {
      _count: { select: { attendees: true } },
      attendees: { select: { attended: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 50,
  });
}

export async function getAttendanceEvent(id: string) {
  const event = await prisma.attendanceEvent.findUnique({
    where: { id },
    include: { attendees: { orderBy: { name: "asc" } } },
  });
  if (!event) throw new Error("NOT_FOUND: قائمة الحضور غير موجودة");
  return event;
}

export async function createAttendanceEvent(params: {
  title: string;
  kind: string;
  scheduledAt: Date;
  notes?: string;
  names: string[];
  createdById?: string | null;
}) {
  const title = params.title.trim();
  if (!title) throw new Error("VALIDATION: عنوان القائمة مطلوب");
  const names = params.names.map((n: string) => n.trim()).filter(Boolean);
  if (names.length === 0) throw new Error("VALIDATION: أضف اسماً واحداً على الأقل");

  return prisma.attendanceEvent.create({
    data: {
      title,
      kind: params.kind.trim() || "MEETING",
      scheduledAt: params.scheduledAt,
      notes: params.notes?.trim() ?? "",
      createdById: params.createdById || null,
      attendees: {
        create: names.map((name) => ({ name })),
      },
    },
    include: { attendees: true },
  });
}

export async function setAttendeeAttendance(params: {
  attendeeId: string;
  attended: boolean;
  markedById?: string | null;
}) {
  const attendee = await prisma.attendanceAttendee.findUnique({
    where: { id: params.attendeeId },
    include: {
      event: { select: { id: true, title: true, kind: true, scheduledAt: true } },
    },
  });
  if (!attendee) {
    throw new Error("NOT_FOUND: المشارك غير موجود");
  }

  if (!params.attended) {
    return prisma.attendanceAttendee.update({
      where: { id: params.attendeeId },
      data: {
        attended: false,
        checkedInAt: null,
        // Keep visitorLogId — cumulative linkage
      },
    });
  }

  if (attendee.visitorLogId) {
    return prisma.attendanceAttendee.update({
      where: { id: params.attendeeId },
      data: {
        attended: true,
        checkedInAt: attendee.checkedInAt ?? new Date(),
      },
    });
  }

  const scheduledAt = new Date(attendee.event.scheduledAt);
  const visitDate = `${scheduledAt.getFullYear()}-${String(scheduledAt.getMonth() + 1).padStart(2, "0")}-${String(scheduledAt.getDate()).padStart(2, "0")}`;
  const visitTimeSlot = inferTimeSlotFromDate(scheduledAt);
  const visitType = "شخصي";
  const visitTarget =
    attendee.event.kind === "JOB_INTERVIEW"
      ? "زائر - مقابلة وظيفية"
      : "زائر - اجتماع";

  const log = await createVisitorLog({
    visitorName: attendee.name,
    visitorPhone: attendee.phone?.trim() || "0500000000",
    organization: "",
    visitType,
    visitTarget,
    reason: attendee.event.title,
    visitDate,
    visitTimeSlot,
    markedById: params.markedById,
  });

  return prisma.attendanceAttendee.update({
    where: { id: params.attendeeId },
    data: {
      attended: true,
      checkedInAt: new Date(),
      visitorLogId: log.id,
    },
  });
}

export async function addAttendeesBulk(params: {
  eventId: string;
  names: string[];
}) {
  const names = params.names.map((n: string) => n.trim()).filter(Boolean);
  if (names.length === 0) throw new Error("VALIDATION: لا توجد أسماء للإضافة");
  await prisma.attendanceAttendee.createMany({
    data: names.map((name) => ({ eventId: params.eventId, name })),
  });
  return getAttendanceEvent(params.eventId);
}
