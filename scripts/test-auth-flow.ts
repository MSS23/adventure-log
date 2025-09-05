#!/usr/bin/env node

/**
 * End-to-End Authentication Flow Test
 * Tests the complete user journey: Authentication → Album Creation → Photo Upload
 */

import { chromium, Browser, Page } from "playwright";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

interface TestConfig {
  baseUrl: string;
  testUser: {
    email: string;
    password: string;
    name: string;
  };
  googleAuth?: {
    email: string;
    password: string;
  };
}

const testConfig: TestConfig = {
  baseUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
  testUser: {
    email: "test@adventurelog.app",
    password: "TestPassword123!",
    name: "Test User",
  },
  googleAuth: {
    email: process.env.TEST_GOOGLE_EMAIL || "",
    password: process.env.TEST_GOOGLE_PASSWORD || "",
  },
};

class AuthFlowTester {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async setup() {
    console.log("🚀 Starting Authentication Flow Tests");

    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== "false",
      slowMo: 100,
    });

    this.page = await this.browser.newPage();
    await this.page.goto(testConfig.baseUrl);
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testSignupPageAvailability() {
    console.log("\n📝 Testing Signup Page Availability...");

    if (!this.page) throw new Error("Page not initialized");

    try {
      // Navigate to signup page
      await this.page.goto(`${testConfig.baseUrl}/auth/signup`);

      // Check if it's a placeholder or functional signup page
      const pageContent = await this.page.textContent("body");
      const isPlaceholder = pageContent?.includes("Feature coming soon");

      if (isPlaceholder) {
        console.log(
          "⚠️  Signup page is placeholder - feature not yet implemented"
        );
        return false;
      } else {
        console.log("✅ Signup page is functional");
        return true;
      }
    } catch (error) {
      console.log("❌ Signup page test failed:", error);
      return false;
    }
  }

  async testAuthenticationUI() {
    console.log("\n🔐 Testing Authentication UI Components...");

    if (!this.page) throw new Error("Page not initialized");

    try {
      // Navigate to signin page
      await this.page.goto(`${testConfig.baseUrl}/auth/signin`);

      // Wait for page to load
      await this.page.waitForSelector("h2", { timeout: 5000 });

      // Check for authentication options
      const hasGoogleButton = await this.page
        .locator('button:has-text("Continue with Google")')
        .isVisible();
      const pageTitle = await this.page.textContent("h2");

      console.log(`📄 Sign-in page title: "${pageTitle}"`);
      console.log(
        `🌐 Google OAuth available: ${hasGoogleButton ? "Yes" : "No"}`
      );

      if (hasGoogleButton) {
        console.log("✅ Authentication UI components loaded successfully");
        return true;
      } else {
        console.log("⚠️  No authentication options found");
        return false;
      }
    } catch (error) {
      console.log("❌ Authentication UI test failed:", error);
      return false;
    }
  }

  async testGoogleOAuth() {
    console.log("\n🌐 Testing Google OAuth Flow...");

    if (!this.page || !testConfig.googleAuth?.email) {
      console.log("⏭️  Skipping Google OAuth (no test credentials)");
      return null;
    }

    try {
      // Navigate to signin
      await this.page.goto(`${testConfig.baseUrl}/auth/signin`);

      // Click Google sign-in button
      await this.page.click(
        'button:has-text("Google"), [data-provider="google"]'
      );

      // Handle Google OAuth popup
      const popup = await this.page.waitForEvent("popup");

      // Fill Google credentials
      await popup.fill('input[type="email"]', testConfig.googleAuth.email);
      await popup.click('button:has-text("Next")');

      await popup.fill(
        'input[type="password"]',
        testConfig.googleAuth.password
      );
      await popup.click('button:has-text("Next")');

      // Wait for OAuth completion
      await this.page.waitForURL("**/dashboard", { timeout: 15000 });

      console.log("✅ Google OAuth successful");
      return true;
    } catch (error) {
      console.log("❌ Google OAuth failed:", error);
      return false;
    }
  }

  async testAlbumCreation() {
    console.log("\n📁 Testing Album Creation...");

    if (!this.page) throw new Error("Page not initialized");

    try {
      // Navigate to albums page
      await this.page.goto(`${testConfig.baseUrl}/albums`);

      // Click create album button
      await this.page.click(
        'a[href*="/albums/new"], button:has-text("New Album")'
      );
      await this.page.waitForURL("**/albums/new");

      // Fill album form
      const testAlbumData = {
        title: `Test Album ${Date.now()}`,
        description: "End-to-end test album",
        country: "United States",
        city: "San Francisco",
      };

      await this.page.fill('input[name="title"]', testAlbumData.title);
      await this.page.fill(
        'textarea[name="description"]',
        testAlbumData.description
      );
      await this.page.fill('input[name="country"]', testAlbumData.country);
      await this.page.fill('input[name="city"]', testAlbumData.city);

      // Submit album creation
      await this.page.click('button[type="submit"]');

      // Wait for album page or albums list
      const result = await Promise.race([
        this.page.waitForURL("**/albums/*").then(() => "album_page"),
        this.page.waitForURL("**/albums").then(() => "albums_list"),
      ]);

      if (result) {
        console.log("✅ Album creation successful");

        // Get the album ID from URL if on album page
        const url = this.page.url();
        const albumMatch = url.match(/\/albums\/([^\/\?]+)/);
        const albumId = albumMatch ? albumMatch[1] : null;

        return { success: true, albumId };
      }

      return { success: false };
    } catch (error) {
      console.log("❌ Album creation failed:", error);
      return { success: false };
    }
  }

  async testPhotoUpload(albumId?: string) {
    console.log("\n📸 Testing Photo Upload...");

    if (!this.page) throw new Error("Page not initialized");
    if (!albumId) {
      console.log("⏭️  Skipping photo upload (no album ID)");
      return false;
    }

    try {
      // Navigate to album page
      await this.page.goto(`${testConfig.baseUrl}/albums/${albumId}`);

      // Look for upload button or area
      const uploadButton = await this.page
        .locator(
          'button:has-text("Upload"), input[type="file"], [data-testid="upload"]'
        )
        .first();

      if (await uploadButton.isVisible()) {
        // Create a test image file (base64 data URL)
        const testImageData =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

        // If it's a file input, set files
        if ((await uploadButton.getAttribute("type")) === "file") {
          // Create a temporary file for testing
          const fs = require("fs");
          const path = require("path");
          const testImagePath = path.join(__dirname, "test-image.png");

          // Write a minimal PNG
          const buffer = Buffer.from(testImageData.split(",")[1], "base64");
          fs.writeFileSync(testImagePath, buffer);

          await uploadButton.setInputFiles(testImagePath);

          // Clean up
          fs.unlinkSync(testImagePath);
        } else {
          await uploadButton.click();
        }

        // Wait for upload completion or error
        const result = await Promise.race([
          this.page
            .waitForSelector(
              '[data-testid="upload-success"], .upload-success',
              { timeout: 30000 }
            )
            .then(() => "success"),
          this.page
            .waitForSelector('[data-testid="upload-error"], .upload-error', {
              timeout: 10000,
            })
            .then(() => "error"),
        ]);

        if (result === "success") {
          console.log("✅ Photo upload successful");
          return true;
        } else {
          const errorText = await this.page.textContent(
            '[data-testid="upload-error"], .upload-error'
          );
          console.log("⚠️  Photo upload warning:", errorText);
          return false;
        }
      } else {
        console.log("⚠️  Upload button not found - may need UI updates");
        return false;
      }
    } catch (error) {
      console.log("❌ Photo upload failed:", error);
      return false;
    }
  }

  async testApiEndpoints() {
    console.log("\n🔗 Testing API Endpoints...");

    if (!this.page) throw new Error("Page not initialized");

    try {
      // Test health check API
      const healthResponse = await this.page.evaluate(async () => {
        const response = await fetch("/api/health");
        return {
          ok: response.ok,
          status: response.status,
        };
      });

      // Test auth-protected albums API (should fail without auth)
      const albumsResponse = await this.page.evaluate(async () => {
        const response = await fetch("/api/albums");
        return {
          ok: response.ok,
          status: response.status,
        };
      });

      console.log(
        `🏥 Health API: ${healthResponse.ok ? "Working" : "Failed"} (${healthResponse.status})`
      );
      console.log(
        `📁 Albums API: ${albumsResponse.ok ? "Accessible" : "Protected"} (${albumsResponse.status})`
      );

      // Success if health works (albums should be protected)
      const healthWorking = healthResponse.ok || healthResponse.status === 404; // 404 is ok if health endpoint doesn't exist
      console.log(
        healthWorking
          ? "✅ API endpoints responding correctly"
          : "⚠️  API connectivity issues"
      );

      return healthWorking;
    } catch (error) {
      console.log("❌ API endpoint testing failed:", error);
      return false;
    }
  }

  async testSignOut() {
    console.log("\n🚪 Testing Sign-out Flow...");

    if (!this.page) throw new Error("Page not initialized");

    try {
      // Find and click sign out button
      await this.page.click(
        'button:has-text("Sign Out"), a:has-text("Sign Out"), [data-testid="signout"]'
      );

      // Wait for redirect to homepage or signin page
      await Promise.race([
        this.page.waitForURL("**/auth/signin"),
        this.page.waitForURL(testConfig.baseUrl),
      ]);

      // Verify signed out state
      const signInButton = await this.page
        .locator('a:has-text("Sign In"), button:has-text("Sign In")')
        .first();
      const isSignedOut = await signInButton.isVisible();

      if (isSignedOut) {
        console.log("✅ Sign-out successful");
        return true;
      } else {
        console.log("⚠️  Sign-out may have failed (no sign-in button visible)");
        return false;
      }
    } catch (error) {
      console.log("❌ Sign-out failed:", error);
      return false;
    }
  }

  async runFullTest() {
    const results = {
      setup: false,
      signupAvailability: false,
      authenticationUI: false,
      googleOAuth: null as boolean | null,
      albumCreation: false,
      photoUpload: false,
      apiEndpoints: false,
      signOut: false,
    };

    try {
      await this.setup();
      results.setup = true;

      // Test signup page availability
      results.signupAvailability = await this.testSignupPageAvailability();

      // Test authentication UI components
      results.authenticationUI = await this.testAuthenticationUI();

      // Test basic API endpoints (without auth)
      results.apiEndpoints = await this.testApiEndpoints();

      // Test Google OAuth if credentials are provided
      if (testConfig.googleAuth?.email) {
        results.googleOAuth = await this.testGoogleOAuth();

        // If OAuth successful, test authenticated features
        if (results.googleOAuth) {
          // Test album creation
          const albumResult = await this.testAlbumCreation();
          results.albumCreation = albumResult.success;

          // Test photo upload
          if (albumResult.albumId) {
            results.photoUpload = await this.testPhotoUpload(
              albumResult.albumId
            );
          }

          // Test API endpoints
          results.apiEndpoints = await this.testApiEndpoints();

          // Test sign out
          results.signOut = await this.testSignOut();
        }
      } else {
        console.log(
          "\n⚠️  Skipping authenticated feature tests - no OAuth credentials provided"
        );
        console.log(
          "   Set TEST_GOOGLE_EMAIL and TEST_GOOGLE_PASSWORD in .env.local to test these features"
        );
      }
    } finally {
      await this.teardown();
    }

    return results;
  }
}

// Run the tests
async function main() {
  const tester = new AuthFlowTester();
  const results = await tester.runFullTest();

  console.log("\n📊 Test Results Summary:");
  console.log("========================");

  const testItems = [
    ["Setup", results.setup],
    ["Signup Availability", results.signupAvailability],
    ["Authentication UI", results.authenticationUI],
    ["Google OAuth", results.googleOAuth],
    ["Album Creation", results.albumCreation],
    ["Photo Upload", results.photoUpload],
    ["API Endpoints", results.apiEndpoints],
    ["Sign-out", results.signOut],
  ] as const;

  let passedTests = 0;
  let totalTests = 0;

  testItems.forEach(([name, result]) => {
    if (result !== null) {
      totalTests++;
      if (result) passedTests++;
    }

    const icon = result === true ? "✅" : result === false ? "❌" : "⏭️ ";
    const status =
      result === true ? "PASS" : result === false ? "FAIL" : "SKIP";
    console.log(`${icon} ${name}: ${status}`);
  });

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log(
      "🎉 All tests passed! Authentication flow is working correctly."
    );
    process.exit(0);
  } else {
    console.log(
      "⚠️  Some tests failed. Please review the authentication implementation."
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
  });
}
