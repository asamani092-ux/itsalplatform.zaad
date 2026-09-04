import { prisma } from "./prisma";
import { RequestStatus } from "../generated/prisma/client";
import { combineVisitAt } from "./reception/constants";

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
  markedBy: { select: { id: true, name: true } },
} as const;

function dayBounds(day: Date) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

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
    orderBy: { visitAt: "desc" },
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

  if (!visitorName || !visitorPhone || !organization || !visitType || !visitTarget || !visitTimeSlot) {
    throw new Error("VALIDATION: أكمل حقول الزائر المطلوبة");
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

export async function checkInScheduledVisit(params: {
  requestId: string;
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
    select: { id: true, departmentId: true },
  });

  if (!request) {
    throw new Error("NOT_FOUND: الطلب غير موجود في قائمة الاستقبال");
  }

  const log = await createVisitorLog({
    ...params,
    departmentId: request.departmentId,
    requestId: request.id,
  });

  const updated = await prisma.communicationRequest.update({
    where: { id: request.id },
    data: { visitAttended: true, visitMarkedAt: new Date() },
    select: visitRequestSelect,
  });

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
    throw new Error("NOT_FOUND: الطلب غير موجود في قائمة الاستقبال");
  }
  const updated = await prisma.communicationRequest.update({
    where: { id: requestId },
    data: { visitAttended: false, visitMarkedAt: null },
    select: visitRequestSelect,
  });
  return { request: updated };
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
      select: { id: true, departmentId: true, visitAttended: true },
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
    const row = kpiMap.get(s.departmentId);
    if (!row) continue;
    row.scheduledVisits += 1;
    if (s.visitAttended) row.attendedScheduled += 1;
  }

  const departmentKpis = [...kpiMap.values(), unassigned].map((k) => ({
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
    organization: log.organization,
    visitType: log.visitType,
    visitTarget: log.visitTarget,
    reason: log.reason,
    visitTimeSlot: log.visitTimeSlot,
    visitAt: log.visitAt,
    departmentName: log.department?.name ?? null,
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
  const names = params.names.map((n) => n.trim()).filter(Boolean);
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
}) {
  return prisma.attendanceAttendee.update({
    where: { id: params.attendeeId },
    data: {
      attended: params.attended,
      checkedInAt: params.attended ? new Date() : null,
    },
  });
}

export async function addAttendeesBulk(params: {
  eventId: string;
  names: string[];
}) {
  const names = params.names.map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) throw new Error("VALIDATION: لا توجد أسماء للإضافة");
  await prisma.attendanceAttendee.createMany({
    data: names.map((name) => ({ eventId: params.eventId, name })),
  });
  return getAttendanceEvent(params.eventId);
}
