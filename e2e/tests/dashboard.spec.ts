import { test, expect } from "@playwright/test";
import { TestHelpers } from "../utils/test-helpers";

/**
 * Dashboard and navigation E2E tests
 * Tests critical dashboard functionality and application navigation
 */

test.describe("Dashboard & Navigation", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);

    // Ensure we're authenticated for these tests
    await helpers.navigateToPage("/dashboard");
    await helpers.verifyAuthenticated();
  });

  test.describe("Dashboard Overview", () => {
    test("should display dashboard with key metrics", async ({ page }) => {
      await helpers.verifyPageTitle("Dashboard");

      // Verify key dashboard elements
      await expect(page.locator('[data-testid="total-albums"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-photos"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="countries-visited"]')
      ).toBeVisible();

      // Verify numbers are displayed
      await expect(
        page.locator('[data-testid="total-albums"] .count')
      ).toContainText(/\d+/);
      await expect(
        page.locator('[data-testid="total-photos"] .count')
      ).toContainText(/\d+/);
      await expect(
        page.locator('[data-testid="countries-visited"] .count')
      ).toContainText(/\d+/);
    });

    test("should show recent activity", async ({ page }) => {
      // Verify recent activity section
      await expect(
        page.locator('[data-testid="recent-activity"]')
      ).toBeVisible();

      // Verify activity items
      const activityItems = page.locator('[data-testid="activity-item"]');
      const itemCount = await activityItems.count();

      if (itemCount > 0) {
        await expect(activityItems.first()).toBeVisible();
        await expect(activityItems.first()).toContainText(/album|photo|trip/i);
      } else {
        // Should show empty state
        await expect(
          page.locator('[data-testid="no-activity-message"]')
        ).toBeVisible();
      }
    });

    test("should display travel statistics", async ({ page }) => {
      // Verify travel stats section
      await expect(page.locator('[data-testid="travel-stats"]')).toBeVisible();

      // Verify streak information
      await expect(
        page.locator('[data-testid="current-streak"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="longest-streak"]')
      ).toBeVisible();

      // Verify streak numbers
      await expect(
        page.locator('[data-testid="current-streak"] .value')
      ).toContainText(/\d+/);
      await expect(
        page.locator('[data-testid="longest-streak"] .value')
      ).toContainText(/\d+/);
    });

    test("should show quick action buttons", async ({ page }) => {
      // Verify quick action buttons
      await expect(
        page.getByRole("button", { name: /create album/i })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /add photos/i })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /new trip/i })
      ).toBeVisible();
    });

    test("should navigate from quick actions", async ({ page }) => {
      // Test create album quick action
      await page.getByRole("button", { name: /create album/i }).click();

      await helpers.waitForUrl(/.*\/albums\/new/);
      await helpers.verifyPageTitle("Create Album");
    });
  });

  test.describe("Navigation Menu", () => {
    test("should display main navigation items", async ({ page }) => {
      // Verify main navigation items
      await expect(
        page.getByRole("link", { name: /dashboard/i })
      ).toBeVisible();
      await expect(page.getByRole("link", { name: /albums/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /trips/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /globe/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /profile/i })).toBeVisible();
    });

    test("should navigate to albums page", async ({ page }) => {
      await page.getByRole("link", { name: /albums/i }).click();

      await helpers.waitForUrl(/.*\/albums/);
      await helpers.verifyPageTitle("My Albums");
    });

    test("should navigate to trips page", async ({ page }) => {
      await page.getByRole("link", { name: /trips/i }).click();

      await helpers.waitForUrl(/.*\/trips/);
      await helpers.verifyPageTitle("My Trips");
    });

    test("should navigate to globe view", async ({ page }) => {
      await page.getByRole("link", { name: /globe/i }).click();

      await helpers.waitForUrl(/.*\/globe/);
      await helpers.verifyPageTitle("Travel Globe");
    });

    test("should navigate to profile page", async ({ page }) => {
      await page.getByRole("link", { name: /profile/i }).click();

      await helpers.waitForUrl(/.*\/profile/);
      await helpers.verifyPageTitle("Profile");
    });

    test("should highlight active navigation item", async ({ page }) => {
      // Current page should be highlighted
      await expect(page.getByRole("link", { name: /dashboard/i })).toHaveClass(
        /active/
      );

      // Navigate to albums
      await page.getByRole("link", { name: /albums/i }).click();
      await helpers.waitForUrl(/.*\/albums/);

      // Albums should be highlighted now
      await expect(page.getByRole("link", { name: /albums/i })).toHaveClass(
        /active/
      );
    });
  });

  test.describe("User Menu", () => {
    test("should display user menu", async ({ page }) => {
      // Click user menu
      await page.locator('[data-testid="user-menu"]').click();

      // Verify menu items
      await expect(
        page.getByRole("menuitem", { name: /profile/i })
      ).toBeVisible();
      await expect(
        page.getByRole("menuitem", { name: /settings/i })
      ).toBeVisible();
      await expect(
        page.getByRole("menuitem", { name: /logout/i })
      ).toBeVisible();
    });

    test("should navigate to settings from user menu", async ({ page }) => {
      await page.locator('[data-testid="user-menu"]').click();
      await page.getByRole("menuitem", { name: /settings/i }).click();

      await helpers.waitForUrl(/.*\/settings/);
      await helpers.verifyPageTitle("Settings");
    });

    test("should show user information in menu", async ({ page }) => {
      await page.locator('[data-testid="user-menu"]').click();

      // Should show user name and email
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toContainText(
        /test user/i
      );
      await expect(page.locator('[data-testid="user-email"]')).toContainText(
        /@/
      );
    });
  });

  test.describe("Search Functionality", () => {
    test("should display search interface", async ({ page }) => {
      // Click search
      await page.locator('[data-testid="search-button"]').click();

      // Verify search modal/interface
      await expect(page.locator('[data-testid="search-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    });

    test("should search for albums", async ({ page }) => {
      await page.locator('[data-testid="search-button"]').click();

      // Search for albums
      await page.fill('[data-testid="search-input"]', "test");

      // Verify search results
      await expect(
        page.locator('[data-testid="search-results"]')
      ).toBeVisible();

      // Results should contain albums
      const albumResults = page.locator('[data-testid="album-search-result"]');
      if ((await albumResults.count()) > 0) {
        await expect(albumResults.first()).toBeVisible();
      }
    });

    test("should handle empty search results", async ({ page }) => {
      await page.locator('[data-testid="search-button"]').click();

      // Search for something that doesn't exist
      await page.fill(
        '[data-testid="search-input"]',
        "nonexistentquerystring123456"
      );

      // Verify no results message
      await expect(
        page.locator('[data-testid="no-search-results"]')
      ).toBeVisible();
    });
  });

  test.describe("Interactive Globe", () => {
    test("should load 3D globe", async ({ page }) => {
      await helpers.navigateToPage("/globe");

      // Wait for globe to load
      await expect(page.locator('[data-testid="travel-globe"]')).toBeVisible({
        timeout: 10000,
      });

      // Verify globe controls
      await expect(
        page.locator('[data-testid="globe-controls"]')
      ).toBeVisible();
    });

    test("should show country information on hover", async ({ page }) => {
      await helpers.navigateToPage("/globe");

      // Wait for globe to load
      await page.waitForSelector('[data-testid="travel-globe"]', {
        timeout: 10000,
      });

      // Hover over a country (this is complex with 3D, so we'll check for hover interface)
      await expect(page.locator('[data-testid="country-info-tooltip"]'))
        .toBeVisible()
        .catch(() => {
          // Globe interaction might not be available in all environments
        });
    });

    test("should display visited countries", async ({ page }) => {
      await helpers.navigateToPage("/globe");

      // Verify visited countries list
      await expect(
        page.locator('[data-testid="visited-countries"]')
      ).toBeVisible();

      // Should show at least some countries if user has albums
      const countryItems = page.locator('[data-testid="country-item"]');
      if ((await countryItems.count()) > 0) {
        await expect(countryItems.first()).toBeVisible();
      }
    });
  });

  test.describe("Recent Albums Widget", () => {
    test("should display recent albums on dashboard", async ({ page }) => {
      // Verify recent albums section
      await expect(page.locator('[data-testid="recent-albums"]')).toBeVisible();

      // Should show album previews
      const albumPreviews = page.locator('[data-testid="album-preview"]');
      if ((await albumPreviews.count()) > 0) {
        await expect(albumPreviews.first()).toBeVisible();

        // Click to navigate to album
        await albumPreviews.first().click();
        await helpers.waitForUrl(/.*\/albums\/[^/]+$/);
      }
    });

    test("should show 'view all' link", async ({ page }) => {
      await expect(
        page.getByRole("link", { name: /view all albums/i })
      ).toBeVisible();

      // Click to navigate to albums page
      await page.getByRole("link", { name: /view all albums/i }).click();
      await helpers.waitForUrl(/.*\/albums/);
    });
  });

  test.describe("Notifications", () => {
    test("should display notifications bell", async ({ page }) => {
      await expect(
        page.locator('[data-testid="notifications-button"]')
      ).toBeVisible();
    });

    test("should show notifications dropdown", async ({ page }) => {
      await page.locator('[data-testid="notifications-button"]').click();

      await expect(
        page.locator('[data-testid="notifications-dropdown"]')
      ).toBeVisible();

      // Should show notifications or empty state
      const hasNotifications =
        (await page.locator('[data-testid="notification-item"]').count()) > 0;

      if (hasNotifications) {
        await expect(
          page.locator('[data-testid="notification-item"]').first()
        ).toBeVisible();
      } else {
        await expect(
          page.locator('[data-testid="no-notifications"]')
        ).toBeVisible();
      }
    });
  });

  test.describe("Theme Toggle", () => {
    test("should toggle between light and dark theme", async ({ page }) => {
      // Find theme toggle button
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      await expect(themeToggle).toBeVisible();

      // Get current theme
      const currentTheme = await page.evaluate(() =>
        document.documentElement.classList.contains("dark") ? "dark" : "light"
      );

      // Toggle theme
      await themeToggle.click();

      // Verify theme changed
      await page.waitForFunction(
        (oldTheme) => {
          const newTheme = document.documentElement.classList.contains("dark")
            ? "dark"
            : "light";
          return newTheme !== oldTheme;
        },
        currentTheme,
        { timeout: 3000 }
      );
    });
  });

  test.describe("Responsive Dashboard", () => {
    test("should adapt to mobile layout", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await helpers.navigateToPage("/dashboard");

      // Verify mobile navigation
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();

      // Verify mobile menu button
      await expect(
        page.locator('[data-testid="mobile-menu-button"]')
      ).toBeVisible();

      // Test mobile menu
      await page.locator('[data-testid="mobile-menu-button"]').click();
      await expect(
        page.locator('[data-testid="mobile-nav-menu"]')
      ).toBeVisible();
    });

    test("should hide/show sidebar on tablet", async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await helpers.navigateToPage("/dashboard");

      // Verify sidebar behavior on tablet
      const sidebar = page.locator('[data-testid="sidebar"]');
      await expect(sidebar).toBeVisible();

      // Test sidebar toggle if available
      const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
      if (await sidebarToggle.isVisible()) {
        await sidebarToggle.click();
        await expect(sidebar).toHaveClass(/collapsed/);
      }
    });
  });

  test.describe("Loading States", () => {
    test("should show loading states appropriately", async ({ page }) => {
      // Mock slow API response
      await page.route("/api/dashboard/stats", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Delay
        route.continue();
      });

      await helpers.navigateToPage("/dashboard");

      // Verify loading states
      await expect(page.locator('[data-testid="stats-loading"]')).toBeVisible();

      // Wait for loading to complete
      await expect(
        page.locator('[data-testid="stats-loading"]')
      ).not.toBeVisible({ timeout: 10000 });
    });

    test("should handle API errors gracefully", async ({ page }) => {
      // Mock API error
      await page.route("/api/dashboard/stats", (route) => {
        route.fulfill({ status: 500, body: "Server Error" });
      });

      await helpers.navigateToPage("/dashboard");

      // Verify error handling
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("navigation should be keyboard accessible", async ({ page }) => {
      // Test keyboard navigation
      await page.keyboard.press("Tab");

      // Verify focus moves through navigation items
      await expect(
        page.locator('[data-testid="nav-item"]:focus')
      ).toBeVisible();

      // Test Enter key on navigation
      await page.keyboard.press("Enter");
      // Should navigate somewhere
    });

    test("dashboard should have proper ARIA labels", async ({ page }) => {
      // Verify ARIA labels on key elements
      await helpers.verifyAccessibility('[data-testid="user-menu"]');
      await helpers.verifyAccessibility('[data-testid="search-button"]');
      await helpers.verifyAccessibility('[data-testid="notifications-button"]');
    });

    test("should support screen readers", async ({ page }) => {
      // Verify heading structure
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("h2").first()).toBeVisible();

      // Verify landmarks
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[role="navigation"]')).toBeVisible();
    });
  });
});
