import path from "path";

/**
 * Proof files are served through an API route, not Next static hosting.
 * In standalone builds the runtime cwd differs from the copied `public`
 * directory, so files written under `public/uploads` were never served (404).
 * Resolving both the write and read paths through this single helper keeps
 * them consistent regardless of build mode.
 */
export function getProofStorageDir(): string {
  const configured = process.env.PROOF_STORAGE_DIR?.trim();
  if (configured) return configured;
  return path.join(process.cwd(), "storage", "proofs");
}

const PROOF_API_PREFIX = "/api/uploads/proofs/";

export function buildProofPublicUrl(filename: string): string {
  return `${PROOF_API_PREFIX}${filename}`;
}

/**
 * Accepts either a stored API url (`/api/uploads/proofs/<name>`) or a legacy
 * static url (`/uploads/proofs/<name>`) and returns the bare filename, or null
 * when the value does not reference a proof file.
 */
export function extractProofFilename(value: string): string | null {
  const trimmed = value.trim();
  const marker = "/uploads/proofs/";
  const idx = trimmed.indexOf(marker);
  if (idx === -1) return null;
  const filename = trimmed.slice(idx + marker.length);
  // Guard against path traversal — only a single path segment is valid.
  if (!filename || filename.includes("/") || filename.includes("..")) return null;
  return filename;
}
