import { prisma } from "./prisma";
import { calculateSlaMetrics } from "./sla";
import { ARCHIVE_STATUSES, ACTIVE_STATUSES, assertTransition } from "./workflow";
import { resolveAssignee } from "./routing-service";
import { RequestStatus } from "../generated/prisma/client";
import { generateApprovalToken } from "./tokens";
import { notify } from "./notifications";

type DashboardView = "active" | "archive" | "all";

const APPROVAL_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function approvalTokenExpiresAtFromNow(): Date {
  return new Date(Date.now() + APPROVAL_TOKEN_TTL_MS);
}

const requestInclude = {
  assignedEmployee: { select: { id: true, name: true, email: true } },
  department: { select: { id: true, name: true, slug: true } },
  requestType: {
    select: { id: true, name: true, slug: true, requiresVisitDate: true },
  },
} as const;

function withSla<T extends {
  createdAt: Date;
  approvedAt: Date | null;
  assignedAt: Date | null;
  completedAt: Date | null;
}>(request: T) {
  return {
    ...request,
    sla: calculateSlaMetrics({
      createdAt: request.createdAt,
      approvedAt: request.approvedAt,
      assignedAt: request.assignedAt,
      completedAt: request.completedAt,
    }),
  };
}

export async function listRequests(options: {
  view?: DashboardView;
  status?: RequestStatus;
  departmentId?: string;
  requestTypeId?: string;
  assignedEmployeeId?: string;
}) {
  const { view = "all", status, departmentId, requestTypeId, assignedEmployeeId } =
    options;

  let statusFilter: RequestStatus[] | undefined;
  if (status) {
    statusFilter = [status];
  } else if (view === "active") {
    statusFilter = ACTIVE_STATUSES;
  } else if (view === "archive") {
    statusFilter = ARCHIVE_STATUSES;
  }

  const requests = await prisma.communicationRequest.findMany({
    where: {
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(requestTypeId ? { requestTypeId } : {}),
      ...(assignedEmployeeId ? { assignedEmployeeId } : {}),
    },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });

  return requests.map(withSla);
}

export async function getRequestById(id: string) {
  const request = await prisma.communicationRequest.findUnique({
    where: { id },
    include: {
      ...requestInclude,
      assignmentHistory: {
        include: { employee: { select: { id: true, name: true, email: true } } },
        orderBy: { assignedAt: "desc" },
      },
      statusHistory: { orderBy: { changedAt: "desc" } },
    },
  });

  if (!request) {
    throw new Error("NOT_FOUND: الطلب غير موجود");
  }

  return withSla(request);
}

export async function recordStatusChange(params: {
  requestId: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  changedBy?: string;
  note?: string;
}) {
  return prisma.statusHistory.create({
    data: {
      requestId: params.requestId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      changedBy: params.changedBy,
      note: params.note,
    },
  });
}

export async function recordAssignment(params: {
  requestId: string;
  employeeId: string;
  assignedBy?: string;
  note?: string;
}) {
  return prisma.assignmentHistory.create({
    data: {
      requestId: params.requestId,
      employeeId: params.employeeId,
      assignedBy: params.assignedBy,
      note: params.note,
    },
  });
}

export async function submitRequest(params: {
  title: string;
  description: string;
  requiredDate: Date;
  contactEmail: string;
  contactPhone: string;
  departmentId: string;
  requestTypeId: string;
  visitDate?: Date | null;
}) {
  const department = await prisma.department.findFirst({
    where: { id: params.departmentId, isActive: true },
  });
  if (!department) {
    throw new Error("NOT_FOUND: القسم غير موجود");
  }

  const requestType = await prisma.requestType.findFirst({
    where: { id: params.requestTypeId, isActive: true },
  });
  if (!requestType) {
    throw new Error("NOT_FOUND: نوع الطلب غير موجود");
  }

  if (requestType.requiresVisitDate && !params.visitDate) {
    throw new Error("VALIDATION: تاريخ الزيارة مطلوب لهذا النوع");
  }

  const approvalToken = generateApprovalToken();
  const initialStatus = RequestStatus.Approved_Pending_Assignment;
  const now = new Date();

  const created = await prisma.communicationRequest.create({
    data: {
      title: params.title,
      description: params.description,
      requiredDate: params.requiredDate,
      contactEmail: params.contactEmail,
      contactPhone: params.contactPhone,
      managerEmail: department.managerEmail,
      departmentId: params.departmentId,
      requestTypeId: params.requestTypeId,
      visitDate: params.visitDate ?? null,
      approvalToken,
      approvalTokenExpiresAt: approvalTokenExpiresAtFromNow(),
      status: initialStatus,
      approvedAt: now,
    },
    include: requestInclude,
  });

  await recordStatusChange({
    requestId: created.id,
    fromStatus: null,
    toStatus: initialStatus,
    note: "تم تقديم الطلب",
  });

  const assignee = await resolveAssignee(params.requestTypeId);
  if (assignee) {
    assertTransition(
      RequestStatus.Approved_Pending_Assignment,
      RequestStatus.In_Progress,
    );
    const assigned = await prisma.communicationRequest.update({
      where: { id: created.id },
      data: {
        status: RequestStatus.In_Progress,
        assignedEmployeeId: assignee.id,
        assignedAt: now,
      },
      include: requestInclude,
    });
    await recordStatusChange({
      requestId: created.id,
      fromStatus: RequestStatus.Approved_Pending_Assignment,
      toStatus: RequestStatus.In_Progress,
      changedBy: "routing-service",
      note: "إسناد تلقائي عبر قاعدة التوجيه",
    });
    await recordAssignment({
      requestId: created.id,
      employeeId: assignee.id,
      assignedBy: "routing-service",
      note: "إسناد تلقائي",
    });
    await notify({
      recipientId: assignee.id,
      recipientEmail: assignee.email,
      type: "assignment",
      title: "تم إسناد تذكرة جديدة إليك",
      body: `الطلب: ${assigned.title}`,
      link: `/employee/tickets/${assigned.id}`,
      channel: "both",
      emailKind: "assigned",
    });
    return { request: withSla(assigned), approvalUrl: null as string | null };
  }

  return { request: withSla(created), approvalUrl: null as string | null };
}

export async function assignRequest(params: {
  requestId: string;
  employeeId: string;
  assignedBy?: string;
  note?: string;
}) {
  const existing = await getRequestById(params.requestId);

  if (existing.status !== RequestStatus.Approved_Pending_Assignment) {
    throw new Error("INVALID_STATE: يمكن الإسناد فقط للطلبات المعتمدة وبانتظار التعيين");
  }

  const employee = await prisma.commEmployee.findFirst({
    where: { id: params.employeeId, isActive: true },
  });

  if (!employee) {
    throw new Error("NOT_FOUND: الموظف غير موجود أو غير نشط");
  }

  assertTransition(existing.status, RequestStatus.In_Progress);
  const now = new Date();

  const updated = await prisma.communicationRequest.update({
    where: { id: params.requestId },
    data: {
      status: RequestStatus.In_Progress,
      assignedEmployeeId: params.employeeId,
      assignedAt: now,
    },
    include: requestInclude,
  });

  await recordStatusChange({
    requestId: params.requestId,
    fromStatus: RequestStatus.Approved_Pending_Assignment,
    toStatus: RequestStatus.In_Progress,
    changedBy: params.assignedBy,
    note: params.note ?? "إسناد أولي",
  });

  await recordAssignment({
    requestId: params.requestId,
    employeeId: params.employeeId,
    assignedBy: params.assignedBy,
    note: params.note,
  });

  await notify({
    recipientId: employee.id,
    recipientEmail: employee.email,
    type: "assignment",
    title: "تم إسناد تذكرة جديدة إليك",
    body: `الطلب: ${updated.title}`,
    link: `/employee/tickets/${updated.id}`,
    channel: "both",
    emailKind: "assigned",
  });

  return withSla(updated);
}

export async function reassignRequest(params: {
  requestId: string;
  employeeId: string;
  assignedBy?: string;
  note?: string;
}) {
  const existing = await getRequestById(params.requestId);

  if (existing.status !== RequestStatus.In_Progress) {
    throw new Error("INVALID_STATE: يمكن إعادة الإسناد فقط للطلبات قيد التنفيذ");
  }

  const employee = await prisma.commEmployee.findFirst({
    where: { id: params.employeeId, isActive: true },
  });

  if (!employee) {
    throw new Error("NOT_FOUND: الموظف غير موجود أو غير نشط");
  }

  const updated = await prisma.communicationRequest.update({
    where: { id: params.requestId },
    data: { assignedEmployeeId: params.employeeId },
    include: requestInclude,
  });

  await recordAssignment({
    requestId: params.requestId,
    employeeId: params.employeeId,
    assignedBy: params.assignedBy,
    note: params.note ?? "إعادة إسناد",
  });

  return withSla(updated);
}

export async function updateRequestStatus(params: {
  requestId: string;
  status: RequestStatus;
  changedBy?: string;
  note?: string;
  proofFileUrl?: string;
}) {
  const existing = await getRequestById(params.requestId);
  assertTransition(existing.status, params.status);

  const now = new Date();
  const updateData: {
    status: RequestStatus;
    completedAt?: Date;
    proofFileUrl?: string;
  } = { status: params.status };

  if (params.status === RequestStatus.Completed) {
    updateData.completedAt = now;
    if (params.proofFileUrl) {
      updateData.proofFileUrl = params.proofFileUrl;
    }
  }

  const updated = await prisma.communicationRequest.update({
    where: { id: params.requestId },
    data: updateData,
    include: requestInclude,
  });

  await recordStatusChange({
    requestId: params.requestId,
    fromStatus: existing.status,
    toStatus: params.status,
    changedBy: params.changedBy,
    note: params.note,
  });

  return withSla(updated);
}

export async function completeEmployeeTicket(params: {
  requestId: string;
  employeeId: string;
  proofFileUrl?: string;
}) {
  const existing = await getRequestById(params.requestId);

  if (existing.assignedEmployeeId !== params.employeeId) {
    throw new Error("FORBIDDEN: هذا الطلب غير مسند إليك");
  }

  if (existing.status !== RequestStatus.In_Progress) {
    throw new Error("INVALID_STATE: يمكن إكمال الطلبات قيد التنفيذ فقط");
  }

  const completed = await updateRequestStatus({
    requestId: params.requestId,
    status: RequestStatus.Completed,
    changedBy: params.employeeId,
    note: "إكمال من مساحة الموظف",
    proofFileUrl: params.proofFileUrl,
  });

  const { notifySubmitter } = await import("./notifications");
  await notifySubmitter({
    contactEmail: completed.contactEmail,
    contactPhone: completed.contactPhone,
    requestTitle: completed.title,
    message: `تم إكمال طلبك "${completed.title}".`,
    reference: completed.id.slice(-8).toUpperCase(),
  });

  return completed;
}

interface KpiDepartmentNameRow {
  id: string;
  name: string;
}

interface KpiRequestTypeNameRow {
  id: string;
  name: string;
}

interface KpiStatusCountGroupRow {
  status: RequestStatus;
  _count: { _all: number };
}

interface KpiDepartmentCountGroupRow {
  departmentId: string;
  _count: { _all: number };
}

interface KpiRequestTypeCountGroupRow {
  requestTypeId: string;
  _count: { _all: number };
}

interface KpiCompletedLifecycleRow {
  requestTypeId: string;
  createdAt: Date;
  completedAt: Date | null;
}

export async function getManagerKpis() {
  const [statusCounts, byDepartment, byRequestType, allCompleted]: [
    KpiStatusCountGroupRow[],
    KpiDepartmentCountGroupRow[],
    KpiRequestTypeCountGroupRow[],
    KpiCompletedLifecycleRow[],
  ] = await Promise.all([
      prisma.communicationRequest.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.communicationRequest.groupBy({
        by: ["departmentId"],
        _count: { _all: true },
      }),
      prisma.communicationRequest.groupBy({
        by: ["requestTypeId"],
        _count: { _all: true },
      }),
      prisma.communicationRequest.findMany({
        where: { completedAt: { not: null } },
        select: {
          requestTypeId: true,
          createdAt: true,
          completedAt: true,
        },
      }),
    ]);

  const departments: KpiDepartmentNameRow[] = await prisma.department.findMany({
    select: { id: true, name: true },
  });
  const requestTypes: KpiRequestTypeNameRow[] = await prisma.requestType.findMany({
    select: { id: true, name: true },
  });

  const deptMap = Object.fromEntries(
    departments.map((d: KpiDepartmentNameRow) => [d.id, d.name]),
  );
  const typeMap = Object.fromEntries(
    requestTypes.map((t: KpiRequestTypeNameRow) => [t.id, t.name]),
  );

  const slaByType: Record<string, { count: number; avgMs: number }> = {};
  for (const row of allCompleted) {
    if (!row.completedAt) continue;
    const ms = row.completedAt.getTime() - row.createdAt.getTime();
    if (!slaByType[row.requestTypeId]) {
      slaByType[row.requestTypeId] = { count: 0, avgMs: 0 };
    }
    const bucket = slaByType[row.requestTypeId];
    bucket.avgMs =
      (bucket.avgMs * bucket.count + ms) / (bucket.count + 1);
    bucket.count += 1;
  }

  const total = statusCounts.reduce(
    (sum: number, s: KpiStatusCountGroupRow) => sum + s._count._all,
    0,
  );
  const completed =
    statusCounts.find((s: KpiStatusCountGroupRow) => s.status === RequestStatus.Completed)?._count
      ._all ?? 0;

  const countOf = (status: RequestStatus) =>
    statusCounts.find((s: KpiStatusCountGroupRow) => s.status === status)?._count._all ?? 0;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthAhead = new Date();
  monthAhead.setDate(monthAhead.getDate() + 30);

  const [completedThisWeek, overdueOpen, upcomingBookings, visitsToday, avgAssignMsRows] =
    await Promise.all([
      prisma.communicationRequest.count({
        where: { completedAt: { gte: weekAgo } },
      }),
      prisma.communicationRequest.count({
        where: {
          requiredDate: { lt: todayStart },
          status: {
            notIn: [RequestStatus.Completed, RequestStatus.Archived],
          },
        },
      }),
      prisma.hospitalityBooking.count({
        where: { meetingDate: { gte: todayStart, lte: monthAhead } },
      }),
      prisma.communicationRequest.count({
        where: {
          visitDate: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) },
          approvedAt: { not: null },
          requestType: { requiresVisitDate: true },
        },
      }),
      prisma.communicationRequest.findMany({
        where: { assignedAt: { not: null } },
        select: { createdAt: true, assignedAt: true },
        take: 500,
        orderBy: { assignedAt: "desc" },
      }),
    ]);

  let avgAssignmentMs: number | null = null;
  if (avgAssignMsRows.length > 0) {
    const sum = avgAssignMsRows.reduce((acc, row) => {
      if (!row.assignedAt) return acc;
      return acc + (row.assignedAt.getTime() - row.createdAt.getTime());
    }, 0);
    avgAssignmentMs = sum / avgAssignMsRows.length;
  }

  const completedLifecycle = allCompleted.filter((r) => r.completedAt);
  const avgLifecycleMs =
    completedLifecycle.length > 0
      ? completedLifecycle.reduce(
          (acc, r) => acc + ((r.completedAt as Date).getTime() - r.createdAt.getTime()),
          0,
        ) / completedLifecycle.length
      : null;

  return {
    totalRequests: total,
    completionRate: total > 0 ? completed / total : 0,
    pendingAssignment: countOf(RequestStatus.Approved_Pending_Assignment),
    inProgress: countOf(RequestStatus.In_Progress),
    completed,
    completedThisWeek,
    overdueOpen,
    upcomingBookings,
    visitsToday,
    avgLifecycleMs,
    avgAssignmentMs,
    statusCounts: statusCounts.map((s: KpiStatusCountGroupRow) => ({
      status: s.status,
      count: s._count._all,
    })),
    byDepartment: byDepartment.map((d: KpiDepartmentCountGroupRow) => ({
      departmentId: d.departmentId,
      departmentName: deptMap[d.departmentId] ?? d.departmentId,
      count: d._count._all,
    })),
    byRequestType: byRequestType.map((r: KpiRequestTypeCountGroupRow) => ({
      requestTypeId: r.requestTypeId,
      requestTypeName: typeMap[r.requestTypeId] ?? r.requestTypeId,
      count: r._count._all,
      avgLifecycleMs: slaByType[r.requestTypeId]?.avgMs ?? null,
    })),
  };
}

export async function listReceptionVisits(token: string) {
  const department = await prisma.department.findFirst({
    where: { receptionToken: token, isActive: true },
  });

  if (!department) {
    throw new Error("NOT_FOUND: رمز الاستقبال غير صالح");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const requests = await prisma.communicationRequest.findMany({
    where: {
      departmentId: department.id,
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
    include: requestInclude,
    orderBy: { visitDate: "asc" },
  });

  return { department, requests: requests.map(withSla) };
}

export type ReceptionVisitRequest = Awaited<
  ReturnType<typeof listReceptionVisits>
>["requests"][number];

export async function markVisitAttendance(params: {
  token: string;
  requestId: string;
  attended: boolean;
}) {
  const { department, requests } = await listReceptionVisits(params.token);
  const target = requests.find(
    (r: ReceptionVisitRequest) => r.id === params.requestId,
  );

  if (!target) {
    throw new Error("NOT_FOUND: الطلب غير موجود في قائمة الاستقبال");
  }

  const updated = await prisma.communicationRequest.update({
    where: { id: params.requestId },
    data: {
      visitAttended: params.attended,
      visitMarkedAt: new Date(),
    },
    include: requestInclude,
  });

  return { department, request: withSla(updated) };
}

/** Central desk: all departments' visit requests from today onward. Time O(n), Space O(n). */
export async function listCentralReceptionVisits() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const requests = await prisma.communicationRequest.findMany({
    where: {
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
    include: requestInclude,
    orderBy: [{ visitDate: "asc" }, { title: "asc" }],
  });

  return { requests: requests.map(withSla) };
}

/** Mark attendance by request id (central desk). Time O(1), Space O(1). */
export async function markCentralVisitAttendance(params: {
  requestId: string;
  attended: boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.communicationRequest.findFirst({
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
    select: { id: true },
  });

  if (!existing) {
    throw new Error("NOT_FOUND: الطلب غير موجود في قائمة الاستقبال المركزي");
  }

  const updated = await prisma.communicationRequest.update({
    where: { id: params.requestId },
    data: {
      visitAttended: params.attended,
      visitMarkedAt: new Date(),
    },
    include: requestInclude,
  });

  return { request: withSla(updated) };
}
