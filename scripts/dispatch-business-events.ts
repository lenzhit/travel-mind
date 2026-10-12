async function main() {
  process.loadEnvFile(".env.local");
  const { dispatchBusinessEvents } = await import("@/server/workflows/business-events");
  const { conn } = await import("@/server/db");
  try {
    const result = await dispatchBusinessEvents(20);
    console.log(JSON.stringify({ event: "business_events_dispatched", mode: "demo", ...result }));
  } finally { await conn.end(); }
}
main().catch(() => { console.error("La entrega local falló; los eventos siguen persistidos."); process.exitCode = 1; });
