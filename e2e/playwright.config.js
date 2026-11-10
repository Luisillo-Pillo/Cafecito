import { createRequire } from "node:module";
import { defineConfig, devices } from "@playwright/test";
import { API_PORT, WEB_PORT, API_URL, WEB_URL, DB_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_TOKEN } from "./env.js";

const require = createRequire(import.meta.url);
const { hashPassword } = require("../backend/src/services/auth.service.js");

// La API de las pruebas usa su propia base desechable (DB_CONNECTION_STRING tiene prioridad sobre
// el MONGODB_URI de backend/.env), así que nunca toca Atlas
const apiEnv = {
  PORT: String(API_PORT),
  NODE_ENV: "test",
  DB_CONNECTION_STRING: DB_URI,
  CORS_ORIGIN: WEB_URL,
  ADMIN_EMAIL,
  ADMIN_PASSWORD_HASH: await hashPassword(ADMIN_PASSWORD),
  AUTH_SECRET: "secreto-e2e",
  ADMIN_TOKEN,
};

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.js",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: process.env.CI ? undefined : "msedge" },
    },
  ],
  webServer: [
    {
      command: "node src/index.js",
      cwd: "../backend",
      url: `${API_URL}/health`,
      env: apiEnv,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      cwd: "../frontend",
      url: WEB_URL,
      env: { VITE_API_URL: API_URL },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
