/**
 * Configuración de entorno de TravelMind con valores por defecto para modo demo y presupuesto cero.
 */

export const env = {
  APP_MODE: process.env.APP_MODE || "demo",
  AI_PROVIDER: process.env.AI_PROVIDER || "ollama",
  TRAVEL_PROVIDER: process.env.TRAVEL_PROVIDER || "mock",
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || "mock",
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || "mailpit",
  WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER || "mock",
  WORKFLOW_PROVIDER: process.env.WORKFLOW_PROVIDER || "n8n-local",
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/travelmind",
} as const;
