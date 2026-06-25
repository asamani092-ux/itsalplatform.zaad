import { RequestStatus } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { calculateSlaMetrics } from "./sla";

export type RequestListFilter = "active" | "archive" | "all";

// Time: O(n) with DB indexes on status — n = result set size
// Space: O(n) — mapped response array
export async function listRequests(params: {
  view?: RequestListFilter;
  status?: RequestStatus;
}) {
  const { view = "active", status } = params;

  const where: {
    status?: RequestStatus | { in: RequestStatus[] };
  } = {};

  if (status) {
    where.status = status;
  } else if (view === "active") {
    where.status = {
      in: [
        RequestStatus.Approved_Pending_Assignment,
        RequestStatus.In_Progress,
      ],
    };
  } else if (view === "archive") {
    where.status = {
      in: [RequestStatus.Completed, RequestStatus.Archived],
    };
  }

  const requests = await prisma.communicationRequest.findMany({
    where,
    include: {
      assignedEmployee: {
        select: { id: true, name: true, email: true },
      },
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
      assignedEmployee: {
        select: { id: true, name: true, email: true },
      },
      assignmentHistory: {
        include: {
          employee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { assignedAt: "asc" },
      },
      statusHistory: {
        orderBy: { changedAt: "asc" },
      },
    },
  });

  if (!request) return null;

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

// Time: O(k) where k = assignment history entries for request
// Space: O(k) — history included in response
export async function getAssignmentHistory(requestId: string) {
  return prisma.assignmentHistory.findMany({
    where: { requestId },
    include: {
      employee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { assignedAt: "asc" },
  });
}
