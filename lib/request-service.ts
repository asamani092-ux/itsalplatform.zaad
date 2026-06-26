import { prisma } from "./prisma";
import { calculateSlaMetrics } from "./sla";
import { ARCHIVE_STATUSES, ACTIVE_STATUSES } from "./workflow";
import { RequestStatus } from "../generated/prisma/client";

type DashboardView = "active" | "archive" | "all";

export async function listRequests(options: {
  view?: DashboardView;
  status?: RequestStatus;
}) {
  const { view = "all", status } = options;

  let statusFilter: RequestStatus[] | undefined;
  if (status) {
    statusFilter = [status];
  } else if (view === "active") {
    statusFilter = ACTIVE_STATUSES;
  } else if (view === "archive") {
    statusFilter = ARCHIVE_STATUSES;
  }

  const requests = await prisma.communicationRequest.findMany({
    where: statusFilter ? { status: { in: statusFilter } } : undefined,
    include: {
      assignedEmployee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((request) => ({
    ...request,
    sla: calculateSlaMetrics({
      createdAt: request.createdAt,
      managerApprovedAt: request.managerApprovedAt,
      assignedAt: request.assignedAt,
      completedAt: request.completedAt,
    }),
  }));
}

export async function getRequestById(id: string) {
  const request = await prisma.communicationRequest.findUnique({
    where: { id },
    include: {
      assignedEmployee: { select: { id: true, name: true, email: true } },
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

  return {
    ...request,
    sla: calculateSlaMetrics({
      createdAt: request.createdAt,
      managerApprovedAt: request.managerApprovedAt,
      assignedAt: request.assignedAt,
      completedAt: request.completedAt,
    }),
  };
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
