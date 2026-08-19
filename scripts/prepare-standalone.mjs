#!/usr/bin/env node
/**
 * Next standalone does not include .next/static or public by default.
 * Docker copies them in the Dockerfile; this mirrors that for local `start`.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");
const staticSrc = join(root, ".next", "static");
const staticDest = join(standalone, ".next", "static");
const publicSrc = join(root, "public");
const publicDest = join(standalone, "public");

if (!existsSync(standalone)) {
  console.error("prepare-standalone: .next/standalone missing — run next build first");
  process.exit(1);
}

mkdirSync(join(standalone, ".next"), { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
}
console.log("prepare-standalone: static + public copied into .next/standalone");
