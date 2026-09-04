#!/usr/bin/env node
/**
 * Kill whatever is on PORT (default 3002) and start the standalone server
 * with freshly prepared static assets — prevents white screens from stale chunks.
 */
import { spawn, execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, readlinkSync } from "node:fs";
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

function listeningInodes(portNum) {
  const hex = Number(portNum).toString(16).toUpperCase().padStart(4, "0");
  const inodes = new Set();
  for (const table of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    if (!existsSync(table)) continue;
    for (const line of readFileSync(table, "utf8").split("\n").slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 10) continue;
      const local = parts[1] ?? "";
      const state = parts[3];
      // 0A = LISTEN
      if (state === "0A" && local.toUpperCase().endsWith(`:${hex}`)) {
        inodes.add(parts[9]);
      }
    }
  }
  return inodes;
}

function pidsHoldingInodes(inodes) {
  if (inodes.size === 0) return [];
  const pids = new Set();
  for (const dir of readdirSync("/proc")) {
    if (!/^\d+$/.test(dir)) continue;
    const fdDir = `/proc/${dir}/fd`;
    try {
      for (const fd of readdirSync(fdDir)) {
        let target = "";
        try {
          target = readlinkSync(`${fdDir}/${fd}`);
        } catch {
          continue;
        }
        const m = target.match(/^socket:\[(\d+)\]$/);
        if (m && inodes.has(m[1])) pids.add(Number(dir));
      }
    } catch {
      /* no access */
    }
  }
  return [...pids];
}

function killPort(p) {
  const self = process.pid;
  const inodes = listeningInodes(p);
  let pids = pidsHoldingInodes(inodes).filter((pid) => pid !== self);

  // Fallbacks for environments where /proc fd scan is restricted
  if (pids.length === 0) {
    for (const cmd of [
      `lsof -tiTCP:${p} -sTCP:LISTEN`,
      `lsof -ti :${p}`,
      `fuser ${p}/tcp`,
    ]) {
      try {
        const out = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
        for (const token of out.split(/[\s,]+/)) {
          const n = Number(token);
          if (Number.isFinite(n) && n > 0 && n !== self) pids.push(n);
        }
      } catch {
        /* try next */
      }
    }
  }

  pids = [...new Set(pids)];
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGKILL");
      console.log(`restart-preview: killed pid ${pid} on :${p}`);
    } catch {
      /* already gone */
    }
  }

  // Wait until the port is free (up to ~3s)
  for (let i = 0; i < 15; i++) {
    if (listeningInodes(p).size === 0) return;
    execSync("sleep 0.2");
  }
  if (listeningInodes(p).size > 0) {
    console.error(`restart-preview: port ${p} still busy after kill attempts`);
    process.exit(1);
  }
}

killPort(port);

const child = spawn("node", [server], {
  env: { ...process.env, HOSTNAME: "0.0.0.0", PORT: port },
  stdio: "inherit",
  detached: false,
});

child.on("exit", (code) => process.exit(code ?? 0));
