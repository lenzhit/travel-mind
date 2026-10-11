import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readFileSync } from "node:fs";
const admin = postgres("postgresql://postgres:postgres@localhost:5432/postgres", { max: 1, onnotice: () => {} });
let created = false;
async function check() {
  try {
    if ((await admin`SELECT 1 FROM pg_database WHERE datname = 'travelmind_cases_rollback_check'`).length) throw new Error("La base exclusiva ya existe; no se modificará.");
    await admin`CREATE DATABASE travelmind_cases_rollback_check`; created = true;
    const conn = postgres("postgresql://postgres:postgres@localhost:5432/travelmind_cases_rollback_check", { max: 1, onnotice: () => {} });
    try {
      await conn`CREATE EXTENSION IF NOT EXISTS vector`;
      await migrate(drizzle(conn), { migrationsFolder: "./src/server/db/migrations" });
      if (!(await conn`SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'case_updated_at'`).length) throw new Error("No se aplicó el esquema de casos.");
      await conn.begin(async tx => { await tx.unsafe(readFileSync("docs/rollbacks/0005-case-actions.sql", "utf8")); });
      if ((await conn`SELECT 1 FROM information_schema.tables WHERE table_name = 'case_actions'`).length) throw new Error("Rollback incompleto.");
      if ((await conn`SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name IN ('case_updated_at', 'case_assignee_id')`).length) throw new Error("Quedan columnas de casos.");
      console.log("Migraciones y rollback conjunto de casos verificados en base exclusiva desechable.");
    } finally { await conn.end(); }
  } finally {
    if (created) await admin`DROP DATABASE travelmind_cases_rollback_check`;
    await admin.end();
  }
}
check().catch(() => { console.error("No se completó la verificación aislada de rollback."); process.exitCode = 1; });
