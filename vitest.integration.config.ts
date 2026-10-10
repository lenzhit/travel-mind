import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globalSetup: ["./tests/integration/global-setup.ts"],
    environment: "node",
    include: ["tests/integration/**/*.integration.ts"],
    env: { DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/travelmind_admin_test", APP_MODE: "demo" },
    testTimeout: 15000,
    hookTimeout: 30000,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
