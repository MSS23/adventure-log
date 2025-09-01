import path from "path";

import { chromium, FullConfig } from "@playwright/test";

/**
 * Global setup for Playwright E2E tests
 * Sets up authentication state and global configurations
 */
async function globalSetup(config: FullConfig) {
  console.log("🚀 Starting global setup for E2E tests...");

  // Ensure auth directory exists
  const authDir = path.join(__dirname, "auth");

  try {
    const { mkdirSync, existsSync } = await import("fs");
    if (!existsSync(authDir)) {
      mkdirSync(authDir, { recursive: true });
    }
  } catch (error) {
    console.warn("Could not create auth directory:", error);
  }

  // Set up authenticated browser context
  const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3000";

  console.log(`📍 Using base URL: ${baseURL}`);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the application
    console.log("🌐 Navigating to application...");
    await page.goto(baseURL);

    // Wait for the application to load
    await page.waitForLoadState("networkidle");

    // Check if we're already logged in or need to sign up/sign in
    const isLoggedIn = await page
      .locator("[data-testid='user-menu']")
      .isVisible()
      .catch(() => false);

    if (!isLoggedIn) {
      console.log("🔐 Setting up test user authentication...");

      // Try to navigate to sign up page
      await page.goto(`${baseURL}/auth/signup`);
      await page.waitForLoadState("networkidle");

      // Check if signup form exists
      const signupForm = page.locator("form").first();
      const isSignupPageLoaded = await signupForm
        .isVisible()
        .catch(() => false);

      if (isSignupPageLoaded) {
        // Fill in test user credentials
        const testEmail = "e2e-test@example.com";
        const testPassword = "E2ETestPassword123!";
        const testName = "E2E Test User";
        const testUsername = "e2etestuser";

        // Fill signup form
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await page.fill('input[name="name"]', testName);
        await page.fill('input[name="username"]', testUsername);

        // Submit form
        await page.click('button[type="submit"]');

        // Wait for redirect or success
        await page.waitForURL("**/dashboard").catch(() => {
          // If signup fails (user exists), try signing in instead
          return page.goto(`${baseURL}/auth/signin`);
        });
      }

      // If we're on sign in page, sign in with test credentials
      if (
        page.url().includes("/auth/signin") ||
        page.url().includes("/auth/login")
      ) {
        console.log("🔑 Signing in with test credentials...");

        const testEmail = "e2e-test@example.com";
        const testPassword = "E2ETestPassword123!";

        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await page.click('button[type="submit"]');

        // Wait for successful login
        await page.waitForURL("**/dashboard").catch(() => {
          console.log("Login may have failed or redirected elsewhere");
        });
      }
    }

    // Verify we're logged in by checking for user-specific elements
    const userMenuVisible = await page
      .locator("[data-testid='user-menu']")
      .isVisible()
      .catch(() => false);
    const dashboardVisible = await page
      .locator("h1")
      .filter({ hasText: /dashboard|welcome|trips|albums/i })
      .isVisible()
      .catch(() => false);

    if (
      userMenuVisible ||
      dashboardVisible ||
      page.url().includes("/dashboard")
    ) {
      console.log("✅ Authentication successful!");

      // Save authentication state
      await context.storageState({ path: path.join(authDir, "user.json") });
      console.log("💾 Authentication state saved");
    } else {
      console.warn(
        "⚠️  Authentication may have failed - proceeding without saved state"
      );
    }
  } catch (error) {
    console.error("❌ Error during global setup:", error);
    console.log("🔄 Continuing without authentication state...");
  } finally {
    await context.close();
    await browser.close();
    console.log("🏁 Global setup complete");
  }
}

export default globalSetup;
