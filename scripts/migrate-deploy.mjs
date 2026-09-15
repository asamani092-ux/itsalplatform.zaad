#!/usr/bin/env node
/**
 * Apply pending Prisma SQL migrations with `pg` only (no Prisma CLI/engines).
 *
 * Coolify Execute Command:
 *   node scripts/migrate-deploy.mjs
 */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  try {
    const raw = readFileSync("/proc/1/environ", "utf8");
    const match = raw
      .split("\0")
      .find((line) => line.startsWith("DATABASE_URL="));
    if (match) return match.slice("DATABASE_URL=".length);
  } catch {
    // not in a container / no permission
  }
  return "";
}

function migrationsDir() {
  const candidates = [
    join(process.cwd(), "prisma", "migrations"),
    "/app/prisma/migrations",
  ];
  return candidates.find((dir) => existsSync(dir)) ?? null;
}

function listMigrationFolders(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => /^\d{14}_/.test(name) || /^\d+_/.test(name))
    .sort();
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id                  VARCHAR(36) PRIMARY KEY NOT NULL,
      checksum            VARCHAR(64) NOT NULL,
      finished_at         TIMESTAMPTZ,
      migration_name      VARCHAR(255) NOT NULL,
      logs                TEXT,
      rolled_back_at      TIMESTAMPTZ,
      started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      applied_steps_count INTEGER NOT NULL DEFAULT 0
    )
  `);
}

async function appliedNames(client) {
  const result = await client.query(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
  );
  return new Set(result.rows.map((row) => row.migration_name));
}

async function applyMigration(client, name, sql, checksum) {
  const id = randomUUID();
  await client.query("BEGIN");
  try {
    await client.query(
      `INSERT INTO "_prisma_migrations"
        (id, checksum, migration_name, started_at, applied_steps_count)
       VALUES ($1, $2, $3, NOW(), 0)`,
      [id, checksum, name],
    );
    await client.query(sql);
    await client.query(
      `UPDATE "_prisma_migrations"
       SET finished_at = NOW(), applied_steps_count = 1
       WHERE id = $1`,
      [id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const databaseUrl = loadDatabaseUrl();
  if (!databaseUrl) {
    console.error(
      "DATABASE_URL missing. Export it, or redeploy so the app env is present.",
    );
    process.exit(1);
  }

  const dir = migrationsDir();
  if (!dir) {
    console.error("prisma/migrations folder not found");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const done = await appliedNames(client);
    const folders = listMigrationFolders(dir);
    let applied = 0;

    for (const name of folders) {
      if (done.has(name)) continue;
      const file = join(dir, name, "migration.sql");
      if (!existsSync(file)) {
        console.warn(`[migrate] skip ${name}: no migration.sql`);
        continue;
      }
      const sql = readFileSync(file, "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      console.log(`[migrate] applying ${name}...`);
      await applyMigration(client, name, sql, checksum);
      applied += 1;
    }

    console.log(
      applied === 0
        ? `[migrate] up to date (${folders.length} migrations)`
        : `[migrate] applied ${applied} migration(s)`,
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[migrate] failed:", error.message || error);
  process.exit(1);
});
