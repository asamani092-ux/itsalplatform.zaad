import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

function parseSessionCookie(token: string): { sub: string; role: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as { sub?: string; role?: string };
    if (!payload.sub) return null;
    return { sub: String(payload.sub), role: String(payload.role ?? "EMPLOYEE") };
  } catch {
    return null;
  }
}

function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseSessionCookie(token);
}

function managerToDashboard(pathname: string): string {
  if (pathname === "/manager") return "/dashboard";
  return pathname.replace(/^\/manager/, "/dashboard");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/manager")) {
    const dest = managerToDashboard(pathname);
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (pathname.startsWith("/employee") || pathname.startsWith("/dashboard")) {
    const session = getSessionFromRequest(request);
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
