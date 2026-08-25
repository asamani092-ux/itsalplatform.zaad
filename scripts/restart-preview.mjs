#!/usr/bin/env node
/**
 * Kill whatever is on PORT (default 3002) and start the standalone server
 * with freshly prepared static assets — prevents white screens from stale chunks.
 */
import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const port = process.env.PORT || "3002";
const root = process.cwd();
const server = join(root, ".next", "standalone", "server.js");

if (!existsSync(server)) {
  console.error("restart-preview: missing .next/standalone — run npm run build first");
  process.exit(1);
}

try {
  execSync(`node ${join(root, "scripts/prepare-standalone.mjs")}`, {
    stdio: "inherit",
  });
} catch {
  process.exit(1);
}

function killPort(p) {
  const attempts = [
    `lsof -ti tcp:${p} | xargs -r kill -9`,
    `fuser -k ${p}/tcp`,
  ];
  for (const cmd of attempts) {
    try {
      execSync(cmd, { stdio: "ignore" });
    } catch {
      /* try next */
    }
  }
  // Brief wait so the OS releases the socket
  execSync("sleep 0.5");
}

killPort(port);

const child = spawn("node", [server], {
  env: { ...process.env, HOSTNAME: "0.0.0.0", PORT: port },
  stdio: "inherit",
  detached: false,
});

child.on("exit", (code) => process.exit(code ?? 0));
