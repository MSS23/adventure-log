import { test, expect } from "@playwright/test";
import { TestHelpers } from "../utils/test-helpers";

/**
 * Album management E2E tests
 * Tests critical album creation, editing, and management journeys
 */

test.describe("Album Management", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);

    // Ensure we're authenticated for these tests
    await helpers.navigateToPage("/dashboard");
    await helpers.verifyAuthenticated();
  });

  test.describe("Album Creation", () => {
    test("should create new album with basic information", async ({ page }) => {
      await helpers.navigateToPage("/albums/new");

      // Verify album creation page
      await helpers.verifyPageTitle("Create Album");

      // Fill album form
      const albumTitle = `E2E Test Album ${Date.now()}`;
      await helpers.fillField("title", albumTitle);
      await helpers.fillField(
        "description",
        "This is a test album created by E2E tests"
      );
      await helpers.fillField("country", "United States");
      await helpers.fillField("city", "San Francisco");

      // Set privacy
      await helpers.selectFromDropdown(
        '[data-testid="privacy-select"]',
        "Public"
      );

      // Submit form
      await helpers.clickButton("Create Album");

      // Verify success
      await helpers.verifySuccessMessage();
      await helpers.waitForUrl(/.*\/albums\/[^/]+$/);

      // Verify album details page
      await expect(page.locator("h1")).toContainText(albumTitle);
    });

    test("should validate required fields", async ({ page }) => {
      await helpers.navigateToPage("/albums/new");

      // Submit empty form
      await helpers.clickButton("Create Album");

      // Verify validation errors
      await helpers.verifyErrorMessage();
    });

    test("should create album with tags", async ({ page }) => {
      await helpers.navigateToPage("/albums/new");

      const albumTitle = `Tagged Album ${Date.now()}`;
      await helpers.fillField("title", albumTitle);
      await helpers.fillField("description", "Album with tags");
      await helpers.fillField("country", "Japan");
      await helpers.fillField("city", "Tokyo");

      // Add tags
      await helpers.fillField("tags", "travel,adventure,city");

      await helpers.clickButton("Create Album");

      // Verify success and tags
      await helpers.verifySuccessMessage();
      await helpers.waitForUrl(/.*\/albums\/[^/]+$/);

      // Verify tags are displayed
      await expect(page.locator('[data-testid="album-tags"]')).toBeVisible();
    });

    test("should handle location autocomplete", async ({ page }) => {
      await helpers.navigateToPage("/albums/new");

      // Type in country field to trigger autocomplete
      await page.fill('input[name="country"]', "United");

      // Wait for and verify autocomplete suggestions
      await expect(
        page.locator('[data-testid="country-suggestions"]')
      ).toBeVisible();

      // Select suggestion
      await page.click('text="United States"');

      // Verify selection
      await expect(page.locator('input[name="country"]')).toHaveValue(
        "United States"
      );
    });
  });

  test.describe("Album Editing", () => {
    test("should edit existing album", async ({ page }) => {
      // First create an album to edit
      await helpers.navigateToPage("/albums/new");

      const originalTitle = `Editable Album ${Date.now()}`;
      await helpers.fillField("title", originalTitle);
      await helpers.fillField("description", "Original description");
      await helpers.fillField("country", "France");
      await helpers.fillField("city", "Paris");

      await helpers.clickButton("Create Album");
      await helpers.verifySuccessMessage();

      // Navigate to edit page
      await page.click('[data-testid="edit-album-button"]');

      // Verify edit page
      await helpers.verifyPageTitle("Edit Album");

      // Update album information
      const updatedTitle = `Updated Album ${Date.now()}`;
      await page.fill('input[name="title"]', updatedTitle);
      await page.fill('textarea[name="description"]', "Updated description");

      await helpers.clickButton("Save Changes");

      // Verify update
      await helpers.verifySuccessMessage();
      await expect(page.locator("h1")).toContainText(updatedTitle);
    });

    test("should preserve form data on validation error", async ({ page }) => {
      // Create album first
      await helpers.navigateToPage("/albums/new");

      const albumTitle = `Form Validation Album ${Date.now()}`;
      await helpers.fillField("title", albumTitle);
      await helpers.fillField("description", "Test description");
      await helpers.fillField("country", "Spain");

      await helpers.clickButton("Create Album");
      await helpers.verifySuccessMessage();

      // Edit with invalid data
      await page.click('[data-testid="edit-album-button"]');

      // Clear required field
      await page.fill('input[name="title"]', "");
      await page.fill(
        'textarea[name="description"]',
        "Updated description that should be preserved"
      );

      await helpers.clickButton("Save Changes");

      // Verify validation error and form preservation
      await helpers.verifyErrorMessage();
      await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Updated description that should be preserved"
      );
    });
  });

  test.describe("Album Viewing", () => {
    test("should display album details correctly", async ({ page }) => {
      // Navigate to albums list
      await helpers.navigateToPage("/albums");

      // Click on first album
      await page.locator('[data-testid="album-card"]').first().click();

      // Verify album details page
      await expect(page.locator("h1")).toBeVisible();
      await expect(
        page.locator('[data-testid="album-description"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="album-location"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="album-date"]')).toBeVisible();
    });

    test("should show album photos", async ({ page }) => {
      await helpers.navigateToPage("/albums");

      // Find album with photos
      const albumWithPhotos = page
        .locator('[data-testid="album-card"]')
        .filter({ hasText: /\d+ photo/i })
        .first();
      await albumWithPhotos.click();

      // Verify photos section
      await expect(page.locator('[data-testid="album-photos"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="photo-thumbnail"]').first()
      ).toBeVisible();
    });

    test("should handle empty album gracefully", async ({ page }) => {
      // Create new album (will be empty)
      await helpers.navigateToPage("/albums/new");

      const albumTitle = `Empty Album ${Date.now()}`;
      await helpers.fillField("title", albumTitle);
      await helpers.fillField("description", "This album has no photos yet");
      await helpers.fillField("country", "Canada");

      await helpers.clickButton("Create Album");
      await helpers.verifySuccessMessage();

      // Verify empty state
      await expect(
        page.locator('[data-testid="empty-album-message"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="add-photos-button"]')
      ).toBeVisible();
    });
  });

  test.describe("Album Privacy", () => {
    test("should create private album", async ({ page }) => {
      await helpers.navigateToPage("/albums/new");

      const albumTitle = `Private Album ${Date.now()}`;
      await helpers.fillField("title", albumTitle);
      await helpers.fillField("description", "This is a private album");
      await helpers.fillField("country", "Australia");

      // Set privacy to private
      await helpers.selectFromDropdown(
        '[data-testid="privacy-select"]',
        "Private"
      );

      await helpers.clickButton("Create Album");
      await helpers.verifySuccessMessage();

      // Verify privacy indicator
      await expect(
        page.locator('[data-testid="privacy-indicator"]')
      ).toContainText("Private");
    });

    test("should show privacy options correctly", async ({ page }) => {
      await helpers.navigateToPage("/albums/new");

      // Click privacy dropdown
      await page.click('[data-testid="privacy-select"]');

      // Verify all privacy options are available
      await expect(page.locator('text="Public"')).toBeVisible();
      await expect(page.locator('text="Friends Only"')).toBeVisible();
      await expect(page.locator('text="Private"')).toBeVisible();
    });
  });

  test.describe("Album List", () => {
    test("should display user's albums", async ({ page }) => {
      await helpers.navigateToPage("/albums");

      // Verify albums page
      await helpers.verifyPageTitle("My Albums");

      // Verify album cards are displayed
      await expect(
        page.locator('[data-testid="album-card"]')
      ).toHaveCountGreaterThan(0);
    });

    test("should filter albums by search", async ({ page }) => {
      await helpers.navigateToPage("/albums");

      // Use search functionality
      await helpers.fillField("search", "test");

      // Verify search results
      await expect(page.locator('[data-testid="album-card"]')).toBeVisible();
    });

    test("should sort albums", async ({ page }) => {
      await helpers.navigateToPage("/albums");

      // Test sort functionality
      await helpers.selectFromDropdown(
        '[data-testid="sort-select"]',
        "Newest First"
      );

      // Verify sorting applied (albums should be reordered)
      await expect(
        page.locator('[data-testid="album-card"]').first()
      ).toBeVisible();
    });

    test("should paginate albums", async ({ page }) => {
      await helpers.navigateToPage("/albums");

      // Check if pagination exists (if there are enough albums)
      const paginationExists = await page
        .locator('[data-testid="pagination"]')
        .isVisible()
        .catch(() => false);

      if (paginationExists) {
        // Test pagination
        await page.click('[data-testid="next-page"]');
        await helpers.waitForAppLoad();

        // Verify page changed
        await expect(page.locator('[data-testid="album-card"]')).toBeVisible();
      }
    });
  });

  test.describe("Album Deletion", () => {
    test("should delete album with confirmation", async ({ page }) => {
      // Create album to delete
      await helpers.navigateToPage("/albums/new");

      const albumTitle = `Deletable Album ${Date.now()}`;
      await helpers.fillField("title", albumTitle);
      await helpers.fillField("description", "This album will be deleted");
      await helpers.fillField("country", "Germany");

      await helpers.clickButton("Create Album");
      await helpers.verifySuccessMessage();

      // Delete album
      await page.click('[data-testid="album-menu-button"]');
      await page.click('[data-testid="delete-album-option"]');

      // Confirm deletion
      await expect(
        page.locator('[data-testid="delete-confirmation"]')
      ).toBeVisible();
      await helpers.clickButton("Delete Album");

      // Verify deletion
      await helpers.verifySuccessMessage();
      await helpers.waitForUrl(/.*\/albums$/);
    });

    test("should cancel album deletion", async ({ page }) => {
      await helpers.navigateToPage("/albums");

      // Find an album to attempt deletion
      await page.locator('[data-testid="album-card"]').first().click();

      // Open delete dialog
      await page.click('[data-testid="album-menu-button"]');
      await page.click('[data-testid="delete-album-option"]');

      // Cancel deletion
      await expect(
        page.locator('[data-testid="delete-confirmation"]')
      ).toBeVisible();
      await helpers.clickButton("Cancel");

      // Verify dialog closed and album still exists
      await expect(
        page.locator('[data-testid="delete-confirmation"]')
      ).not.toBeVisible();
      await expect(page.locator("h1")).toBeVisible(); // Album title should still be there
    });
  });

  test.describe("Photo Management", () => {
    test("should show add photos interface", async ({ page }) => {
      await helpers.navigateToPage("/albums");
      await page.locator('[data-testid="album-card"]').first().click();

      // Click add photos
      await helpers.clickButton("Add Photos");

      // Verify upload interface
      await expect(
        page.locator('[data-testid="photo-upload-area"]')
      ).toBeVisible();
    });

    test("should display photo upload validation", async ({ page }) => {
      await helpers.navigateToPage("/albums");
      await page.locator('[data-testid="album-card"]').first().click();

      await helpers.clickButton("Add Photos");

      // Test file type validation would go here
      // Note: Actual file upload testing may require mock files
      await expect(
        page.locator('[data-testid="upload-instructions"]')
      ).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("album creation form should be accessible", async ({ page }) => {
      await helpers.navigateToPage("/albums/new");

      // Verify form accessibility
      await helpers.verifyAccessibility('input[name="title"]');
      await helpers.verifyAccessibility('textarea[name="description"]');
      await helpers.verifyAccessibility('input[name="country"]');
      await helpers.verifyAccessibility('button[type="submit"]');
    });

    test("album cards should be accessible", async ({ page }) => {
      await helpers.navigateToPage("/albums");

      // Verify album cards have proper accessibility
      await helpers.verifyAccessibility('[data-testid="album-card"]');

      // Verify keyboard navigation
      await page.keyboard.press("Tab");
      await expect(
        page.locator('[data-testid="album-card"]').first()
      ).toBeFocused();
    });
  });

  test.describe("Responsive Design", () => {
    test("should work on mobile devices", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await helpers.navigateToPage("/albums");

      // Verify mobile layout
      await expect(
        page.locator('[data-testid="mobile-album-grid"]')
      ).toBeVisible();

      // Test mobile navigation
      await page.locator('[data-testid="album-card"]').first().click();
      await expect(page.locator("h1")).toBeVisible();
    });

    test("should adapt to tablet size", async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await helpers.navigateToPage("/albums");

      // Verify tablet layout
      await expect(page.locator('[data-testid="album-grid"]')).toBeVisible();

      // Verify form layouts work on tablet
      await helpers.navigateToPage("/albums/new");
      await expect(page.locator('input[name="title"]')).toBeVisible();
    });
  });
});
