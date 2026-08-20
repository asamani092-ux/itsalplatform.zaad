import { prisma } from "./prisma";
import { RequestStatus } from "../generated/prisma/client";

const visitRequestSelect = {
  id: true,
  title: true,
  description: true,
  contactPhone: true,
  contactEmail: true,
  visitDate: true,
  visitAttended: true,
  visitMarkedAt: true,
  department: { select: { id: true, name: true } },
  requestType: { select: { id: true, name: true } },
} as const;

const logInclude = {
  department: { select: { id: true, name: true } },
  request: { select: { id: true, title: true } },
  markedBy: { select: { id: true, name: true } },
} as const;

function dayBounds(day: Date) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Today's scheduled visits across departments. Time O(n), Space O(n). */
export async function listTodayScheduledVisits(day = new Date()) {
  const { start, end } = dayBounds(day);

  const requests = await prisma.communicationRequest.findMany({
    where: {
      approvedAt: { not: null },
      requestType: { requiresVisitDate: true },
      visitDate: { gte: start, lt: end },
      status: {
        in: [
          RequestStatus.Approved_Pending_Assignment,
          RequestStatus.In_Progress,
          RequestStatus.Completed,
        ],
      },
    },
    select: visitRequestSelect,
    orderBy: [{ visitDate: "asc" }, { title: "asc" }],
  });

  return { day: start.toISOString(), visits: requests };
}

/** Today's cumulative attendance log. Time O(n), Space O(n). */
export async function listTodayVisitorLogs(day = new Date()) {
  const { start, end } = dayBounds(day);
  const logs = await prisma.receptionVisitorLog.findMany({
    where: { visitAt: { gte: start, lt: end } },
    include: logInclude,
    orderBy: { visitAt: "asc" },
  });
  return { day: start.toISOString(), logs };
}

/** Walk-in or confirmed check-in — cumulative insert only. Time O(1), Space O(1). */
export async function createVisitorLog(params: {
  visitorName: string;
  visitorPhone: string;
  reason: string;
  organization?: string | null;
  visitAt?: Date;
  departmentId?: string | null;
  requestId?: string | null;
  markedById?: string | null;
}) {
  const name = params.visitorName.trim();
  const phone = params.visitorPhone.trim();
  const reason = params.reason.trim();
  if (!name || !phone || !reason) {
    throw new Error("VALIDATION: الاسم والجوال والسبب مطلوبة");
  }

  return prisma.receptionVisitorLog.create({
    data: {
      visitorName: name,
      visitorPhone: phone,
      reason,
      organization: params.organization?.trim() || null,
      visitAt: params.visitAt ?? new Date(),
      departmentId: params.departmentId || null,
      requestId: params.requestId || null,
      markedById: params.markedById || null,
    },
    include: logInclude,
  });
}

/**
 * Mark scheduled visit attended and append visitor log (never overwrite prior logs).
 * Time O(1), Space O(1).
 */
export async function checkInScheduledVisit(params: {
  requestId: string;
  visitorName: string;
  visitorPhone: string;
  reason: string;
  organization?: string | null;
  visitAt?: Date;
  markedById?: string | null;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const request = await prisma.communicationRequest.findFirst({
    where: {
      id: params.requestId,
      approvedAt: { not: null },
      requestType: { requiresVisitDate: true },
      visitDate: { gte: today },
      status: {
        in: [
          RequestStatus.Approved_Pending_Assignment,
          RequestStatus.In_Progress,
          RequestStatus.Completed,
        ],
      },
    },
    select: {
      id: true,
      departmentId: true,
      visitAttended: true,
    },
  });

  if (!request) {
    throw new Error("NOT_FOUND: الطلب غير موجود في قائمة الاستقبال المركزي");
  }

  const [updated, log] = await prisma.$transaction([
    prisma.communicationRequest.update({
      where: { id: request.id },
      data: {
        visitAttended: true,
        visitMarkedAt: new Date(),
      },
      select: visitRequestSelect,
    }),
    prisma.receptionVisitorLog.create({
      data: {
        visitorName: params.visitorName.trim(),
        visitorPhone: params.visitorPhone.trim(),
        reason: params.reason.trim(),
        organization: params.organization?.trim() || null,
        visitAt: params.visitAt ?? new Date(),
        departmentId: request.departmentId,
        requestId: request.id,
        markedById: params.markedById || null,
      },
      include: logInclude,
    }),
  ]);

  return { request: updated, log };
}

export async function undoScheduledAttendance(requestId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.communicationRequest.findFirst({
    where: {
      id: requestId,
      visitDate: { gte: today },
      requestType: { requiresVisitDate: true },
    },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("NOT_FOUND: الطلب غير موجود في قائمة الاستقبال المركزي");
  }

  const updated = await prisma.communicationRequest.update({
    where: { id: requestId },
    data: { visitAttended: false, visitMarkedAt: null },
    select: visitRequestSelect,
  });

  return { request: updated };
}

/** Reports: department KPIs + official visit rows. Time O(n), Space O(n). */
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
      orderBy: { visitAt: "asc" },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.communicationRequest.findMany({
      where: {
        approvedAt: { not: null },
        requestType: { requiresVisitDate: true },
        visitDate: { gte: from, lt: toExclusive },
        ...(params.departmentId ? { departmentId: params.departmentId } : {}),
        status: {
          in: [
            RequestStatus.Approved_Pending_Assignment,
            RequestStatus.In_Progress,
            RequestStatus.Completed,
          ],
        },
      },
      select: {
        id: true,
        departmentId: true,
        visitAttended: true,
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
    const key = log.departmentId;
    if (!key) {
      unassigned.loggedVisits += 1;
      continue;
    }
    const row = kpiMap.get(key);
    if (row) row.loggedVisits += 1;
  }

  for (const s of scheduledInRange) {
    const row = kpiMap.get(s.departmentId);
    if (!row) continue;
    row.scheduledVisits += 1;
    if (s.visitAttended) row.attendedScheduled += 1;
  }

  const departmentKpis = [...kpiMap.values(), unassigned]
    .filter(
      (k) =>
        k.loggedVisits > 0 ||
        k.scheduledVisits > 0 ||
        k.departmentId !== null,
    )
    .map((k) => ({
      ...k,
      attendanceRate:
        k.scheduledVisits > 0
          ? Math.round((k.attendedScheduled / k.scheduledVisits) * 1000) / 10
          : null,
    }));

  const visits = logs.map((log) => ({
    id: log.id,
    visitorName: log.visitorName,
    visitorPhone: log.visitorPhone,
    reason: log.reason,
    organization: log.organization,
    visitAt: log.visitAt,
    departmentName: log.department?.name ?? null,
    requestTitle: log.request?.title ?? null,
    markedByName: log.markedBy?.name ?? null,
  }));

  return {
    from: from.toISOString(),
    to: params.to.toISOString(),
    totals: {
      loggedVisits: logs.length,
      scheduledVisits: scheduledInRange.length,
      attendedScheduled: scheduledInRange.filter((s) => s.visitAttended).length,
      departmentsWithVisits: departmentKpis.filter((k) => k.loggedVisits > 0).length,
    },
    departmentKpis,
    visits,
    departments,
  };
}
