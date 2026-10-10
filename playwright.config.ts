import { defineConfig } from "@playwright/test";
import { TEST_DATABASE_URL, TEST_ORIGIN } from "./tests/browser/environment";
export default defineConfig({
  testDir: "./tests/browser", testMatch: "**/*.spec.ts", fullyParallel: false, workers: 1, retries: 0,
  timeout: 45000, expect: { timeout: 10000 },
  globalSetup: "./tests/browser/global-setup.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: TEST_ORIGIN, browserName: "chromium", viewport: { width: 1280, height: 900 }, serviceWorkers: "block", screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: { command: "pnpm start --hostname 127.0.0.1 --port 3100", url: "http://127.0.0.1:3100/api/health", reuseExistingServer: false, timeout: 30000,
    env: { DATABASE_URL: TEST_DATABASE_URL, APP_MODE: "demo", AI_PROVIDER: "deterministic", TRAVEL_PROVIDER: "mock", PAYMENT_PROVIDER: "mock", WHATSAPP_PROVIDER: "mock", EMAIL_PROVIDER: "mailpit", WORKFLOW_INTERNAL_TOKEN: "" } },
});
