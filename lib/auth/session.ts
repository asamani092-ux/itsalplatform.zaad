import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { EmployeeRole } from "../../generated/prisma/client";

export const SESSION_COOKIE = "zaad_session";

export interface SessionPayload {
  sub: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: EmployeeRole;
}

function getSecret() {
  const secret = process.env.SESSION_SECRET ?? "dev-session-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    name: payload.name,
    email: payload.email,
    phoneNumber: payload.phoneNumber,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.sub !== "string") return null;

    return {
      sub: payload.sub,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      phoneNumber: String(payload.phoneNumber ?? ""),
      role: payload.role as EmployeeRole,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function requireRole(
  session: SessionPayload | null,
  role: EmployeeRole,
): asserts session is SessionPayload {
  if (!session) {
    throw new Error("UNAUTHORIZED: يجب تسجيل الدخول");
  }
  if (session.role !== role) {
    throw new Error("FORBIDDEN: ليس لديك صلاحية لهذا الإجراء");
  }
}
