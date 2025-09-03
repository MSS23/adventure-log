import path from "path";

import { test as setup, expect } from "@playwright/test";

const authFile = path.join(__dirname, "auth", "user.json");

/**
 * Authentication setup for authenticated user tests
 * Creates a persistent login state that can be reused across tests
 */
setup("authenticate", async ({ page }) => {
  console.log("🔐 Setting up authentication for E2E tests...");

  try {
    // Navigate to login page
    await page.goto("/auth/signin");
    await page.waitForLoadState("networkidle");

    // Test user credentials
    const testEmail = "e2e-test@example.com";
    const testPassword = "E2ETestPassword123!";

    // Check if we need to create an account first
    const signupLink = page
      .locator("text=Sign up")
      .or(page.locator("text=Create account"));
    const isSignupLinkVisible = await signupLink.isVisible().catch(() => false);

    if (isSignupLinkVisible) {
      console.log("📝 Creating test user account...");

      // Go to signup page
      await page.goto("/auth/signup");
      await page.waitForLoadState("networkidle");

      // Fill signup form
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.fill('input[name="name"]', "E2E Test User");
      await page.fill('input[name="username"]', "e2etestuser");

      // Submit signup form
      await page.click('button[type="submit"]');

      // Wait for either success redirect or error
      try {
        await page.waitForURL("**/dashboard", { timeout: 10000 });
        console.log("✅ Test user created and logged in!");
      } catch {
        // If signup fails (user might already exist), try signing in
        console.log("🔄 Signup failed, attempting to sign in...");
        await page.goto("/auth/signin");
        await page.waitForLoadState("networkidle");
      }
    }

    // If we're still on the signin page, sign in
    if (
      page.url().includes("/auth/signin") ||
      page.url().includes("/auth/login")
    ) {
      console.log("🔑 Signing in with test credentials...");

      // Fill login form
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);

      // Submit login form
      await page.click('button[type="submit"]');

      // Wait for successful login redirect
      await page.waitForURL("**/dashboard", { timeout: 15000 });
      console.log("✅ Successfully signed in!");
    }

    // Verify authentication by checking for user-specific elements
    await expect(
      page
        .locator("[data-testid='user-menu']")
        .or(page.locator("text=Dashboard"))
        .or(page.getByRole("button", { name: /profile|account|user/i }))
    ).toBeVisible({ timeout: 10000 });

    console.log("💾 Saving authentication state...");

    // Save signed-in state to reuse in other tests
    await page.context().storageState({ path: authFile });

    console.log("🎉 Authentication setup complete!");
  } catch (error) {
    console.error("❌ Authentication setup failed:", error);

    // Take a screenshot for debugging
    await page.screenshot({
      path: path.join(__dirname, "auth-setup-failure.png"),
      fullPage: true,
    });

    throw error;
  }
});
