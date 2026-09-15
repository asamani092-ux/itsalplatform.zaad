#!/usr/bin/env node
/**
 * Apply pending Prisma migrations using DATABASE_URL.
 *
 * Coolify Execute Command (preferred — picks up app env from PID 1):
 *   node scripts/migrate-deploy.mjs
 *
 * Or explicitly:
 *   DATABASE_URL='postgresql://...' node scripts/migrate-deploy.mjs
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  // Coolify/docker interactive shells often lack app env — inherit from PID 1.
  try {
    const raw = readFileSync("/proc/1/environ", "utf8");
    const match = raw
      .split("\0")
      .find((line) => line.startsWith("DATABASE_URL="));
    if (match) return match.slice("DATABASE_URL=".length);
  } catch {
    // not in a container
  }
  return "";
}

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) {
  console.error(
    "DATABASE_URL missing. Export it first, e.g.\n  export DATABASE_URL='postgresql://USER:PASS@HOST:5432/DB?schema=public'",
  );
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;

const require = createRequire(import.meta.url);
let prismaCli;
try {
  prismaCli = require.resolve("prisma/build/index.js");
} catch {
  prismaCli = existsSync("/app/node_modules/prisma/build/index.js")
    ? "/app/node_modules/prisma/build/index.js"
    : "";
}

if (!prismaCli) {
  console.error("prisma CLI not found in node_modules — redeploy with the latest image");
  process.exit(1);
}

console.log("[migrate] prisma migrate deploy...");
const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
  cwd: process.cwd(),
});

process.exit(result.status ?? 1);
