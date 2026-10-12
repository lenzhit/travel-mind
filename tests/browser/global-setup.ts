import { TEST_DATABASE_URL } from "./environment";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { execFileSync } from "node:child_process";
export default async function setup() {
  const admin = postgres("postgresql://postgres:postgres@localhost:5432/postgres", { max: 1, onnotice: () => {} });
  try {
    const exists = await admin`SELECT 1 FROM pg_database WHERE datname = 'travelmind_e2e_test'`;
    if (!exists.length) await admin`CREATE DATABASE travelmind_e2e_test`;
  } finally { await admin.end(); }
  const conn = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  const db = drizzle(conn);
  if (process.env.DATABASE_URL !== TEST_DATABASE_URL) throw new Error("Se exige la base exclusiva de E2E.");
  try {
    await conn`CREATE EXTENSION IF NOT EXISTS vector`;
    await migrate(db, { migrationsFolder: "./src/server/db/migrations" });
    // Solo la base exclusiva de E2E: no se reutiliza la base del usuario.
    await conn`TRUNCATE TABLE destinations, customers, visitor_sessions, business_events CASCADE`;
    execFileSync(process.execPath, ["--import", "tsx", "src/server/db/seed.ts"], { stdio: "inherit", env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, APP_MODE: "demo" } });
  } finally { await conn.end(); }
  return async () => {
    const cleanup = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
    try { await cleanup`TRUNCATE TABLE customers, visitor_sessions, business_events CASCADE`; }
    finally { await cleanup.end(); }
  };
}


