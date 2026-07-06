export const SESSION_COOKIE = "zaad_session";

export const DEV_SESSION_SECRET = "dev-session-secret-change-me";

export function assertSessionSecret(): void {
  if (process.env.NODE_ENV !== "production") return;

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === DEV_SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET must be set to a secure value in production. Generate via: openssl rand -base64 48",
    );
  }
}

export function getSessionSecretKey(): Uint8Array {
  assertSessionSecret();
  const secret = process.env.SESSION_SECRET ?? DEV_SESSION_SECRET;
  return new TextEncoder().encode(secret);
}
