import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 1000 },
  },
  timeout: 60_000,
  reporter: "list",
});
