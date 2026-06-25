import { randomBytes } from "crypto";

const TOKEN_BYTES = 32;

export function generateApprovalToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function isValidTokenFormat(token: string): boolean {
  return typeof token === "string" && token.length >= 32;
}
