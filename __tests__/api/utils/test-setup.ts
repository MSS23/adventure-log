import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { v4 as uuidv4 } from "uuid";

/**
 * API Testing utilities for comprehensive endpoint testing
 * Provides database setup, authentication helpers, and request mocking
 */

// Test database instance
export const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "file:./test.db",
    },
  },
});

// Test user data
export const testUser = {
  id: uuidv4(),
  email: "api-test@example.com",
  name: "API Test User" as string | null,
  username: "apitestuser" as string | null,
  password: "" as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Database setup and teardown utilities
 */
export class DatabaseTestHelper {
  static async setupTestUser(): Promise<typeof testUser> {
    const hashedPassword = await bcrypt.hash("TestPassword123!", 12);

    try {
      const user = await testDb.user.create({
        data: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
          username: testUser.username,
          password: hashedPassword,
        },
      });

      testUser.password = hashedPassword;
      return user;
    } catch (error) {
      // User might already exist, try to update
      const user = await testDb.user.update({
        where: { email: testUser.email },
        data: {
          name: testUser.name,
          username: testUser.username,
          password: hashedPassword,
        },
      });

      testUser.password = hashedPassword;
      return user;
    }
  }

  static async createTestAlbum(userId: string = testUser.id) {
    return await testDb.album.create({
      data: {
        id: uuidv4(),
        title: "Test Album",
        description: "Test album description",
        country: "United States",
        city: "San Francisco",
        latitude: 37.7749,
        longitude: -122.4194,
        privacy: "PUBLIC",
        tags: "test,api",
        userId,
        date: new Date(),
      },
    });
  }

  static async createTestPhoto(albumId: string) {
    return await testDb.albumPhoto.create({
      data: {
        id: uuidv4(),
        url: "https://example.com/test-photo.jpg",
        caption: "Test photo caption",
        albumId,
      },
    });
  }

  static async cleanupTestData(): Promise<void> {
    try {
      // Clean up in correct order due to foreign key constraints
      // Get albums first to find photos
      const userAlbums = await testDb.album.findMany({
        where: { userId: testUser.id },
        select: { id: true },
      });

      await testDb.albumPhoto.deleteMany({
        where: { albumId: { in: userAlbums.map((a) => a.id) } },
      });

      await testDb.album.deleteMany({
        where: { userId: testUser.id },
      });

      await testDb.user.deleteMany({
        where: { email: { contains: "test" } },
      });
    } catch (error) {
      console.warn("Cleanup warning:", error);
    }
  }

  static async resetDatabase(): Promise<void> {
    await this.cleanupTestData();
    await this.setupTestUser();
  }
}

/**
 * Authentication helpers for API testing
 */
export class AuthTestHelper {
  static async createValidSession(userId: string = testUser.id) {
    // Mock session token for testing
    return {
      user: {
        id: userId,
        email: testUser.email,
        name: testUser.name,
        image: null,
        username: testUser.username,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };
  }

  static mockAuthenticatedRequest(req: any, userId: string = testUser.id) {
    // Mock NextAuth session
    req.auth = {
      user: {
        id: userId,
        email: testUser.email,
        name: testUser.name,
        image: null,
        username: testUser.username,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return req;
  }

  static mockUnauthenticatedRequest(req: any) {
    req.auth = null;
    return req;
  }
}

/**
 * HTTP Request mocking utilities
 */
export class RequestTestHelper {
  static createMockRequest(
    options: {
      method?: string;
      query?: Record<string, any>;
      body?: any;
      headers?: Record<string, string>;
      authenticated?: boolean;
      userId?: string;
    } = {}
  ) {
    const {
      method = "GET",
      query = {},
      body = {},
      headers = {},
      authenticated = false,
      userId = testUser.id,
    } = options;

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: method as any,
      query,
      body,
      headers: {
        "content-type": "application/json",
        ...headers,
      },
    });

    if (authenticated) {
      AuthTestHelper.mockAuthenticatedRequest(req, userId);
    } else {
      AuthTestHelper.mockUnauthenticatedRequest(req);
    }

    return { req, res };
  }

  static async executeApiRoute(
    handler: (
      req: NextApiRequest,
      res: NextApiResponse
    ) => Promise<void> | void,
    options: Parameters<typeof RequestTestHelper.createMockRequest>[0] = {}
  ) {
    const { req, res } = this.createMockRequest(options);

    try {
      await handler(req, res);
    } catch (error) {
      // Some handlers might throw, capture this
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }

    return { req, res };
  }
}

/**
 * Response validation utilities
 */
export class ResponseValidator {
  static expectSuccessResponse(res: NextApiResponse, statusCode: number = 200) {
    expect(res.statusCode).toBe(statusCode);
    expect(res.getHeader("content-type")).toContain("application/json");
  }

  static expectErrorResponse(
    res: NextApiResponse,
    statusCode: number,
    errorMessage?: string
  ) {
    expect(res.statusCode).toBe(statusCode);
    expect(res.getHeader("content-type")).toContain("application/json");

    const data = JSON.parse((res as any)._getData());
    expect(data).toHaveProperty("error");

    if (errorMessage) {
      expect(data.error).toContain(errorMessage);
    }
  }

  static expectValidationError(res: NextApiResponse, field?: string) {
    this.expectErrorResponse(res, 400);

    const data = JSON.parse((res as any)._getData());
    expect(data).toHaveProperty("error");

    if (field) {
      expect(data.error).toContain(field);
    }
  }

  static expectAuthenticationError(res: NextApiResponse) {
    this.expectErrorResponse(res, 401, "Unauthorized");
  }

  static expectForbiddenError(res: NextApiResponse) {
    this.expectErrorResponse(res, 403, "Forbidden");
  }

  static expectNotFoundError(res: NextApiResponse) {
    this.expectErrorResponse(res, 404, "Not found");
  }

  static expectJsonResponse(res: NextApiResponse) {
    expect(res.getHeader("content-type")).toContain("application/json");

    const data = (res as any)._getData();
    expect(() => JSON.parse(data)).not.toThrow();

    return JSON.parse(data);
  }

  static expectPaginatedResponse(res: NextApiResponse) {
    const data = this.expectJsonResponse(res);

    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("pagination");
    expect(data.pagination).toHaveProperty("page");
    expect(data.pagination).toHaveProperty("limit");
    expect(data.pagination).toHaveProperty("total");
    expect(data.pagination).toHaveProperty("totalPages");

    return data;
  }
}

/**
 * Test data generators
 */
export class TestDataGenerator {
  static createValidAlbumData(overrides: Partial<any> = {}) {
    return {
      title: "Test Album",
      description: "A test album for API testing",
      country: "United States",
      city: "San Francisco",
      latitude: 37.7749,
      longitude: -122.4194,
      privacy: "PUBLIC",
      tags: "test,api,automation",
      date: new Date().toISOString(),
      ...overrides,
    };
  }

  static createInvalidAlbumData(missingFields: string[] = []) {
    const validData = this.createValidAlbumData();

    missingFields.forEach((field) => {
      delete (validData as any)[field];
    });

    return validData;
  }

  static createValidUserData(overrides: Partial<any> = {}) {
    const timestamp = Date.now();

    return {
      email: `test-${timestamp}@example.com`,
      name: "Test User",
      username: `testuser${timestamp}`,
      password: "TestPassword123!",
      ...overrides,
    };
  }

  static createValidPhotoData(overrides: Partial<any> = {}) {
    return {
      url: "https://example.com/test-photo.jpg",
      caption: "Test photo caption",
      metadata: {
        width: 1920,
        height: 1080,
        size: 1024000,
        format: "jpg",
      },
      ...overrides,
    };
  }
}

/**
 * Environment setup for API tests
 */
export class ApiTestEnvironment {
  static async setup(): Promise<void> {
    // Set test environment (using Object.defineProperty to override readonly)
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      writable: true,
    });

    // Ensure database is ready
    await DatabaseTestHelper.resetDatabase();
  }

  static async teardown(): Promise<void> {
    await DatabaseTestHelper.cleanupTestData();
    await testDb.$disconnect();
  }
}

// Global test setup and teardown
beforeAll(async () => {
  await ApiTestEnvironment.setup();
});

afterAll(async () => {
  await ApiTestEnvironment.teardown();
});

// Reset test data between tests
beforeEach(async () => {
  await DatabaseTestHelper.cleanupTestData();
  await DatabaseTestHelper.setupTestUser();
});

export default {
  DatabaseTestHelper,
  AuthTestHelper,
  RequestTestHelper,
  ResponseValidator,
  TestDataGenerator,
  ApiTestEnvironment,
  testDb,
  testUser,
};
