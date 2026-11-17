import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:8082",
    headless: true,
  },
  webServer: {
    command: "CI=1 npx expo start --web --port 8082",
    url: "http://127.0.0.1:8082",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      EXPO_PUBLIC_API_URL: "http://127.0.0.1:4000",
      EXPO_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "playwright-test-anon-key",
    },
  },
});
