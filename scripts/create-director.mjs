#!/usr/bin/env node
/**
 * Creates/updates the single highest-privilege account (DIRECTOR).
 *
 * Coolify → Application → Execute Command:
 *   ADMIN_PASSWORD='YourStrongPass' node scripts/create-director.mjs
 *
 * Optional:
 *   ADMIN_EMAIL=td@alzaad.org.sa
 *   ADMIN_NAME='مدير الإدارة'
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const email = (process.env.ADMIN_EMAIL || "td@alzaad.org.sa").trim().toLowerCase();
const name = (process.env.ADMIN_NAME || "مدير الإدارة").trim();
const password = process.env.ADMIN_PASSWORD || "";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Set ADMIN_PASSWORD to at least 8 characters");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

function newId() {
  return `c${Date.now().toString(36)}${randomBytes(8).toString("hex")}`;
}

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO "CommEmployee"
       (id, name, email, "passwordHash", role, "isActive", "isReceptionDesk", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'DIRECTOR', true, false, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       "passwordHash" = EXCLUDED."passwordHash",
       role = 'DIRECTOR',
       "isActive" = true,
       "updatedAt" = NOW()
     RETURNING id, email, role`,
    [newId(), name, email, passwordHash],
  );
  const row = result.rows[0];
  console.log(`OK director: ${row.email} (${row.role}) id=${row.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
