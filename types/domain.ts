import type { EmployeeRole, RequestStatus } from "../generated/prisma/client";
import type { SlaMetrics } from "../lib/sla";

export interface DepartmentSummary {
  id: string;
  name: string;
  slug: string;
  managerEmail: string;
  isActive: boolean;
}

export interface RequestTypeSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  requiresVisitDate: boolean;
  isActive: boolean;
  departmentId: string | null;
}

export interface EmployeeSummary {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: EmployeeRole;
  isActive: boolean;
}

export interface TicketSummary {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  requiredDate: string;
  contactEmail: string;
  contactPhone: string;
  managerEmail: string;
  departmentId: string;
  requestTypeId: string;
  approvedAt: string | null;
  assignedAt: string | null;
  completedAt: string | null;
  proofFileUrl: string | null;
  visitDate: string | null;
  visitAttended: boolean | null;
  assignedEmployee?: { id: string; name: string; email: string } | null;
  department?: { id: string; name: string; slug: string };
  requestType?: { id: string; name: string; slug: string; requiresVisitDate: boolean };
  sla: SlaMetrics;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: EmployeeRole;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: { message: string; code: string };
}
