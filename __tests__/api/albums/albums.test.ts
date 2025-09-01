import { describe, it, expect, beforeEach } from "@jest/globals";
import albumsHandler from "@/app/api/albums/route";
import albumByIdHandler from "@/app/api/albums/[id]/route";
import {
  RequestTestHelper,
  ResponseValidator,
  TestDataGenerator,
  DatabaseTestHelper,
  testDb,
  testUser,
} from "../utils/test-setup";

/**
 * Albums API Endpoint Tests
 * Tests album CRUD operations, validation, and security
 */

describe("/api/albums", () => {
  let testAlbum: any;

  beforeEach(async () => {
    await DatabaseTestHelper.cleanupTestData();
    await DatabaseTestHelper.setupTestUser();
    testAlbum = await DatabaseTestHelper.createTestAlbum();
  });

  describe("GET /api/albums", () => {
    it("should return paginated albums for authenticated user", async () => {
      // Create multiple albums
      await Promise.all([
        DatabaseTestHelper.createTestAlbum(),
        DatabaseTestHelper.createTestAlbum(),
        DatabaseTestHelper.createTestAlbum(),
      ]);

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.GET(req, res),
        {
          method: "GET",
          authenticated: true,
          query: { page: "1", limit: "10" },
        }
      );

      ResponseValidator.expectSuccessResponse(res);
      const data = ResponseValidator.expectPaginatedResponse(res);

      expect(data.data).toBeInstanceOf(Array);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(10);

      // Verify album structure
      data.data.forEach((album: any) => {
        expect(album).toHaveProperty("id");
        expect(album).toHaveProperty("title");
        expect(album).toHaveProperty("description");
        expect(album).toHaveProperty("country");
        expect(album).toHaveProperty("privacy");
        expect(album).toHaveProperty("userId", testUser.id);
      });
    });

    it("should filter albums by search query", async () => {
      // Create albums with different titles
      await testDb.album.create({
        data: {
          ...TestDataGenerator.createValidAlbumData({
            title: "Paris Vacation 2024",
          }),
          userId: testUser.id,
        },
      });

      await testDb.album.create({
        data: {
          ...TestDataGenerator.createValidAlbumData({
            title: "Tokyo Business Trip",
          }),
          userId: testUser.id,
        },
      });

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.GET(req, res),
        {
          method: "GET",
          authenticated: true,
          query: { search: "Paris" },
        }
      );

      ResponseValidator.expectSuccessResponse(res);
      const data = ResponseValidator.expectJsonResponse(res);

      expect(data.data).toBeInstanceOf(Array);
      expect(data.data.length).toBe(1);
      expect(data.data[0].title).toContain("Paris");
    });

    it("should filter albums by country", async () => {
      await testDb.album.create({
        data: {
          ...TestDataGenerator.createValidAlbumData({ country: "France" }),
          userId: testUser.id,
        },
      });

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.GET(req, res),
        {
          method: "GET",
          authenticated: true,
          query: { country: "France" },
        }
      );

      ResponseValidator.expectSuccessResponse(res);
      const data = ResponseValidator.expectJsonResponse(res);

      expect(data.data).toBeInstanceOf(Array);
      data.data.forEach((album: any) => {
        expect(album.country).toBe("France");
      });
    });

    it("should sort albums correctly", async () => {
      const now = new Date();

      // Create albums with different dates
      await testDb.album.create({
        data: {
          ...TestDataGenerator.createValidAlbumData({ title: "Oldest" }),
          userId: testUser.id,
          date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        },
      });

      await testDb.album.create({
        data: {
          ...TestDataGenerator.createValidAlbumData({ title: "Newest" }),
          userId: testUser.id,
          date: now,
        },
      });

      // Test newest first (default)
      const { res: newestFirstRes } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.GET(req, res),
        {
          method: "GET",
          authenticated: true,
          query: { sortBy: "date", sortOrder: "desc" },
        }
      );

      const newestFirstData =
        ResponseValidator.expectJsonResponse(newestFirstRes);
      expect(newestFirstData.data[0].title).toBe("Newest");

      // Test oldest first
      const { res: oldestFirstRes } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.GET(req, res),
        {
          method: "GET",
          authenticated: true,
          query: { sortBy: "date", sortOrder: "asc" },
        }
      );

      const oldestFirstData =
        ResponseValidator.expectJsonResponse(oldestFirstRes);
      expect(oldestFirstData.data[0].title).toBe("Oldest");
    });

    it("should require authentication", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.GET(req, res),
        {
          method: "GET",
          authenticated: false,
        }
      );

      ResponseValidator.expectAuthenticationError(res);
    });

    it("should handle pagination correctly", async () => {
      // Create enough albums for multiple pages
      const albumPromises = Array.from({ length: 25 }, (_, i) =>
        testDb.album.create({
          data: {
            ...TestDataGenerator.createValidAlbumData({
              title: `Album ${i + 1}`,
            }),
            userId: testUser.id,
          },
        })
      );
      await Promise.all(albumPromises);

      // Test first page
      const { res: page1Res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.GET(req, res),
        {
          method: "GET",
          authenticated: true,
          query: { page: "1", limit: "10" },
        }
      );

      const page1Data = ResponseValidator.expectPaginatedResponse(page1Res);
      expect(page1Data.data.length).toBe(10);
      expect(page1Data.pagination.page).toBe(1);
      expect(page1Data.pagination.totalPages).toBeGreaterThan(2);

      // Test second page
      const { res: page2Res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.GET(req, res),
        {
          method: "GET",
          authenticated: true,
          query: { page: "2", limit: "10" },
        }
      );

      const page2Data = ResponseValidator.expectPaginatedResponse(page2Res);
      expect(page2Data.data.length).toBe(10);
      expect(page2Data.pagination.page).toBe(2);

      // Verify different data
      const page1Ids = page1Data.data.map((album: any) => album.id);
      const page2Ids = page2Data.data.map((album: any) => album.id);
      expect(page1Ids).not.toEqual(page2Ids);
    });
  });

  describe("POST /api/albums", () => {
    it("should create new album with valid data", async () => {
      const albumData = TestDataGenerator.createValidAlbumData();

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.POST(req, res),
        {
          method: "POST",
          authenticated: true,
          body: albumData,
        }
      );

      ResponseValidator.expectSuccessResponse(res, 201);

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData).toHaveProperty("id");
      expect(responseData.title).toBe(albumData.title);
      expect(responseData.description).toBe(albumData.description);
      expect(responseData.userId).toBe(testUser.id);

      // Verify in database
      const dbAlbum = await testDb.album.findUnique({
        where: { id: responseData.id },
      });
      expect(dbAlbum).not.toBeNull();
      expect(dbAlbum?.title).toBe(albumData.title);
    });

    it("should validate required fields", async () => {
      const requiredFields = ["title", "country"];

      for (const field of requiredFields) {
        const invalidData = TestDataGenerator.createInvalidAlbumData([field]);

        const { res } = await RequestTestHelper.executeApiRoute(
          (req, res) => albumsHandler.POST(req, res),
          {
            method: "POST",
            authenticated: true,
            body: invalidData,
          }
        );

        ResponseValidator.expectValidationError(res, field);
      }
    });

    it("should validate album title length", async () => {
      const tooLongTitle = "A".repeat(101); // Assuming 100 char limit

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.POST(req, res),
        {
          method: "POST",
          authenticated: true,
          body: TestDataGenerator.createValidAlbumData({
            title: tooLongTitle,
          }),
        }
      );

      ResponseValidator.expectValidationError(res, "title");
    });

    it("should validate coordinate bounds", async () => {
      const invalidCoordinates = [
        { latitude: 91, longitude: 0 }, // Invalid latitude
        { latitude: -91, longitude: 0 }, // Invalid latitude
        { latitude: 0, longitude: 181 }, // Invalid longitude
        { latitude: 0, longitude: -181 }, // Invalid longitude
      ];

      for (const coords of invalidCoordinates) {
        const { res } = await RequestTestHelper.executeApiRoute(
          (req, res) => albumsHandler.POST(req, res),
          {
            method: "POST",
            authenticated: true,
            body: TestDataGenerator.createValidAlbumData(coords),
          }
        );

        ResponseValidator.expectValidationError(res);
      }
    });

    it("should validate privacy setting", async () => {
      const invalidPrivacy = "INVALID_PRIVACY";

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.POST(req, res),
        {
          method: "POST",
          authenticated: true,
          body: TestDataGenerator.createValidAlbumData({
            privacy: invalidPrivacy,
          }),
        }
      );

      ResponseValidator.expectValidationError(res, "privacy");
    });

    it("should require authentication", async () => {
      const albumData = TestDataGenerator.createValidAlbumData();

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.POST(req, res),
        {
          method: "POST",
          authenticated: false,
          body: albumData,
        }
      );

      ResponseValidator.expectAuthenticationError(res);
    });

    it("should sanitize input data", async () => {
      const maliciousData = TestDataGenerator.createValidAlbumData({
        title: '<script>alert("xss")</script>Clean Title',
        description: 'Description with <img src="x" onerror="alert(1)">',
      });

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.POST(req, res),
        {
          method: "POST",
          authenticated: true,
          body: maliciousData,
        }
      );

      ResponseValidator.expectSuccessResponse(res, 201);

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData.title).not.toContain("<script>");
      expect(responseData.description).not.toContain("<img");
    });

    it("should handle duplicate album titles gracefully", async () => {
      const albumData = TestDataGenerator.createValidAlbumData({
        title: "Duplicate Title Test",
      });

      // Create first album
      await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.POST(req, res),
        {
          method: "POST",
          authenticated: true,
          body: albumData,
        }
      );

      // Create second album with same title (should be allowed)
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.POST(req, res),
        {
          method: "POST",
          authenticated: true,
          body: { ...albumData, description: "Different description" },
        }
      );

      ResponseValidator.expectSuccessResponse(res, 201);
    });
  });

  describe("GET /api/albums/[id]", () => {
    it("should return album details for authenticated user", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumByIdHandler.GET(req, res),
        {
          method: "GET",
          authenticated: true,
          query: { id: testAlbum.id },
        }
      );

      ResponseValidator.expectSuccessResponse(res);

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData.id).toBe(testAlbum.id);
      expect(responseData.title).toBe(testAlbum.title);
      expect(responseData.userId).toBe(testUser.id);
    });

    it("should include photo count and cover photo", async () => {
      // Add photos to album
      await DatabaseTestHelper.createTestPhoto(testAlbum.id);
      await DatabaseTestHelper.createTestPhoto(testAlbum.id);

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumByIdHandler.GET(req, res),
        {
          method: "GET",
          authenticated: true,
          query: { id: testAlbum.id },
        }
      );

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData).toHaveProperty("photosCount");
      expect(responseData.photosCount).toBe(2);
    });

    it("should return 404 for non-existent album", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumByIdHandler.GET(req, res),
        {
          method: "GET",
          authenticated: true,
          query: { id: nonExistentId },
        }
      );

      ResponseValidator.expectNotFoundError(res);
    });

    it("should prevent access to other users private albums", async () => {
      // Create another user and their private album
      const otherUser = await testDb.user.create({
        data: {
          email: "other@example.com",
          name: "Other User",
          username: "otheruser",
          passwordHash: "hashedpassword",
        },
      });

      const privateAlbum = await testDb.album.create({
        data: {
          ...TestDataGenerator.createValidAlbumData({
            privacy: "PRIVATE",
            title: "Private Album",
          }),
          userId: otherUser.id,
        },
      });

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumByIdHandler.GET(req, res),
        {
          method: "GET",
          authenticated: true,
          query: { id: privateAlbum.id },
        }
      );

      ResponseValidator.expectForbiddenError(res);
    });

    it("should allow access to public albums from other users", async () => {
      // Create another user and their public album
      const otherUser = await testDb.user.create({
        data: {
          email: "other@example.com",
          name: "Other User",
          username: "otheruser",
          passwordHash: "hashedpassword",
        },
      });

      const publicAlbum = await testDb.album.create({
        data: {
          ...TestDataGenerator.createValidAlbumData({
            privacy: "PUBLIC",
            title: "Public Album",
          }),
          userId: otherUser.id,
        },
      });

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumByIdHandler.GET(req, res),
        {
          method: "GET",
          authenticated: true,
          query: { id: publicAlbum.id },
        }
      );

      ResponseValidator.expectSuccessResponse(res);

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData.id).toBe(publicAlbum.id);
      expect(responseData.privacy).toBe("PUBLIC");
    });

    it("should require authentication", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumByIdHandler.GET(req, res),
        {
          method: "GET",
          authenticated: false,
          query: { id: testAlbum.id },
        }
      );

      ResponseValidator.expectAuthenticationError(res);
    });

    it("should validate album ID format", async () => {
      const invalidIds = ["invalid-id", "123", "", "not-a-uuid"];

      for (const invalidId of invalidIds) {
        const { res } = await RequestTestHelper.executeApiRoute(
          (req, res) => albumByIdHandler.GET(req, res),
          {
            method: "GET",
            authenticated: true,
            query: { id: invalidId },
          }
        );

        ResponseValidator.expectValidationError(res);
      }
    });
  });

  describe("PUT /api/albums/[id]", () => {
    it("should update album with valid data", async () => {
      const updateData = {
        title: "Updated Album Title",
        description: "Updated description",
        privacy: "PRIVATE",
      };

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumByIdHandler.PUT(req, res),
        {
          method: "PUT",
          authenticated: true,
          query: { id: testAlbum.id },
          body: updateData,
        }
      );

      ResponseValidator.expectSuccessResponse(res);

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData.title).toBe(updateData.title);
      expect(responseData.description).toBe(updateData.description);
      expect(responseData.privacy).toBe(updateData.privacy);

      // Verify in database
      const dbAlbum = await testDb.album.findUnique({
        where: { id: testAlbum.id },
      });
      expect(dbAlbum?.title).toBe(updateData.title);
    });

    it("should prevent updating other users albums", async () => {
      // Create another user and their album
      const otherUser = await testDb.user.create({
        data: {
          email: "other@example.com",
          name: "Other User",
          username: "otheruser",
          passwordHash: "hashedpassword",
        },
      });

      const otherAlbum = await testDb.album.create({
        data: {
          ...TestDataGenerator.createValidAlbumData(),
          userId: otherUser.id,
        },
      });

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumByIdHandler.PUT(req, res),
        {
          method: "PUT",
          authenticated: true,
          query: { id: otherAlbum.id },
          body: { title: "Hacked Title" },
        }
      );

      ResponseValidator.expectForbiddenError(res);
    });

    it("should validate update data", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumByIdHandler.PUT(req, res),
        {
          method: "PUT",
          authenticated: true,
          query: { id: testAlbum.id },
          body: { title: "" }, // Empty title
        }
      );

      ResponseValidator.expectValidationError(res, "title");
    });

    it("should require authentication", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumByIdHandler.PUT(req, res),
        {
          method: "PUT",
          authenticated: false,
          query: { id: testAlbum.id },
          body: { title: "New Title" },
        }
      );

      ResponseValidator.expectAuthenticationError(res);
    });
  });

  describe("DELETE /api/albums/[id]", () => {
    it("should delete album and associated photos", async () => {
      // Add photos to album first
      await DatabaseTestHelper.createTestPhoto(testAlbum.id);
      await DatabaseTestHelper.createTestPhoto(testAlbum.id);

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumByIdHandler.DELETE(req, res),
        {
          method: "DELETE",
          authenticated: true,
          query: { id: testAlbum.id },
        }
      );

      ResponseValidator.expectSuccessResponse(res, 204);

      // Verify album is deleted
      const dbAlbum = await testDb.album.findUnique({
        where: { id: testAlbum.id },
      });
      expect(dbAlbum).toBeNull();

      // Verify photos are deleted
      const dbPhotos = await testDb.albumPhoto.findMany({
        where: { albumId: testAlbum.id },
      });
      expect(dbPhotos).toHaveLength(0);
    });

    it("should prevent deleting other users albums", async () => {
      // Create another user and their album
      const otherUser = await testDb.user.create({
        data: {
          email: "other@example.com",
          name: "Other User",
          username: "otheruser",
          passwordHash: "hashedpassword",
        },
      });

      const otherAlbum = await testDb.album.create({
        data: {
          ...TestDataGenerator.createValidAlbumData(),
          userId: otherUser.id,
        },
      });

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumByIdHandler.DELETE(req, res),
        {
          method: "DELETE",
          authenticated: true,
          query: { id: otherAlbum.id },
        }
      );

      ResponseValidator.expectForbiddenError(res);

      // Verify album still exists
      const dbAlbum = await testDb.album.findUnique({
        where: { id: otherAlbum.id },
      });
      expect(dbAlbum).not.toBeNull();
    });

    it("should return 404 for non-existent album", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumByIdHandler.DELETE(req, res),
        {
          method: "DELETE",
          authenticated: true,
          query: { id: nonExistentId },
        }
      );

      ResponseValidator.expectNotFoundError(res);
    });

    it("should require authentication", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumByIdHandler.DELETE(req, res),
        {
          method: "DELETE",
          authenticated: false,
          query: { id: testAlbum.id },
        }
      );

      ResponseValidator.expectAuthenticationError(res);
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors", async () => {
      jest
        .spyOn(testDb.album, "findMany")
        .mockRejectedValueOnce(new Error("Database connection failed"));

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.GET(req, res),
        {
          method: "GET",
          authenticated: true,
        }
      );

      ResponseValidator.expectErrorResponse(res, 500);

      jest.restoreAllMocks();
    });

    it("should handle invalid JSON in request body", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => albumsHandler.POST(req, res),
        {
          method: "POST",
          authenticated: true,
          body: "invalid json",
          headers: {
            "content-type": "application/json",
          },
        }
      );

      ResponseValidator.expectErrorResponse(res, 400);
    });

    it("should handle concurrent album creation", async () => {
      const albumData = TestDataGenerator.createValidAlbumData();

      const promises = Array.from({ length: 5 }, () =>
        RequestTestHelper.executeApiRoute(
          (req, res) => albumsHandler.POST(req, res),
          {
            method: "POST",
            authenticated: true,
            body: {
              ...albumData,
              title: `${albumData.title} ${Math.random()}`,
            },
          }
        )
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(({ res }) => {
        ResponseValidator.expectSuccessResponse(res, 201);
      });
    });
  });
});
