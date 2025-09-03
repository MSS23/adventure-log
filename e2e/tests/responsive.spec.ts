import { test, expect } from "@playwright/test";
import { TestHelpers } from "../utils/test-helpers";

/**
 * Responsive design and mobile E2E tests
 * Tests application behavior across different screen sizes and devices
 */

test.describe("Responsive Design", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.navigateToPage("/dashboard");
    await helpers.verifyAuthenticated();
  });

  test.describe("Mobile Portrait (375x667)", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test("should display mobile navigation", async ({ page }) => {
      // Verify mobile menu button exists
      await expect(
        page.locator('[data-testid="mobile-menu-button"]')
      ).toBeVisible();

      // Desktop navigation should be hidden
      await expect(
        page.locator('[data-testid="desktop-nav"]')
      ).not.toBeVisible();

      // Open mobile menu
      await page.locator('[data-testid="mobile-menu-button"]').click();

      // Verify mobile menu items
      await expect(
        page.locator('[data-testid="mobile-nav-menu"]')
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /dashboard/i })
      ).toBeVisible();
      await expect(page.getByRole("link", { name: /albums/i })).toBeVisible();
    });

    test("should stack dashboard widgets vertically", async ({ page }) => {
      // Dashboard stats should be stacked
      const statsContainer = page.locator('[data-testid="dashboard-stats"]');
      await expect(statsContainer).toHaveCSS("flex-direction", "column");

      // Verify widgets are visible
      await expect(page.locator('[data-testid="total-albums"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="recent-activity"]')
      ).toBeVisible();
    });

    test("should make forms mobile-friendly", async ({ page }) => {
      await helpers.navigateToPage("/albums/new");

      // Form should be full-width on mobile
      const form = page.locator("form").first();
      await expect(form).toHaveCSS("width", /100%|375px/);

      // Input fields should be appropriately sized
      await expect(page.locator('input[name="title"]')).toBeVisible();
      await expect(page.locator('textarea[name="description"]')).toBeVisible();
    });

    test("should handle mobile touch interactions", async ({ page }) => {
      await helpers.navigateToPage("/albums");

      // Test touch/tap on album cards
      const albumCard = page.locator('[data-testid="album-card"]').first();
      await albumCard.tap();

      // Should navigate to album
      await helpers.waitForUrl(/.*\/albums\/[^/]+$/);
    });

    test("should display mobile-optimized tables", async ({ page }) => {
      await helpers.navigateToPage("/albums");

      // Tables should be responsive or replaced with cards on mobile
      const albumList = page.locator('[data-testid="album-list"]');

      // Should either be horizontal scroll or card layout
      const isCardLayout = await page
        .locator('[data-testid="album-card"]')
        .isVisible();
      const isScrollableTable = await albumList.evaluate(
        (el) => el.scrollWidth > el.clientWidth
      );

      expect(isCardLayout || isScrollableTable).toBeTruthy();
    });
  });

  test.describe("Tablet Portrait (768x1024)", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
    });

    test("should show tablet navigation layout", async ({ page }) => {
      // May show sidebar or tablet-specific navigation
      const hasSidebar = await page
        .locator('[data-testid="sidebar"]')
        .isVisible();
      const hasTabletNav = await page
        .locator('[data-testid="tablet-nav"]')
        .isVisible();

      expect(hasSidebar || hasTabletNav).toBeTruthy();
    });

    test("should display dashboard in tablet layout", async ({ page }) => {
      // Dashboard should use tablet-optimized grid
      await expect(
        page.locator('[data-testid="dashboard-stats"]')
      ).toBeVisible();

      // Should have reasonable spacing and layout
      const statsGrid = page.locator('[data-testid="dashboard-stats"]');
      const gridColumns = await statsGrid.evaluate((el) =>
        window.getComputedStyle(el).getPropertyValue("grid-template-columns")
      );

      // Should have multiple columns on tablet
      expect(gridColumns).toMatch(/(\d+px\s*){2,}/);
    });

    test("should handle tablet form layouts", async ({ page }) => {
      await helpers.navigateToPage("/albums/new");

      // Form should be appropriately sized for tablet
      const form = page.locator("form").first();
      const formWidth = await form.boundingBox();

      expect(formWidth?.width).toBeGreaterThan(400);
      expect(formWidth?.width).toBeLessThan(768);
    });
  });

  test.describe("Desktop (1920x1080)", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
    });

    test("should display full desktop layout", async ({ page }) => {
      // Desktop sidebar should be visible
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();

      // Desktop navigation should be present
      await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();

      // Mobile menu should not be visible
      await expect(
        page.locator('[data-testid="mobile-menu-button"]')
      ).not.toBeVisible();
    });

    test("should utilize full screen width", async ({ page }) => {
      // Dashboard should use full width effectively
      const mainContent = page.locator('[data-testid="main-content"]');
      const contentWidth = await mainContent.boundingBox();

      expect(contentWidth?.width).toBeGreaterThan(1200);
    });

    test("should display multiple columns appropriately", async ({ page }) => {
      await helpers.navigateToPage("/albums");

      // Albums should display in grid with multiple columns
      const albumGrid = page.locator('[data-testid="album-grid"]');
      const gridColumns = await albumGrid.evaluate((el) =>
        window.getComputedStyle(el).getPropertyValue("grid-template-columns")
      );

      // Should have 3+ columns on desktop
      expect(gridColumns).toMatch(/(\d+px\s*){3,}/);
    });
  });

  test.describe("Landscape Orientation", () => {
    test("mobile landscape should adapt layout", async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 }); // iPhone landscape

      // Header should remain visible but compact
      await expect(page.locator("header")).toBeVisible();

      // Content should use available width
      const mainContent = page.locator('[data-testid="main-content"]');
      const contentWidth = await mainContent.boundingBox();

      expect(contentWidth?.width).toBeGreaterThan(500);
    });

    test("tablet landscape should optimize for wide screen", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1024, height: 768 }); // iPad landscape

      // Should display more content horizontally
      await helpers.navigateToPage("/albums");

      const albumGrid = page.locator('[data-testid="album-grid"]');
      if (await albumGrid.isVisible()) {
        const gridColumns = await albumGrid.evaluate((el) =>
          window.getComputedStyle(el).getPropertyValue("grid-template-columns")
        );

        // Should have more columns in landscape
        expect(gridColumns).toMatch(/(\d+px\s*){2,}/);
      }
    });
  });

  test.describe("Text Scaling", () => {
    test("should handle large text scaling", async ({ page }) => {
      // Simulate large text preference
      await page.addStyleTag({
        content: `
          html { font-size: 20px !important; }
          body { font-size: 1.2em !important; }
        `,
      });

      await helpers.navigateToPage("/dashboard");

      // Content should remain readable and accessible
      await expect(page.locator("h1")).toBeVisible();
      await expect(
        page.locator('[data-testid="dashboard-stats"]')
      ).toBeVisible();

      // No horizontal scroll should appear
      const bodyScrollWidth = await page.evaluate(
        () => document.body.scrollWidth
      );
      const windowWidth = await page.evaluate(() => window.innerWidth);

      expect(bodyScrollWidth).toBeLessThanOrEqual(windowWidth + 50); // Small tolerance
    });
  });

  test.describe("Touch Device Features", () => {
    test("should support touch gestures on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await helpers.navigateToPage("/albums");

      const albumCard = page.locator('[data-testid="album-card"]').first();

      // Test touch events
      await albumCard.tap();
      await helpers.waitForUrl(/.*\/albums\/[^/]+$/);
    });

    test("should handle swipe gestures if implemented", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await helpers.navigateToPage("/albums");

      // If swipe functionality exists, test it
      const swipeContainer = page.locator('[data-testid="swipeable-content"]');

      if (await swipeContainer.isVisible()) {
        // Simulate swipe gesture
        await swipeContainer.hover();
        await page.mouse.down();
        await page.mouse.move(100, 0);
        await page.mouse.up();

        // Verify swipe action occurred
        // This would depend on specific implementation
      }
    });
  });

  test.describe("Print Styles", () => {
    test("should have appropriate print styles", async ({ page }) => {
      await helpers.navigateToPage("/albums");

      // Emulate print media
      await page.emulateMedia({ media: "print" });

      // Navigation should be hidden in print
      const navigation = page.locator('[data-testid="sidebar"]');
      if (await navigation.isVisible()) {
        const navDisplay = await navigation.evaluate(
          (el) => window.getComputedStyle(el).display
        );
        expect(navDisplay).toBe("none");
      }

      // Content should be visible for printing
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    });
  });

  test.describe("Reduced Motion", () => {
    test("should respect reduced motion preferences", async ({ page }) => {
      // Simulate reduced motion preference
      await page.emulateMedia({ reducedMotion: "reduce" });

      await helpers.navigateToPage("/dashboard");

      // Animations should be disabled or reduced
      const animatedElements = page.locator('[class*="animate"]');
      const elementCount = await animatedElements.count();

      for (let i = 0; i < elementCount; i++) {
        const element = animatedElements.nth(i);
        const animationDuration = await element.evaluate(
          (el) => window.getComputedStyle(el).animationDuration
        );

        // Should be 0s or very short for reduced motion
        expect(["0s", "0.01s"]).toContain(animationDuration);
      }
    });
  });

  test.describe("Dark Mode Responsive", () => {
    test("should maintain responsive design in dark mode", async ({ page }) => {
      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
      });

      // Test mobile dark mode
      await page.setViewportSize({ width: 375, height: 667 });
      await helpers.navigateToPage("/dashboard");

      // Verify mobile layout works in dark mode
      await expect(
        page.locator('[data-testid="mobile-menu-button"]')
      ).toBeVisible();

      // Test desktop dark mode
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Verify desktop layout works in dark mode
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    });
  });

  test.describe("Performance on Mobile", () => {
    test("should load efficiently on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Measure load time
      const startTime = Date.now();
      await helpers.navigateToPage("/dashboard");
      await helpers.waitForAppLoad();
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);
    });

    test("should handle poor network conditions", async ({ page }) => {
      // Simulate slow network
      await page.route("**/*", (route) => {
        const delay = Math.random() * 1000; // Random delay up to 1s
        setTimeout(() => route.continue(), delay);
      });

      await page.setViewportSize({ width: 375, height: 667 });
      await helpers.navigateToPage("/dashboard");

      // Should show loading states
      const hasLoadingState = await page
        .locator('[data-testid*="loading"]')
        .isVisible()
        .catch(() => false);

      // Should eventually load
      await helpers.waitForAppLoad();
      await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
    });
  });
});
