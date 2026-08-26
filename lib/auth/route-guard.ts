import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EmployeeRole } from "../../generated/prisma/client";
import { SESSION_COOKIE, verifySessionToken } from "./session";

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

/** Central reception desk: management roles or an employee with desk access. */
export async function requireReceptionDeskSession() {
  const session = await getRouteSession();
  if (!session) return { error: UNAUTHORIZED };
  if (!MANAGEMENT_ROLES.includes(session.role) && !session.deskAccess) {
    return { error: forbidden("صلاحيات الاستقبال مطلوبة") };
  }
  return { session };
}
