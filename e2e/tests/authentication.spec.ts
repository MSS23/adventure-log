import { test, expect } from "@playwright/test";
import { TestHelpers } from "../utils/test-helpers";

/**
 * Authentication flow E2E tests
 * Tests critical user authentication journeys
 */

test.describe("Authentication", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test.describe("Sign Up Flow", () => {
    test("should allow new user to create account", async ({ page }) => {
      const timestamp = Date.now();
      const testEmail = `e2e-signup-${timestamp}@example.com`;
      const testUsername = `e2euser${timestamp}`;

      await helpers.navigateToPage("/auth/signup");

      // Verify signup page loads
      await helpers.verifyPageTitle("Sign Up");

      // Fill signup form
      await helpers.fillField("email", testEmail);
      await helpers.fillField("password", "TestPassword123!");
      await helpers.fillField("name", "E2E Test User");
      await helpers.fillField("username", testUsername);

      // Submit form
      await helpers.clickButton("Sign Up");

      // Verify successful signup
      await helpers.waitForUrl(/.*\/dashboard/);
      await helpers.verifyAuthenticated();

      // Verify user is redirected to dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test("should validate email format", async ({ page }) => {
      await helpers.navigateToPage("/auth/signup");

      // Fill form with invalid email
      await helpers.fillField("email", "invalid-email");
      await helpers.fillField("password", "TestPassword123!");
      await helpers.fillField("name", "Test User");
      await helpers.fillField("username", "testuser");

      await helpers.clickButton("Sign Up");

      // Verify validation error
      await helpers.verifyErrorMessage();
    });

    test("should validate password requirements", async ({ page }) => {
      await helpers.navigateToPage("/auth/signup");

      // Fill form with weak password
      await helpers.fillField("email", "test@example.com");
      await helpers.fillField("password", "weak");
      await helpers.fillField("name", "Test User");
      await helpers.fillField("username", "testuser");

      await helpers.clickButton("Sign Up");

      // Verify validation error
      await helpers.verifyErrorMessage();
    });

    test("should prevent duplicate email registration", async ({ page }) => {
      const existingEmail = "e2e-test@example.com"; // Existing test user

      await helpers.navigateToPage("/auth/signup");

      await helpers.fillField("email", existingEmail);
      await helpers.fillField("password", "TestPassword123!");
      await helpers.fillField("name", "Test User");
      await helpers.fillField("username", "anothertestuser");

      await helpers.clickButton("Sign Up");

      // Verify duplicate email error
      await helpers.verifyErrorMessage();
    });
  });

  test.describe("Sign In Flow", () => {
    test("should allow existing user to sign in", async ({ page }) => {
      await helpers.navigateToPage("/auth/signin");

      // Verify signin page loads
      await helpers.verifyPageTitle("Sign In");

      // Fill signin form with test credentials
      await helpers.fillField("email", "e2e-test@example.com");
      await helpers.fillField("password", "E2ETestPassword123!");

      await helpers.clickButton("Sign In");

      // Verify successful signin
      await helpers.waitForUrl(/.*\/dashboard/);
      await helpers.verifyAuthenticated();
    });

    test("should reject invalid credentials", async ({ page }) => {
      await helpers.navigateToPage("/auth/signin");

      // Fill form with invalid credentials
      await helpers.fillField("email", "nonexistent@example.com");
      await helpers.fillField("password", "wrongpassword");

      await helpers.clickButton("Sign In");

      // Verify error message
      await helpers.verifyErrorMessage();

      // Verify user remains on signin page
      await expect(page).toHaveURL(/.*\/auth\/signin/);
    });

    test("should handle empty form submission", async ({ page }) => {
      await helpers.navigateToPage("/auth/signin");

      // Submit empty form
      await helpers.clickButton("Sign In");

      // Verify validation errors
      await helpers.verifyErrorMessage();
    });

    test("should redirect to intended page after signin", async ({ page }) => {
      // Try to access protected route
      await helpers.navigateToPage("/dashboard/settings");

      // Should redirect to signin
      await expect(page).toHaveURL(/.*\/auth\/signin/);

      // Sign in
      await helpers.fillField("email", "e2e-test@example.com");
      await helpers.fillField("password", "E2ETestPassword123!");
      await helpers.clickButton("Sign In");

      // Should redirect back to intended page
      await helpers.waitForUrl(/.*\/dashboard\/settings/);
    });
  });

  test.describe("OAuth Authentication", () => {
    test("should display Google OAuth button", async ({ page }) => {
      await helpers.navigateToPage("/auth/signin");

      // Verify Google signin button exists
      await expect(
        page.getByRole("button", { name: /sign in with google/i })
      ).toBeVisible();
    });

    test("should display OAuth providers on signup page", async ({ page }) => {
      await helpers.navigateToPage("/auth/signup");

      // Verify OAuth buttons exist
      await expect(
        page.getByRole("button", { name: /sign up with google/i })
      ).toBeVisible();
    });
  });

  test.describe("Password Reset", () => {
    test("should show forgot password link", async ({ page }) => {
      await helpers.navigateToPage("/auth/signin");

      // Verify forgot password link exists
      await expect(page.getByText("Forgot password?")).toBeVisible();
    });

    test("should navigate to password reset page", async ({ page }) => {
      await helpers.navigateToPage("/auth/signin");

      // Click forgot password link
      await page.click("text=Forgot password?");

      // Verify redirect to reset page
      await expect(page).toHaveURL(/.*\/auth\/reset/);
    });

    test("should validate email on reset page", async ({ page }) => {
      await helpers.navigateToPage("/auth/reset-password");

      // Submit invalid email
      await helpers.fillField("email", "invalid-email");
      await helpers.clickButton("Send Reset Link");

      // Verify validation error
      await helpers.verifyErrorMessage();
    });
  });

  test.describe("Logout Flow", () => {
    test("should log out authenticated user", async ({ page }) => {
      // This test uses authenticated state
      await helpers.navigateToPage("/dashboard");
      await helpers.verifyAuthenticated();

      // Find and click logout button
      await page.getByRole("button", { name: /profile|account|user/i }).click();
      await page.getByRole("menuitem", { name: /logout|sign out/i }).click();

      // Verify logout
      await helpers.verifyNotAuthenticated();
      await expect(page).toHaveURL(/.*\/(auth\/signin|login|$)/);
    });

    test("should clear user session on logout", async ({ page }) => {
      await helpers.navigateToPage("/dashboard");
      await helpers.verifyAuthenticated();

      // Logout
      await page.getByRole("button", { name: /profile|account|user/i }).click();
      await page.getByRole("menuitem", { name: /logout|sign out/i }).click();

      // Try to access protected route
      await helpers.navigateToPage("/dashboard/settings");

      // Should redirect to signin
      await expect(page).toHaveURL(/.*\/auth\/signin/);
    });
  });

  test.describe("Session Management", () => {
    test("should maintain session across page refreshes", async ({ page }) => {
      await helpers.navigateToPage("/dashboard");
      await helpers.verifyAuthenticated();

      // Refresh page
      await page.reload();
      await helpers.waitForAppLoad();

      // Should still be authenticated
      await helpers.verifyAuthenticated();
    });

    test("should handle expired sessions gracefully", async ({ page }) => {
      // Mock expired session
      await page.addInitScript(() => {
        // Clear localStorage to simulate expired session
        localStorage.clear();
        sessionStorage.clear();
      });

      await helpers.navigateToPage("/dashboard");

      // Should redirect to signin for expired session
      await expect(page).toHaveURL(/.*\/auth\/signin/);
    });
  });

  test.describe("Accessibility", () => {
    test("signin form should be accessible", async ({ page }) => {
      await helpers.navigateToPage("/auth/signin");

      // Verify form accessibility
      await helpers.verifyAccessibility('input[type="email"]');
      await helpers.verifyAccessibility('input[type="password"]');
      await helpers.verifyAccessibility('button[type="submit"]');

      // Verify form labels
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test("signup form should be accessible", async ({ page }) => {
      await helpers.navigateToPage("/auth/signup");

      // Verify form accessibility
      await helpers.verifyAccessibility('input[type="email"]');
      await helpers.verifyAccessibility('input[type="password"]');
      await helpers.verifyAccessibility('input[name="name"]');
      await helpers.verifyAccessibility('input[name="username"]');
      await helpers.verifyAccessibility('button[type="submit"]');
    });
  });
});
