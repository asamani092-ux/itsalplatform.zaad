import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { EmployeeRole } from "../../generated/prisma/client";
import {
  SESSION_COOKIE,
  assertSessionSecret,
  getSessionSecretKey,
} from "./session-secret";

export { SESSION_COOKIE } from "./session-secret";
export { assertSessionSecret } from "./session-secret";

export interface SessionPayload {
  sub: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: EmployeeRole;
  /** Section (قسم) the account belongs to — scopes section managers/employees. */
  departmentId: string | null;
  /** Reception desk capability derived from the account's section at login. */
  deskAccess: boolean;
}

assertSessionSecret();

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    name: payload.name,
    email: payload.email,
    phoneNumber: payload.phoneNumber,
    role: payload.role,
    departmentId: payload.departmentId,
    deskAccess: payload.deskAccess,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecretKey());
    if (!payload.sub || typeof payload.sub !== "string") return null;

    return {
      sub: payload.sub,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      phoneNumber: String(payload.phoneNumber ?? ""),
      role: payload.role as EmployeeRole,
      departmentId:
        typeof payload.departmentId === "string" ? payload.departmentId : null,
      deskAccess: payload.deskAccess === true,
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

const SESSION_MAX_AGE = 60 * 60 * 24;
const REMEMBERED_MAX_AGE = 60 * 60 * 24 * 30;

export async function setSessionCookie(token: string, remember = false) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remember ? REMEMBERED_MAX_AGE : SESSION_MAX_AGE,
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
