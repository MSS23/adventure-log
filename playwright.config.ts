import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for comprehensive E2E testing
 * Covers critical user journeys across multiple browsers and devices
 */
export default defineConfig({
  // Test directory structure
  testDir: "./e2e",

  // Global test timeout
  timeout: 30 * 1000,

  // Expect timeout for assertions
  expect: {
    timeout: 5 * 1000,
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ["html"],
    ["json", { outputFile: "e2e-results.json" }],
    ["junit", { outputFile: "e2e-results.xml" }],
    ["github"],
    ["line"],
  ],

  // Global test setup
  globalSetup: "./e2e/global-setup.ts",

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Record video on failure
    video: "retain-on-failure",

    // Take screenshot on failure
    screenshot: "only-on-failure",

    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Authentication state directory
    storageState: undefined,
  },

  // Project configurations for different browsers and scenarios
  projects: [
    // Setup project for authentication
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    // Desktop Chrome - Main testing browser
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use authenticated state for logged-in tests
        storageState: "e2e/auth/user.json",
      },
      dependencies: ["setup"],
    },

    // Desktop Firefox
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: "e2e/auth/user.json",
      },
      dependencies: ["setup"],
    },

    // Desktop Safari
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        storageState: "e2e/auth/user.json",
      },
      dependencies: ["setup"],
    },

    // Mobile Chrome
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        storageState: "e2e/auth/user.json",
      },
      dependencies: ["setup"],
    },

    // Mobile Safari
    {
      name: "Mobile Safari",
      use: {
        ...devices["iPhone 12"],
        storageState: "e2e/auth/user.json",
      },
      dependencies: ["setup"],
    },

    // Tablet testing
    {
      name: "Tablet",
      use: {
        ...devices["iPad Pro"],
        storageState: "e2e/auth/user.json",
      },
      dependencies: ["setup"],
    },

    // Anonymous user tests (no authentication)
    {
      name: "anonymous",
      use: {
        ...devices["Desktop Chrome"],
        storageState: undefined,
      },
    },

    // Edge browser testing
    {
      name: "edge",
      use: {
        ...devices["Desktop Edge"],
        channel: "msedge",
        storageState: "e2e/auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  // Web server configuration - automatically start/stop the dev server
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: "test",
    },
  },
});
