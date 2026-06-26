import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth/session";

function getSecret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? "dev-session-secret-change-me",
  );
}

async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub: String(payload.sub),
      role: String(payload.role),
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/employee") || pathname.startsWith("/manager")) {
    const session = await getSessionFromRequest(request);
    if (!session) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }

    if (pathname.startsWith("/manager") && session.role !== "MANAGER") {
      return NextResponse.redirect(new URL("/employee", request.url));
    }

    if (pathname.startsWith("/employee") && session.role === "MANAGER") {
      return NextResponse.redirect(new URL("/manager", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/employee/:path*", "/manager/:path*"],
};
