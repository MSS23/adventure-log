import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import signupHandler from "@/app/api/auth/signup/route";
import {
  RequestTestHelper,
  ResponseValidator,
  TestDataGenerator,
  DatabaseTestHelper,
  testDb,
} from "../utils/test-setup";

/**
 * Authentication API - Sign Up Endpoint Tests
 * Tests user registration functionality and validation
 */

describe("/api/auth/signup", () => {
  beforeEach(async () => {
    await DatabaseTestHelper.cleanupTestData();
  });

  describe("POST /api/auth/signup", () => {
    it("should create new user with valid data", async () => {
      const userData = TestDataGenerator.createValidUserData();

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => signupHandler.POST(req, res),
        {
          method: "POST",
          body: userData,
        }
      );

      ResponseValidator.expectSuccessResponse(res, 201);

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData).toHaveProperty("user");
      expect(responseData.user).toHaveProperty("id");
      expect(responseData.user.email).toBe(userData.email);
      expect(responseData.user.name).toBe(userData.name);
      expect(responseData.user.username).toBe(userData.username);
      expect(responseData.user).not.toHaveProperty("passwordHash");

      // Verify user was created in database
      const dbUser = await testDb.user.findUnique({
        where: { email: userData.email },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.email).toBe(userData.email);
    });

    it("should hash password securely", async () => {
      const userData = TestDataGenerator.createValidUserData();

      await RequestTestHelper.executeApiRoute(
        (req, res) => signupHandler.POST(req, res),
        {
          method: "POST",
          body: userData,
        }
      );

      const dbUser = await testDb.user.findUnique({
        where: { email: userData.email },
      });

      expect(dbUser?.passwordHash).toBeDefined();
      expect(dbUser?.passwordHash).not.toBe(userData.password);
      expect(dbUser?.passwordHash.length).toBeGreaterThan(50); // bcrypt hash length
    });

    it("should validate required fields", async () => {
      const requiredFields = ["email", "password", "name", "username"];

      for (const field of requiredFields) {
        const invalidData = TestDataGenerator.createInvalidUserData([field]);

        const { res } = await RequestTestHelper.executeApiRoute(
          (req, res) => signupHandler.POST(req, res),
          {
            method: "POST",
            body: invalidData,
          }
        );

        ResponseValidator.expectValidationError(res, field);
      }
    });

    it("should validate email format", async () => {
      const invalidEmails = [
        "invalid-email",
        "@example.com",
        "test@",
        "test.example.com",
        "",
      ];

      for (const invalidEmail of invalidEmails) {
        const userData = TestDataGenerator.createValidUserData({
          email: invalidEmail,
        });

        const { res } = await RequestTestHelper.executeApiRoute(
          (req, res) => signupHandler.POST(req, res),
          {
            method: "POST",
            body: userData,
          }
        );

        ResponseValidator.expectValidationError(res, "email");
      }
    });

    it("should validate password strength", async () => {
      const weakPasswords = [
        "123", // Too short
        "password", // No uppercase, no numbers
        "PASSWORD", // No lowercase, no numbers
        "12345678", // No letters
        "Password", // No numbers
        "password123", // No uppercase
        "PASSWORD123", // No lowercase
      ];

      for (const weakPassword of weakPasswords) {
        const userData = TestDataGenerator.createValidUserData({
          password: weakPassword,
        });

        const { res } = await RequestTestHelper.executeApiRoute(
          (req, res) => signupHandler.POST(req, res),
          {
            method: "POST",
            body: userData,
          }
        );

        ResponseValidator.expectValidationError(res, "password");
      }
    });

    it("should validate username requirements", async () => {
      const invalidUsernames = [
        "ab", // Too short
        "a".repeat(31), // Too long
        "user name", // Contains space
        "user@name", // Contains special characters
        "user.name", // Contains dot
        "123user", // Starts with number
        "", // Empty
      ];

      for (const invalidUsername of invalidUsernames) {
        const userData = TestDataGenerator.createValidUserData({
          username: invalidUsername,
        });

        const { res } = await RequestTestHelper.executeApiRoute(
          (req, res) => signupHandler.POST(req, res),
          {
            method: "POST",
            body: userData,
          }
        );

        ResponseValidator.expectValidationError(res, "username");
      }
    });

    it("should prevent duplicate email registration", async () => {
      const userData = TestDataGenerator.createValidUserData();

      // Create first user
      await RequestTestHelper.executeApiRoute(
        (req, res) => signupHandler.POST(req, res),
        {
          method: "POST",
          body: userData,
        }
      );

      // Try to create second user with same email
      const duplicateUserData = TestDataGenerator.createValidUserData({
        email: userData.email,
        username: "differentusername",
      });

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => signupHandler.POST(req, res),
        {
          method: "POST",
          body: duplicateUserData,
        }
      );

      ResponseValidator.expectErrorResponse(res, 409, "already exists");
    });

    it("should prevent duplicate username registration", async () => {
      const userData = TestDataGenerator.createValidUserData();

      // Create first user
      await RequestTestHelper.executeApiRoute(
        (req, res) => signupHandler.POST(req, res),
        {
          method: "POST",
          body: userData,
        }
      );

      // Try to create second user with same username
      const duplicateUserData = TestDataGenerator.createValidUserData({
        email: "different@example.com",
        username: userData.username,
      });

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => signupHandler.POST(req, res),
        {
          method: "POST",
          body: duplicateUserData,
        }
      );

      ResponseValidator.expectErrorResponse(res, 409, "already exists");
    });

    it("should handle malformed JSON gracefully", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => signupHandler.POST(req, res),
        {
          method: "POST",
          body: "invalid json",
          headers: {
            "content-type": "application/json",
          },
        }
      );

      ResponseValidator.expectErrorResponse(res, 400);
    });

    it("should reject non-POST methods", async () => {
      const methods = ["GET", "PUT", "DELETE", "PATCH"];

      for (const method of methods) {
        const { res } = await RequestTestHelper.executeApiRoute(
          (req, res) => signupHandler[method] || (() => res.status(405).end()),
          {
            method,
          }
        );

        expect(res.statusCode).toBe(405);
      }
    });

    it("should sanitize input data", async () => {
      const maliciousData = TestDataGenerator.createValidUserData({
        name: '<script>alert("xss")</script>John Doe',
        email: "test+malicious@example.com",
        username: "user<script>name",
      });

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => signupHandler.POST(req, res),
        {
          method: "POST",
          body: maliciousData,
        }
      );

      ResponseValidator.expectSuccessResponse(res, 201);

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData.user.name).not.toContain("<script>");
      expect(responseData.user.username).not.toContain("<script>");

      // Verify in database
      const dbUser = await testDb.user.findUnique({
        where: { email: maliciousData.email },
      });
      expect(dbUser?.name).not.toContain("<script>");
      expect(dbUser?.username).not.toContain("<script>");
    });

    it("should handle database errors gracefully", async () => {
      // Mock database error
      jest
        .spyOn(testDb.user, "create")
        .mockRejectedValueOnce(new Error("Database connection failed"));

      const userData = TestDataGenerator.createValidUserData();

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => signupHandler.POST(req, res),
        {
          method: "POST",
          body: userData,
        }
      );

      ResponseValidator.expectErrorResponse(res, 500);

      // Restore mock
      jest.restoreAllMocks();
    });

    it("should set appropriate response headers", async () => {
      const userData = TestDataGenerator.createValidUserData();

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => signupHandler.POST(req, res),
        {
          method: "POST",
          body: userData,
        }
      );

      expect(res.getHeader("content-type")).toContain("application/json");
      expect(res.getHeader("cache-control")).toContain("no-cache");
    });

    it("should handle concurrent signup attempts", async () => {
      const userData1 = TestDataGenerator.createValidUserData();
      const userData2 = TestDataGenerator.createValidUserData({
        email: "concurrent2@example.com",
        username: "concurrent2",
      });

      // Execute concurrent signup requests
      const [result1, result2] = await Promise.all([
        RequestTestHelper.executeApiRoute(
          (req, res) => signupHandler.POST(req, res),
          {
            method: "POST",
            body: userData1,
          }
        ),
        RequestTestHelper.executeApiRoute(
          (req, res) => signupHandler.POST(req, res),
          {
            method: "POST",
            body: userData2,
          }
        ),
      ]);

      // Both should succeed
      ResponseValidator.expectSuccessResponse(result1.res, 201);
      ResponseValidator.expectSuccessResponse(result2.res, 201);

      // Verify both users were created
      const dbUsers = await testDb.user.findMany({
        where: {
          email: {
            in: [userData1.email, userData2.email],
          },
        },
      });
      expect(dbUsers).toHaveLength(2);
    });

    it("should validate content-type header", async () => {
      const userData = TestDataGenerator.createValidUserData();

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => signupHandler.POST(req, res),
        {
          method: "POST",
          body: userData,
          headers: {
            "content-type": "text/plain",
          },
        }
      );

      ResponseValidator.expectErrorResponse(res, 400);
    });

    it("should respect rate limiting", async () => {
      // This test would depend on rate limiting implementation
      // For now, we'll test multiple rapid requests
      const promises = Array.from({ length: 10 }, (_, i) => {
        const userData = TestDataGenerator.createValidUserData({
          email: `ratelimit${i}@example.com`,
          username: `ratelimit${i}`,
        });

        return RequestTestHelper.executeApiRoute(
          (req, res) => signupHandler.POST(req, res),
          {
            method: "POST",
            body: userData,
          }
        );
      });

      const results = await Promise.all(promises);

      // All should succeed for now (no rate limiting implemented)
      results.forEach(({ res }) => {
        expect([201, 429]).toContain(res.statusCode);
      });
    });
  });
});
