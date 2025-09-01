import { Page, Locator, expect } from "@playwright/test";

/**
 * Test utilities and helpers for E2E tests
 * Provides reusable functions for common test operations
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for the application to be fully loaded
   */
  async waitForAppLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
    // Wait for any loading spinners to disappear
    await this.page
      .waitForSelector('[data-testid="loading"]', {
        state: "detached",
        timeout: 10000,
      })
      .catch(() => {
        // Loading spinner might not exist, which is fine
      });
  }

  /**
   * Navigate to a specific page and wait for it to load
   */
  async navigateToPage(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForAppLoad();
  }

  /**
   * Fill a form field by label or placeholder
   */
  async fillField(identifier: string, value: string): Promise<void> {
    const field = this.page
      .getByLabel(identifier)
      .or(this.page.getByPlaceholder(identifier))
      .or(this.page.locator(`[name="${identifier}"]`))
      .or(this.page.locator(`[data-testid="${identifier}"]`));

    await expect(field).toBeVisible();
    await field.fill(value);
  }

  /**
   * Click a button by text, role, or test id
   */
  async clickButton(identifier: string): Promise<void> {
    const button = this.page
      .getByRole("button", { name: identifier })
      .or(this.page.getByText(identifier))
      .or(this.page.locator(`[data-testid="${identifier}"]`));

    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Verify page title or heading
   */
  async verifyPageTitle(title: string): Promise<void> {
    await expect(
      this.page.locator("h1, title, [data-testid='page-title']").first()
    ).toContainText(title);
  }

  /**
   * Wait for and verify a success message
   */
  async verifySuccessMessage(message?: string): Promise<void> {
    const successLocator = this.page
      .locator('[data-testid="success-message"]')
      .or(this.page.locator(".success"))
      .or(this.page.locator('[role="alert"]'))
      .or(this.page.locator(".toast"));

    await expect(successLocator).toBeVisible({ timeout: 10000 });

    if (message) {
      await expect(successLocator).toContainText(message);
    }
  }

  /**
   * Wait for and verify an error message
   */
  async verifyErrorMessage(message?: string): Promise<void> {
    const errorLocator = this.page
      .locator('[data-testid="error-message"]')
      .or(this.page.locator(".error"))
      .or(this.page.locator('[role="alert"]'))
      .or(this.page.locator(".toast"));

    await expect(errorLocator).toBeVisible({ timeout: 10000 });

    if (message) {
      await expect(errorLocator).toContainText(message);
    }
  }

  /**
   * Upload a file to a file input
   */
  async uploadFile(inputSelector: string, filePath: string): Promise<void> {
    const fileInput = this.page.locator(inputSelector);
    await expect(fileInput).toBeVisible();
    await fileInput.setInputFiles(filePath);
  }

  /**
   * Verify user is authenticated
   */
  async verifyAuthenticated(): Promise<void> {
    await expect(
      this.page
        .locator("[data-testid='user-menu']")
        .or(this.page.locator("[data-testid='profile-button']"))
        .or(this.page.getByRole("button", { name: /profile|account|logout/i }))
    ).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify user is not authenticated
   */
  async verifyNotAuthenticated(): Promise<void> {
    await expect(
      this.page
        .locator("text=Sign in")
        .or(this.page.locator("text=Log in"))
        .or(this.page.locator("text=Get Started"))
    ).toBeVisible({ timeout: 10000 });
  }

  /**
   * Mock API response for testing
   */
  async mockApiResponse(
    pattern: string,
    response: any,
    status = 200
  ): Promise<void> {
    await this.page.route(pattern, (route) => {
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Take a screenshot with timestamp
   */
  async takeScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await this.page.screenshot({
      path: `e2e/screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    });
  }

  /**
   * Scroll to element and ensure it's visible
   */
  async scrollToElement(selector: string): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.scrollIntoViewIfNeeded();
    await expect(element).toBeVisible();
    return element;
  }

  /**
   * Wait for URL to match pattern
   */
  async waitForUrl(pattern: string | RegExp, timeout = 15000): Promise<void> {
    await this.page.waitForURL(pattern, { timeout });
  }

  /**
   * Get table row by text content
   */
  getTableRow(text: string): Locator {
    return this.page.locator("tr").filter({ hasText: text });
  }

  /**
   * Verify table contains row with text
   */
  async verifyTableContains(text: string): Promise<void> {
    await expect(this.getTableRow(text)).toBeVisible();
  }

  /**
   * Select option from dropdown
   */
  async selectFromDropdown(
    dropdownSelector: string,
    optionText: string
  ): Promise<void> {
    await this.page.locator(dropdownSelector).click();
    await this.page.locator(`text=${optionText}`).click();
  }

  /**
   * Wait for element to be visible and enabled
   */
  async waitForInteractable(selector: string): Promise<Locator> {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();
    await expect(element).toBeEnabled();
    return element;
  }

  /**
   * Verify accessibility by checking for ARIA labels and roles
   */
  async verifyAccessibility(selector: string): Promise<void> {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();

    // Check if element has proper accessibility attributes
    const hasAriaLabel = await element
      .getAttribute("aria-label")
      .then(Boolean)
      .catch(() => false);
    const hasRole = await element
      .getAttribute("role")
      .then(Boolean)
      .catch(() => false);
    const hasAlt = await element
      .getAttribute("alt")
      .then(Boolean)
      .catch(() => false);

    // At least one accessibility attribute should be present for interactive elements
    const isButton = await element.evaluate((el) => el.tagName === "BUTTON");
    const isInput = await element.evaluate((el) => el.tagName === "INPUT");
    const isImg = await element.evaluate((el) => el.tagName === "IMG");

    if (isButton || isInput) {
      expect(
        hasAriaLabel || hasRole,
        `Interactive element should have aria-label or role attribute`
      ).toBeTruthy();
    }

    if (isImg) {
      expect(hasAlt, `Image should have alt attribute`).toBeTruthy();
    }
  }
}
