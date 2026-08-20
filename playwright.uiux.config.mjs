import { defineConfig } from "@playwright/test";

const baseURL = process.env.UIUX_BASE_URL || "http://127.0.0.1:3000";
const token = process.env.UIUX_VISUAL_TOKEN || "uiux-local-ci";

export default defineConfig({
  testDir: "./tests/e2e/uiux",
  testMatch: /visual-validation\.pw\.mjs/,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["line"]],
  outputDir: process.env.UIUX_PW_OUTPUT_DIR || "test-results/uiux-visual",
  use: {
    baseURL,
    extraHTTPHeaders: { "x-uiux-visual-token": token },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    colorScheme: "light",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    navigationTimeout: 5_000,
    actionTimeout: 10_000,
    trace: "retain-on-failure",
    video: "off",
    screenshot: "off",
  },
});
