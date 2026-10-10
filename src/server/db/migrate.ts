import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, conn } from "./index";

/**
 * Script de migración reproducible para PostgreSQL local
 */
export async function runMigrations() {
  console.log("Iniciando verificación de extensiones y migraciones...");

  // Asegurar extensión pgvector
  await conn`CREATE EXTENSION IF NOT EXISTS vector;`;
  console.log("Extensión 'vector' verificada.");

  // Ejecutar migraciones Drizzle
  await migrate(db, { migrationsFolder: "./src/server/db/migrations" });
  console.log("Migraciones aplicadas con éxito.");
}

// Si se ejecuta directamente desde CLI
if (require.main === module || process.argv[1]?.endsWith("migrate.ts")) {
  runMigrations()
    .then(async () => {
      await conn.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Error al ejecutar migraciones:", err);
      await conn.end();
      process.exit(1);
    });
}
