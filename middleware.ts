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
): Promise<{ sub: string; role: string } | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionSecretKey());
    if (!payload.sub || typeof payload.sub !== "string") return null;
    return { sub: payload.sub, role: String(payload.role ?? "EMPLOYEE") };
  } catch {
    return null;
  }
}

function managerToDashboard(pathname: string): string {
  if (pathname === "/manager") return "/dashboard";
  return pathname.replace(/^\/manager/, "/dashboard");
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

    if (pathname.startsWith("/dashboard") && session.role !== "MANAGER") {
      return NextResponse.redirect(new URL("/employee", request.url));
    }

    if (pathname.startsWith("/employee") && session.role === "MANAGER") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
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
