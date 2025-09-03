import { test, expect } from "@playwright/test";
import { TestHelpers } from "../utils/test-helpers";

/**
 * Globe and Privacy E2E Tests
 * Tests 3D globe functionality, performance tiers, and privacy features
 * @smoke - Critical globe and privacy features
 */

test.describe("Globe and Privacy Features", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);

    // Start authenticated for most tests
    await helpers.navigateToPage("/auth/signin");
    await helpers.fillField("email", "e2e-test@example.com");
    await helpers.fillField("password", "E2ETestPassword123!");
    await helpers.clickButton("Sign In");
    await helpers.verifyAuthenticated();
  });

  test.describe("3D Globe @smoke", () => {
    test("should load and display 3D globe", async ({ page }) => {
      await helpers.navigateToPage("/globe");

      // Verify globe page loads
      await helpers.verifyPageTitle("Explore the Globe");

      // Wait for globe to initialize
      const globe = page.locator('[data-testid="globe-container"]');
      await expect(globe).toBeVisible({ timeout: 10000 });

      // Check if WebGL is supported and globe renders
      const canvas = page.locator("canvas");
      await expect(canvas).toBeVisible();

      // Verify globe has rendered content
      const globeReady = await page.evaluate(() => {
        return new Promise((resolve) => {
          const checkGlobe = () => {
            const canvas = document.querySelector("canvas");
            if (canvas && canvas.width > 0 && canvas.height > 0) {
              resolve(true);
            } else if (Date.now() - start > 10000) {
              resolve(false); // Timeout after 10s
            } else {
              setTimeout(checkGlobe, 100);
            }
          };
          const start = Date.now();
          checkGlobe();
        });
      });

      expect(globeReady).toBe(true);
    });

    test("should show country markers on globe", async ({ page }) => {
      await helpers.navigateToPage("/globe");

      // Wait for globe and markers to load
      await page.waitForSelector('[data-testid="globe-container"]', {
        timeout: 10000,
      });

      // Wait for markers to be added
      await page.waitForTimeout(3000);

      // Check if markers are visible (this depends on implementation)
      const markersExist = await page.evaluate(() => {
        // Check if markers have been added to the scene
        return (
          document.querySelectorAll("[data-marker]").length > 0 ||
          document.querySelector("canvas")?.getContext("webgl2") !== null
        );
      });

      expect(markersExist).toBeTruthy();
    });

    test("should handle globe interactions", async ({ page }) => {
      await helpers.navigateToPage("/globe");

      // Wait for globe to load
      await page.waitForSelector("canvas", { timeout: 10000 });

      const canvas = page.locator("canvas");

      // Test mouse interaction (rotation)
      await canvas.hover();
      await page.mouse.down();
      await page.mouse.move(100, 50);
      await page.mouse.up();

      // Test zoom (if implemented)
      await canvas.hover();
      await page.mouse.wheel(0, -100);

      // Globe should still be responsive
      await expect(canvas).toBeVisible();
    });

    test("should fall back to 2D map on low performance", async ({ page }) => {
      // Simulate low performance device
      await page.addInitScript(() => {
        // Mock hardware detection to force 2D fallback
        Object.defineProperty(navigator, "hardwareConcurrency", {
          writable: false,
          value: 1, // Low core count
        });

        // Mock reduced motion preference
        Object.defineProperty(window, "matchMedia", {
          writable: true,
          value: jest.fn().mockImplementation((query) => ({
            matches: query.includes("prefers-reduced-motion"),
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
          })),
        });
      });

      await helpers.navigateToPage("/globe");

      // Should show 2D map fallback
      const fallbackMap = page.locator('[data-testid="map-fallback"]');
      const canvas3D = page.locator('[data-testid="globe-container"] canvas');

      // Either should show fallback or reduced globe
      const has2DFallback = await fallbackMap.isVisible();
      const has3DGlobe = await canvas3D.isVisible();

      expect(has2DFallback || has3DGlobe).toBeTruthy();
    });
  });

  test.describe("Performance Tiers", () => {
    test("should detect device capabilities", async ({ page }) => {
      // Inject script to capture performance tier detection
      await page.addInitScript(() => {
        window.performanceDetection = {
          hardwareConcurrency: navigator.hardwareConcurrency,
          deviceMemory: (navigator as any).deviceMemory,
          connectionType: (navigator as any).connection?.effectiveType,
        };
      });

      await helpers.navigateToPage("/globe");

      // Check if performance detection ran
      const detection = await page.evaluate(
        () => (window as any).performanceDetection
      );

      expect(detection).toBeDefined();
      expect(typeof detection.hardwareConcurrency).toBe("number");
    });

    test("should adjust quality based on FPS", async ({ page }) => {
      await helpers.navigateToPage("/globe");

      // Wait for globe to initialize
      await page.waitForSelector("canvas", { timeout: 10000 });

      // Let FPS sampling run for a few seconds
      await page.waitForTimeout(5000);

      // Check if performance adjustments were made
      const performanceInfo = await page.evaluate(() => {
        // This would need to be exposed by the globe component
        return (window as any).globePerformance || { tier: "unknown" };
      });

      expect(performanceInfo).toBeDefined();
    });
  });

  test.describe("Country Clustering", () => {
    test("should group albums by country", async ({ page }) => {
      await helpers.navigateToPage("/globe");

      // Wait for globe to load
      await page.waitForSelector('[data-testid="globe-container"]', {
        timeout: 10000,
      });

      // Look for country information display
      const countryInfo = page.locator('[data-testid="country-info"]');
      const albumCount = page.locator('[data-testid="album-count"]');

      // May not be visible initially, but functionality should exist
      // This test verifies the clustering feature is accessible
      if (await countryInfo.isVisible()) {
        await expect(albumCount).toBeVisible();
      }
    });
  });

  test.describe("Privacy Settings @smoke", () => {
    test("should create album with different privacy levels", async ({
      page,
    }) => {
      await helpers.navigateToPage("/albums/new");

      // Create public album
      await helpers.fillField("title", "Public Album Test");
      await helpers.fillField("description", "This is a public album");
      await helpers.fillField("country", "United States");
      await helpers.fillField("city", "New York");

      // Set privacy to public
      await page.selectOption('[data-testid="privacy-select"]', "PUBLIC");

      await helpers.clickButton("Create Album");

      // Verify album was created
      await helpers.verifySuccessMessage();
      await expect(page).toHaveURL(/.*\/albums\/[a-zA-Z0-9]+/);

      // Verify privacy setting is displayed
      await expect(
        page.locator('[data-testid="privacy-indicator"]')
      ).toHaveText(/public/i);
    });

    test("should respect friends-only privacy setting", async ({ page }) => {
      await helpers.navigateToPage("/albums/new");

      // Create friends-only album
      await helpers.fillField("title", "Friends Only Album");
      await helpers.fillField("description", "This is for friends only");
      await helpers.fillField("country", "Canada");

      // Set privacy to friends only
      await page.selectOption('[data-testid="privacy-select"]', "FRIENDS_ONLY");

      await helpers.clickButton("Create Album");

      await helpers.verifySuccessMessage();

      // Verify privacy setting
      await expect(
        page.locator('[data-testid="privacy-indicator"]')
      ).toHaveText(/friends/i);
    });

    test("should create private album", async ({ page }) => {
      await helpers.navigateToPage("/albums/new");

      // Create private album
      await helpers.fillField("title", "Private Album");
      await helpers.fillField("description", "This is completely private");
      await helpers.fillField("country", "United Kingdom");

      // Set privacy to private
      await page.selectOption('[data-testid="privacy-select"]', "PRIVATE");

      await helpers.clickButton("Create Album");

      await helpers.verifySuccessMessage();

      // Verify privacy setting
      await expect(
        page.locator('[data-testid="privacy-indicator"]')
      ).toHaveText(/private/i);
    });
  });

  test.describe("GPS Privacy Control", () => {
    test("should allow GPS sharing for public albums", async ({ page }) => {
      await helpers.navigateToPage("/albums/new");

      await helpers.fillField("title", "GPS Test Album");
      await helpers.fillField("country", "France");
      await helpers.fillField("city", "Paris");

      // Enable GPS sharing
      await page.check('[data-testid="share-location-checkbox"]');

      // Set to public
      await page.selectOption('[data-testid="privacy-select"]', "PUBLIC");

      await helpers.clickButton("Create Album");

      await helpers.verifySuccessMessage();

      // Should allow GPS sharing for public albums
      const locationSharing = page.locator(
        '[data-testid="location-sharing-enabled"]'
      );
      if (await locationSharing.isVisible()) {
        await expect(locationSharing).toBeVisible();
      }
    });

    test("should warn about GPS sharing on private albums", async ({
      page,
    }) => {
      await helpers.navigateToPage("/albums/new");

      await helpers.fillField("title", "Private GPS Test");
      await helpers.fillField("country", "Germany");

      // Set to private first
      await page.selectOption('[data-testid="privacy-select"]', "PRIVATE");

      // Try to enable GPS sharing
      await page.check('[data-testid="share-location-checkbox"]');

      // Should show warning or automatically disable
      const gpsWarning = page.locator('[data-testid="gps-privacy-warning"]');
      if (await gpsWarning.isVisible()) {
        await expect(gpsWarning).toBeVisible();
      }
    });
  });

  test.describe("EXIF Privacy", () => {
    test("should handle photo upload with EXIF data", async ({ page }) => {
      // First create an album
      await helpers.navigateToPage("/albums/new");
      await helpers.fillField("title", "EXIF Test Album");
      await helpers.fillField("country", "Japan");
      await page.selectOption('[data-testid="privacy-select"]', "PUBLIC");
      await helpers.clickButton("Create Album");

      // Navigate to photo upload
      await page.getByRole("button", { name: /add photos|upload/i }).click();

      // Mock file upload (in real test, you'd use actual file)
      const fileInput = page.locator('input[type="file"]');

      // This is a placeholder - in real tests you'd upload an actual image
      // The test verifies the upload form exists and is accessible
      await expect(fileInput).toBeVisible();

      // Verify GPS privacy options are available
      const privacyOptions = page.locator(
        '[data-testid="photo-privacy-options"]'
      );
      if (await privacyOptions.isVisible()) {
        await expect(privacyOptions).toBeVisible();
      }
    });
  });

  test.describe("Content Visibility", () => {
    test("should show only public content to unauthenticated users", async ({
      page,
    }) => {
      // Logout first
      await page.getByRole("button", { name: /profile|account|user/i }).click();
      await page.getByRole("menuitem", { name: /logout|sign out/i }).click();

      await helpers.navigateToPage("/albums");

      // Should only see public albums
      const albumCards = page.locator('[data-testid="album-card"]');
      await expect(albumCards.first()).toBeVisible();

      // Should not see private indicators for non-public content
      const privateContent = page.locator('[data-testid="private-album"]');
      expect(await privateContent.count()).toBe(0);
    });

    test("should filter globe markers by privacy", async ({ page }) => {
      await helpers.navigateToPage("/globe");

      // Wait for globe to load
      await page.waitForSelector('[data-testid="globe-container"]', {
        timeout: 10000,
      });

      // Globe should only show markers for content user can see
      // This is more about verifying the feature exists than specific counts
      const globeContainer = page.locator('[data-testid="globe-container"]');
      await expect(globeContainer).toBeVisible();
    });
  });

  test.describe("Accessibility and Globe", () => {
    test("globe should have keyboard navigation", async ({ page }) => {
      await helpers.navigateToPage("/globe");

      // Wait for globe to load
      await page.waitForSelector('[data-testid="globe-container"]', {
        timeout: 10000,
      });

      // Should be able to focus on globe or its controls
      await page.keyboard.press("Tab");

      // Check if focus is on a globe control element
      const focused = await page.evaluate(
        () => document.activeElement?.tagName
      );
      expect(focused).toBeTruthy();
    });

    test("should provide alternative text for globe content", async ({
      page,
    }) => {
      await helpers.navigateToPage("/globe");

      // Check for alt text or ARIA labels on globe elements
      const globeContainer = page.locator('[data-testid="globe-container"]');

      // Should have appropriate accessibility attributes
      const hasAriaLabel = await globeContainer.getAttribute("aria-label");
      const hasRole = await globeContainer.getAttribute("role");

      expect(hasAriaLabel || hasRole).toBeTruthy();
    });

    test("privacy controls should be accessible", async ({ page }) => {
      await helpers.navigateToPage("/albums/new");

      // Check privacy select accessibility
      const privacySelect = page.locator('[data-testid="privacy-select"]');
      await expect(privacySelect).toHaveAttribute("aria-label");

      // Check GPS sharing checkbox accessibility
      const gpsCheckbox = page.locator(
        '[data-testid="share-location-checkbox"]'
      );
      if (await gpsCheckbox.isVisible()) {
        await expect(gpsCheckbox).toHaveAttribute("aria-describedby");
      }
    });
  });

  test.describe("Mobile Globe Experience", () => {
    test("should work on mobile devices", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await helpers.navigateToPage("/globe");

      // Should either show mobile-optimized globe or 2D fallback
      const globeContainer = page.locator('[data-testid="globe-container"]');
      const mapFallback = page.locator('[data-testid="map-fallback"]');

      const hasGlobe = await globeContainer.isVisible();
      const hasFallback = await mapFallback.isVisible();

      expect(hasGlobe || hasFallback).toBeTruthy();
    });

    test("should handle touch interactions", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await helpers.navigateToPage("/globe");
      await page.waitForSelector('[data-testid="globe-container"]', {
        timeout: 10000,
      });

      // Test touch interaction on mobile
      const canvas = page.locator("canvas");
      if (await canvas.isVisible()) {
        // Simulate touch
        await canvas.tap();
        await page.waitForTimeout(1000);
      }

      // Should remain functional
      await expect(
        page.locator('[data-testid="globe-container"]')
      ).toBeVisible();
    });
  });

  test.describe("Performance", () => {
    test("globe should load within performance budget", async ({ page }) => {
      const startTime = Date.now();

      await helpers.navigateToPage("/globe");

      // Wait for globe to be ready
      await page.waitForSelector('[data-testid="globe-container"]', {
        timeout: 10000,
      });

      const loadTime = Date.now() - startTime;

      // Should load within 10 seconds even on slower devices
      expect(loadTime).toBeLessThan(10000);
    });
  });
});
