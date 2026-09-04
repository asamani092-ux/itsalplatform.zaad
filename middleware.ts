import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  SESSION_COOKIE,
  assertSessionSecret,
  getSessionSecretKey,
} from "@/lib/auth/session-secret";

assertSessionSecret();

async function verifySessionFromRequest(
  request: NextRequest,
): Promise<{ sub: string; role: string; deskAccess: boolean } | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionSecretKey());
    if (!payload.sub || typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      role: String(payload.role ?? "EMPLOYEE"),
      deskAccess: payload.deskAccess === true,
    };
  } catch {
    return null;
  }
}

const MANAGEMENT_ROLES = new Set(["DIRECTOR", "SECTION_MANAGER"]);

function managerToDashboard(pathname: string): string {
  if (pathname === "/manager") return "/dashboard";
  return pathname.replace(/^\/manager/, "/dashboard");
}

function isReceptionDeskPath(pathname: string): boolean {
  return pathname === "/dashboard/reception" || pathname.startsWith("/dashboard/reception/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/manager")) {
    const dest = managerToDashboard(pathname);
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (pathname.startsWith("/employee") || pathname.startsWith("/dashboard")) {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }

    const isManagement = MANAGEMENT_ROLES.has(session.role);

    if (isManagement) {
      // Management belongs on /dashboard; keep them out of the employee space.
      if (pathname.startsWith("/employee")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return NextResponse.next();
    }

    // Employees: only the reception desk is reachable under /dashboard, and only
    // when their section grants desk access.
    if (pathname.startsWith("/dashboard")) {
      if (session.deskAccess && isReceptionDeskPath(pathname)) {
        return NextResponse.next();
      }
      const dest = session.deskAccess ? "/dashboard/reception" : "/employee";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/employee/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/manager",
    "/manager/:path*",
  ],
};
