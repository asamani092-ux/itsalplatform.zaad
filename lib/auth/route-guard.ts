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

export async function requireManagerSession() {
  const session = await getRouteSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, error: { message: "يجب تسجيل الدخول", code: "UNAUTHORIZED" } },
        { status: 401 },
      ),
    };
  }
  if (session.role !== EmployeeRole.MANAGER) {
    return {
      error: NextResponse.json(
        { success: false, error: { message: "صلاحيات المدير مطلوبة", code: "FORBIDDEN" } },
        { status: 403 },
      ),
    };
  }
  return { session };
}

export async function requireEmployeeSession() {
  const session = await getRouteSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, error: { message: "يجب تسجيل الدخول", code: "UNAUTHORIZED" } },
        { status: 401 },
      ),
    };
  }
  return { session };
}
