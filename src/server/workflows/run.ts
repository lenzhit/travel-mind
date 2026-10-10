import { conn } from "@/server/db";
import { runMaintenance } from "./maintenance";
runMaintenance().then(result => console.log(JSON.stringify({ event: "workflow_processed", mode: "demo", ...result }))).catch(() => { console.error("El procesamiento local requiere revisión. Los eventos siguen en la cola."); process.exitCode = 1; }).finally(() => conn.end());
