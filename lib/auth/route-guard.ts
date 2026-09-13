import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EmployeeRole } from "../../generated/prisma/client";
import {
  SESSION_COOKIE,
  verifySessionToken,
  type SessionPayload,
} from "./session";
import { getRequestById } from "@/lib/request-service";

export async function getRouteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

const UNAUTHORIZED = NextResponse.json(
  { success: false, error: { message: "يجب تسجيل الدخول", code: "UNAUTHORIZED" } },
  { status: 401 },
);

function forbidden(message: string) {
  return NextResponse.json(
    { success: false, error: { message, code: "FORBIDDEN" } },
    { status: 403 },
  );
}

const MANAGEMENT_ROLES: EmployeeRole[] = [
  EmployeeRole.DIRECTOR,
  EmployeeRole.SECTION_MANAGER,
];

/** Any management account (مدير الإدارة أو مدير القسم) — the /dashboard surface. */
export async function requireManagerSession() {
  const session = await getRouteSession();
  if (!session) return { error: UNAUTHORIZED };
  if (!MANAGEMENT_ROLES.includes(session.role)) {
    return { error: forbidden("صلاحيات الإدارة مطلوبة") };
  }
  return { session };
}

/** Department director only (مدير الإدارة) — indicators, tasks, grants. */
export async function requireDirectorSession() {
  const session = await getRouteSession();
  if (!session) return { error: UNAUTHORIZED };
  if (session.role !== EmployeeRole.DIRECTOR) {
    return { error: forbidden("صلاحيات مدير الإدارة مطلوبة") };
  }
  return { session };
}

export async function requireEmployeeSession() {
  const session = await getRouteSession();
  if (!session) return { error: UNAUTHORIZED };
  return { session };
}

/**
 * Central reception desk — live ownership check (not JWT alone).
 * DIRECTOR, owning/unowned SECTION_MANAGER, or isReceptionDesk employee.
 */
export async function requireReceptionDeskSession() {
  const session = await getRouteSession();
  if (!session) return { error: UNAUTHORIZED };

  const { prisma } = await import("@/lib/prisma");
  const { canAccessReception, canManageReception } = await import(
    "@/lib/modules/server"
  );

  const employee = await prisma.commEmployee.findUnique({
    where: { id: session.sub },
    select: {
      role: true,
      departmentId: true,
      isReceptionDesk: true,
      isActive: true,
    },
  });
  if (!employee || !employee.isActive) {
    return { error: UNAUTHORIZED };
  }

  const viewer = {
    role: employee.role,
    departmentId: employee.departmentId,
    isReceptionDesk: employee.isReceptionDesk,
    deskAccess: employee.isReceptionDesk,
  };

  if (!(await canAccessReception(viewer))) {
    return { error: forbidden("صلاحيات الاستقبال مطلوبة") };
  }

  const deskManage = await canManageReception(viewer);
  return {
    session: {
      ...session,
      role: employee.role,
      departmentId: employee.departmentId,
      deskAccess: true,
      deskManage,
      isReceptionDesk: employee.isReceptionDesk,
    },
  };
}

/** Reception management: indicators, reports, create attendance lists. */
export async function requireReceptionManageSession() {
  const auth = await requireReceptionDeskSession();
  if (auth.error) return auth;
  if (!auth.session.deskManage) {
    return { error: forbidden("صلاحيات إدارة الاستقبال مطلوبة") };
  }
  return auth;
}

/**
 * SECTION_MANAGER may only act on tickets in their section.
 * DIRECTOR is unrestricted. Throws FORBIDDEN when out of scope.
 */
export async function assertManagerTicketAccess(
  session: SessionPayload,
  requestId: string,
) {
  const ticket = await getRequestById(requestId);
  if (
    session.role === EmployeeRole.SECTION_MANAGER &&
    session.departmentId &&
    ticket.departmentId !== session.departmentId
  ) {
    throw new Error("FORBIDDEN: هذا الطلب خارج نطاق قسمك");
  }
  return ticket;
}
