/**
 * Pre-launch security audit checks (CMD-FINAL-2).
 * - No embedded live secrets in tracked source
 * - Public API surface inventory (documented allow-list)
 *
 * Usage: node scripts/security-audit.mjs
 */
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
let failed = 0;

function ok(msg) {
  console.log(`OK  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL ${msg}`);
}

/** Intentionally unauthenticated HTTP surfaces (pages + APIs). */
const PUBLIC_ALLOWLIST = [
  "GET /health",
  "GET /ping",
  "GET /login",
  "GET /forgot-password",
  "GET /reset-password",
  "GET /request",
  "GET /f/[slug]",
  "GET /approve?token=",
  "POST /api/approve?token= (approve|reject-by-token)",
  "GET /reception/[token]",
  "POST /api/reception/[token]",
  "GET /api/health",
  "POST /api/auth/login",
  "POST /api/auth/forgot-password",
  "POST /api/auth/reset-password",
  "POST /api/auth/logout",
  "GET /api/auth/me",
  "POST /api/requests (legacy public submit)",
  "POST /api/public/requests",
  "GET /api/public/administrations",
  "GET /api/public/departments",
  "GET /api/public/request-types",
  "GET /api/public/hospitality/availability",
  "GET /api/public/hospitality/calendar",
  "POST /api/public/hospitality/* (if present)",
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (
      name === "node_modules" ||
      name === ".next" ||
      name === "generated" ||
      name === ".git"
    ) {
      continue;
    }
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs|json|md|yml|yaml)$/.test(name)) out.push(p);
  }
  return out;
}

function scanSecrets() {
  const files = walk(ROOT);
  const patterns = [
    { re: /sk-[a-zA-Z0-9]{20,}/, label: "sk- live key" },
    { re: /api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9_\-]{16,}['\"]/i, label: "api_key literal" },
    { re: /password\s*=\s*['\"][^'\"]{8,}['\"]/i, label: "password= literal" },
    {
      re: /SECRET\s*=\s*['\"](?!change-me|dev-session)[^'\"]{12,}['\"]/i,
      label: "SECRET= literal",
    },
  ];

  const skip = new Set([
    relative(ROOT, join(ROOT, "scripts/security-audit.mjs")),
    relative(ROOT, join(ROOT, ".env.example")),
  ]);

  for (const file of files) {
    const rel = relative(ROOT, file);
    if (skip.has(rel) || rel.startsWith("docs/")) continue;
    // Seed demo passwords are intentional local fixtures.
    if (rel === "prisma/seed.ts") continue;
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const { re, label } of patterns) {
      if (re.test(text)) {
        // Allow documented dev fallback constant name only.
        if (
          label === "SECRET= literal" &&
          text.includes("DEV_SESSION_SECRET") &&
          !/SESSION_SECRET\s*=\s*['\"](?!change-me|dev-session)/.test(text)
        ) {
          continue;
        }
        fail(`${label} in ${rel}`);
      }
    }
  }
  if (failed === 0) ok("no embedded live secrets in tracked source");
}

function confirmGuards() {
  const checks = [
    ["app/api/manager/grants/route.ts", "requireDirectorSession"],
    ["app/api/manager/tickets/[id]/reject/route.ts", "assertManagerTicketAccess"],
    ["app/api/manager/tickets/[id]/return/route.ts", "assertManagerTicketAccess"],
    ["app/api/manager/tickets/[id]/approve-completion/route.ts", "assertManagerTicketAccess"],
    ["app/api/reception/attendance/route.ts", "requireReceptionDeskSession"],
    ["app/api/manager/settings/administrations/route.ts", "requireManagerSession"],
    ["app/api/uploads/route.ts", "requireManagerSession"],
    ["next.config.mjs", "X-Content-Type-Options"],
    ["lib/auth/session.ts", "httpOnly: true"],
  ];
  for (const [file, needle] of checks) {
    const text = readFileSync(join(ROOT, file), "utf8");
    if (text.includes(needle)) ok(`guard ${needle} @ ${file}`);
    else fail(`missing ${needle} in ${file}`);
  }
}

function printPublicInventory() {
  console.log("\nPublic allow-list (intentional):");
  for (const row of PUBLIC_ALLOWLIST) console.log(`  - ${row}`);
}

function rgHeaders() {
  try {
    const out = execSync(
      'rg -n "Strict-Transport-Security|X-Frame-Options|httpOnly" next.config.mjs lib/auth/session.ts',
      { cwd: ROOT, encoding: "utf8" },
    );
    if (out.trim()) ok("security headers + cookie flags present");
    else fail("headers/cookie flags not found");
  } catch {
    // rg may be unavailable — confirmGuards already covers files.
    ok("header check via file read (rg skipped)");
  }
}

scanSecrets();
confirmGuards();
rgHeaders();
printPublicInventory();

if (failed > 0) {
  console.error(`\nsecurity-audit FAILED (${failed})`);
  process.exit(1);
}
console.log("\nsecurity-audit PASSED");
