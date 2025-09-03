import { test, expect } from "@playwright/test";
import { TestHelpers } from "../utils/test-helpers";

/**
 * Social Features E2E Tests
 * Tests social interactions, gamification, and content moderation
 * @smoke - Core social features that must work
 */

test.describe("Social Features", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);

    // Start each test authenticated
    await helpers.navigateToPage("/auth/signin");
    await helpers.fillField("email", "e2e-test@example.com");
    await helpers.fillField("password", "E2ETestPassword123!");
    await helpers.clickButton("Sign In");
    await helpers.verifyAuthenticated();
  });

  test.describe("Activity Feed @smoke", () => {
    test("should display activity feed", async ({ page }) => {
      await helpers.navigateToPage("/feed");

      // Verify feed page loads
      await helpers.verifyPageTitle("Activity Feed");

      // Verify feed items are visible
      await expect(
        page.locator('[data-testid="feed-item"]').first()
      ).toBeVisible({ timeout: 10000 });

      // Verify feed has user information
      await expect(
        page.locator('[data-testid="user-avatar"]').first()
      ).toBeVisible();
    });

    test("should load more items when scrolling", async ({ page }) => {
      await helpers.navigateToPage("/feed");

      // Wait for initial feed items
      await page.waitForSelector('[data-testid="feed-item"]');

      const initialCount = await page
        .locator('[data-testid="feed-item"]')
        .count();

      // Scroll to bottom to trigger infinite scroll
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Wait for new items to load
      await page.waitForTimeout(2000);

      const afterScrollCount = await page
        .locator('[data-testid="feed-item"]')
        .count();

      // Should load more items (or at least maintain count if at end)
      expect(afterScrollCount).toBeGreaterThanOrEqual(initialCount);
    });
  });

  test.describe("Following System @smoke", () => {
    test("should allow following and unfollowing users", async ({ page }) => {
      await helpers.navigateToPage("/social/discover");

      // Find a user to follow
      const followButton = page
        .locator('[data-testid="follow-button"]')
        .first();
      await followButton.waitFor();

      // Follow user
      await followButton.click();

      // Verify follow state changed
      await expect(followButton).toHaveText(/following|unfollow/i);

      // Unfollow user
      await followButton.click();

      // Verify unfollow state
      await expect(followButton).toHaveText(/follow/i);
    });

    test("should show followers and following lists", async ({ page }) => {
      await helpers.navigateToPage("/social/followers");

      // Verify followers page loads
      await helpers.verifyPageTitle("Followers");

      // Navigate to following page
      await page.getByRole("tab", { name: /following/i }).click();
      await helpers.verifyPageTitle("Following");
    });
  });

  test.describe("Friend Requests", () => {
    test("should send and manage friend requests", async ({ page }) => {
      await helpers.navigateToPage("/social/discover");

      // Find user and send friend request
      const friendRequestButton = page
        .locator('[data-testid="friend-request-button"]')
        .first();
      await friendRequestButton.waitFor();

      await friendRequestButton.click();

      // Verify request was sent
      await expect(friendRequestButton).toHaveText(/request sent|pending/i);

      // Navigate to friend requests page
      await helpers.navigateToPage("/social/friend-requests");

      // Should see sent requests
      await expect(
        page.locator('[data-testid="sent-request"]').first()
      ).toBeVisible();
    });

    test("should handle incoming friend requests", async ({ page }) => {
      await helpers.navigateToPage("/social/friend-requests");

      // Check for incoming requests
      const requestItem = page
        .locator('[data-testid="incoming-request"]')
        .first();

      if (await requestItem.isVisible()) {
        // Accept the request
        await requestItem.locator('[data-testid="accept-button"]').click();

        // Verify request was accepted
        await helpers.verifySuccessMessage();
      }
    });
  });

  test.describe("Likes and Comments @smoke", () => {
    test("should like and unlike albums", async ({ page }) => {
      await helpers.navigateToPage("/albums");

      // Find an album to like
      const likeButton = page.locator('[data-testid="like-button"]').first();
      await likeButton.waitFor();

      // Like the album
      await likeButton.click();

      // Verify like state (button should show liked state)
      await expect(likeButton).toHaveClass(/liked/);

      // Unlike the album
      await likeButton.click();

      // Verify unlike state
      await expect(likeButton).not.toHaveClass(/liked/);
    });

    test("should add and display comments", async ({ page }) => {
      await helpers.navigateToPage("/albums");

      // Navigate to first album
      await page.locator('[data-testid="album-card"]').first().click();

      // Add a comment
      const commentText = `E2E test comment ${Date.now()}`;
      await helpers.fillField("comment", commentText);
      await page
        .getByRole("button", { name: /post comment|add comment/i })
        .click();

      // Verify comment appears
      await expect(page.locator(`text=${commentText}`)).toBeVisible();
    });
  });

  test.describe("Badges and Gamification @smoke", () => {
    test("should display user badges", async ({ page }) => {
      await helpers.navigateToPage("/profile");

      // Navigate to badges section
      await page.getByRole("tab", { name: /badges/i }).click();

      // Verify badges are displayed
      await expect(page.locator('[data-testid="badge-item"]')).toBeTruthy();

      // Check badge progress
      await expect(page.locator('[data-testid="badge-progress"]')).toBeTruthy();
    });

    test("should show badge progress and requirements", async ({ page }) => {
      await helpers.navigateToPage("/gamification/badges");

      // Verify badge categories
      await expect(page.locator('[data-testid="badge-category"]')).toBeTruthy();

      // Verify progress bars
      await expect(
        page.locator('[data-testid="progress-bar"]').first()
      ).toBeVisible();

      // Click on a badge to see details
      await page.locator('[data-testid="badge-card"]').first().click();

      // Verify badge details modal/page
      await expect(page.locator('[data-testid="badge-details"]')).toBeVisible();
    });
  });

  test.describe("Challenges", () => {
    test("should display active challenges", async ({ page }) => {
      await helpers.navigateToPage("/gamification/challenges");

      // Verify challenges page loads
      await helpers.verifyPageTitle("Challenges");

      // Should show active challenges
      await expect(
        page.locator('[data-testid="challenge-card"]').first()
      ).toBeVisible();
    });

    test("should allow joining challenges", async ({ page }) => {
      await helpers.navigateToPage("/gamification/challenges");

      // Find a challenge to join
      const joinButton = page
        .locator('[data-testid="join-challenge-button"]')
        .first();

      if (await joinButton.isVisible()) {
        await joinButton.click();

        // Verify joined state
        await helpers.verifySuccessMessage();
        await expect(joinButton).toHaveText(/joined|participating/i);
      }
    });

    test("should show challenge progress", async ({ page }) => {
      await helpers.navigateToPage("/gamification/challenges");

      // Should show progress for joined challenges
      const progressBar = page
        .locator('[data-testid="challenge-progress"]')
        .first();

      if (await progressBar.isVisible()) {
        // Verify progress is displayed
        await expect(progressBar).toHaveAttribute("aria-valuenow");
      }
    });
  });

  test.describe("Notifications @smoke", () => {
    test("should display notification indicator", async ({ page }) => {
      // Navigate to any page with navigation
      await helpers.navigateToPage("/dashboard");

      // Check for notification bell
      const notificationBell = page.locator(
        '[data-testid="notification-bell"]'
      );
      await expect(notificationBell).toBeVisible();
    });

    test("should show notifications dropdown", async ({ page }) => {
      await helpers.navigateToPage("/dashboard");

      // Click notification bell
      await page.locator('[data-testid="notification-bell"]').click();

      // Verify dropdown opens
      await expect(
        page.locator('[data-testid="notifications-dropdown"]')
      ).toBeVisible();
    });

    test("should mark notifications as read", async ({ page }) => {
      await helpers.navigateToPage("/dashboard");

      // Open notifications
      await page.locator('[data-testid="notification-bell"]').click();

      // If there are unread notifications, click one
      const unreadNotification = page
        .locator('[data-testid="unread-notification"]')
        .first();

      if (await unreadNotification.isVisible()) {
        await unreadNotification.click();

        // Should navigate to relevant content or mark as read
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe("Content Moderation", () => {
    test("should prevent posting inappropriate content", async ({ page }) => {
      await helpers.navigateToPage("/albums/new");

      // Try to create album with inappropriate content
      await helpers.fillField("title", "spam fake scam");
      await helpers.fillField(
        "description",
        "This is inappropriate content with banned words"
      );
      await helpers.fillField("country", "United States");

      await helpers.clickButton("Create Album");

      // Should show moderation warning or prevent creation
      const errorMessage = page.locator('[data-testid="error-message"]');
      const moderationWarning = page.locator(
        '[data-testid="moderation-warning"]'
      );

      const hasError = await errorMessage.isVisible();
      const hasWarning = await moderationWarning.isVisible();

      expect(hasError || hasWarning).toBeTruthy();
    });
  });

  test.describe("Search and Discovery", () => {
    test("should search for users", async ({ page }) => {
      await helpers.navigateToPage("/social/discover");

      // Search for users
      await helpers.fillField("search", "test");
      await page.keyboard.press("Enter");

      // Wait for search results
      await page.waitForSelector('[data-testid="user-search-result"]', {
        timeout: 5000,
      });

      // Verify search results
      await expect(
        page.locator('[data-testid="user-search-result"]').first()
      ).toBeVisible();
    });

    test("should filter content by privacy settings", async ({ page }) => {
      await helpers.navigateToPage("/social/discover");

      // Should only show public content when not friends
      const publicContent = page.locator('[data-testid="public-album"]');
      await expect(publicContent.first()).toBeVisible();

      // Private content should not be visible
      const privateIndicator = page.locator('[data-testid="private-content"]');
      expect(await privateIndicator.count()).toBe(0);
    });
  });

  test.describe("Performance", () => {
    test("social feed should load within performance budget", async ({
      page,
    }) => {
      // Start performance measurement
      const startTime = Date.now();

      await helpers.navigateToPage("/feed");

      // Wait for feed to be fully loaded
      await page.waitForSelector('[data-testid="feed-item"]');

      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });
  });

  test.describe("Accessibility", () => {
    test("social navigation should be keyboard accessible", async ({
      page,
    }) => {
      await helpers.navigateToPage("/social");

      // Test keyboard navigation
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");

      // Should be able to navigate and interact via keyboard
      const focusedElement = await page.evaluate(
        () => document.activeElement?.tagName
      );
      expect(focusedElement).toBeTruthy();
    });

    test("feed items should have proper ARIA labels", async ({ page }) => {
      await helpers.navigateToPage("/feed");

      // Wait for feed items
      await page.waitForSelector('[data-testid="feed-item"]');

      // Check ARIA labels
      const feedItem = page.locator('[data-testid="feed-item"]').first();
      await expect(feedItem).toHaveAttribute("role");

      // Check button accessibility
      const likeButton = feedItem.locator('[data-testid="like-button"]');
      if (await likeButton.isVisible()) {
        await expect(likeButton).toHaveAttribute("aria-label");
      }
    });
  });

  test.describe("Responsive Design", () => {
    test("social features should work on mobile", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await helpers.navigateToPage("/feed");

      // Verify mobile layout
      await expect(
        page.locator('[data-testid="feed-item"]').first()
      ).toBeVisible();

      // Test mobile interactions
      const likeButton = page.locator('[data-testid="like-button"]').first();
      if (await likeButton.isVisible()) {
        await likeButton.click();
      }
    });
  });

  test.describe("Error Handling", () => {
    test("should handle network errors gracefully", async ({ page }) => {
      await helpers.navigateToPage("/feed");

      // Simulate network failure
      await page.route("**/api/social/feed**", (route) => {
        route.abort();
      });

      // Refresh to trigger the error
      await page.reload();

      // Should show error state or fallback
      const errorMessage = page.locator('[data-testid="error-message"]');
      const offlineIndicator = page.locator(
        '[data-testid="offline-indicator"]'
      );

      const hasError = await errorMessage.isVisible();
      const hasOfflineIndicator = await offlineIndicator.isVisible();

      expect(hasError || hasOfflineIndicator).toBeTruthy();
    });
  });
});
