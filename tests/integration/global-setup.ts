import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
export default async function setup() {
  // Fixed disposable database, before any worker imports the application DB client.
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/travelmind_admin_test";
  process.env.APP_MODE = "demo";
  const { db, conn } = await import("@/server/db");
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
    await migrate(db, { migrationsFolder: "./src/server/db/migrations" });
    const { runSeed } = await import("@/server/db/seed");
    await runSeed();
  } finally { await conn.end(); }
}
