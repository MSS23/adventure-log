import {
  userUpdateSchema,
  albumCreateSchema,
  albumUpdateSchema,
  photoUploadSchema,
  commentCreateSchema,
  searchSchema,
  paginationSchema,
  fileUploadSchema,
} from "../validations";

describe("Validation Schemas", () => {
  describe("userUpdateSchema", () => {
    it("validates valid user update data", () => {
      const validData = {
        name: "John Doe",
        bio: "Adventure enthusiast",
        location: "San Francisco",
        website: "https://johndoe.com",
        isPublic: true,
      };

      const result = userUpdateSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it("requires name field", () => {
      const invalidData = {
        bio: "Bio without name",
        isPublic: true,
      };

      expect(() => userUpdateSchema.parse(invalidData)).toThrow();
    });

    it("validates name length constraints", () => {
      // Too short
      expect(() =>
        userUpdateSchema.parse({ name: "", isPublic: true })
      ).toThrow();

      // Too long
      expect(() =>
        userUpdateSchema.parse({
          name: "a".repeat(101),
          isPublic: true,
        })
      ).toThrow();

      // Just right
      const validName = userUpdateSchema.parse({
        name: "John Doe",
        isPublic: true,
      });
      expect(validName.name).toBe("John Doe");
    });

    it("validates website URL format", () => {
      // Invalid URL
      expect(() =>
        userUpdateSchema.parse({
          name: "John",
          website: "not-a-url",
          isPublic: true,
        })
      ).toThrow();

      // Valid URL
      const result = userUpdateSchema.parse({
        name: "John",
        website: "https://example.com",
        isPublic: true,
      });
      expect(result.website).toBe("https://example.com");

      // Empty string should be allowed
      const resultEmpty = userUpdateSchema.parse({
        name: "John",
        website: "",
        isPublic: true,
      });
      expect(resultEmpty.website).toBe("");
    });

    it("validates bio length constraint", () => {
      expect(() =>
        userUpdateSchema.parse({
          name: "John",
          bio: "a".repeat(501),
          isPublic: true,
        })
      ).toThrow();
    });
  });

  describe("albumCreateSchema", () => {
    it("validates valid album data", () => {
      const validData = {
        title: "My Amazing Trip",
        description: "A wonderful adventure",
        country: "United States",
        city: "San Francisco",
        latitude: 37.7749,
        longitude: -122.4194,
        privacy: "PUBLIC" as const,
        tags: ["adventure", "city"],
      };

      const result = albumCreateSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it("requires title and country", () => {
      expect(() =>
        albumCreateSchema.parse({ description: "Missing title and country" })
      ).toThrow();
    });

    it("validates coordinate ranges", () => {
      const baseData = {
        title: "Test",
        country: "Test Country",
      };

      // Invalid latitude (too high)
      expect(() =>
        albumCreateSchema.parse({ ...baseData, latitude: 91 })
      ).toThrow();

      // Invalid latitude (too low)
      expect(() =>
        albumCreateSchema.parse({ ...baseData, latitude: -91 })
      ).toThrow();

      // Invalid longitude (too high)
      expect(() =>
        albumCreateSchema.parse({ ...baseData, longitude: 181 })
      ).toThrow();

      // Invalid longitude (too low)
      expect(() =>
        albumCreateSchema.parse({ ...baseData, longitude: -181 })
      ).toThrow();

      // Valid coordinates
      const result = albumCreateSchema.parse({
        ...baseData,
        latitude: 45.5,
        longitude: -122.3,
      });
      expect(result.latitude).toBe(45.5);
      expect(result.longitude).toBe(-122.3);
    });

    it("validates privacy enum", () => {
      const baseData = {
        title: "Test",
        country: "Test Country",
      };

      // Invalid privacy
      expect(() =>
        albumCreateSchema.parse({ ...baseData, privacy: "INVALID" })
      ).toThrow();

      // Valid privacy options
      const publicResult = albumCreateSchema.parse({
        ...baseData,
        privacy: "PUBLIC",
      });
      expect(publicResult.privacy).toBe("PUBLIC");

      const privateResult = albumCreateSchema.parse({
        ...baseData,
        privacy: "PRIVATE",
      });
      expect(privateResult.privacy).toBe("PRIVATE");
    });

    it("validates tags array constraints", () => {
      const baseData = {
        title: "Test",
        country: "Test Country",
      };

      // Too many tags
      expect(() =>
        albumCreateSchema.parse({
          ...baseData,
          tags: Array(21).fill("tag"),
        })
      ).toThrow();

      // Tag too long
      expect(() =>
        albumCreateSchema.parse({
          ...baseData,
          tags: ["a".repeat(51)],
        })
      ).toThrow();

      // Valid tags
      const result = albumCreateSchema.parse({
        ...baseData,
        tags: ["adventure", "travel", "photography"],
      });
      expect(result.tags).toHaveLength(3);
    });

    it("sets default values correctly", () => {
      const minimalData = {
        title: "Test",
        country: "Test Country",
      };

      const result = albumCreateSchema.parse(minimalData);
      expect(result.privacy).toBe("PUBLIC");
      expect(result.tags).toEqual([]);
    });
  });

  describe("commentCreateSchema", () => {
    it("validates valid comment data", () => {
      const validData = {
        content: "Great photo!",
        targetType: "Album" as const,
        targetId: "clp1234567890",
      };

      const result = commentCreateSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it("requires non-empty content", () => {
      expect(() =>
        commentCreateSchema.parse({
          content: "",
          targetType: "Album",
          targetId: "clp1234567890",
        })
      ).toThrow();
    });

    it("validates content length", () => {
      const baseData = {
        targetType: "Album" as const,
        targetId: "clp1234567890",
      };

      // Too long
      expect(() =>
        commentCreateSchema.parse({
          ...baseData,
          content: "a".repeat(1001),
        })
      ).toThrow();

      // Just right
      const result = commentCreateSchema.parse({
        ...baseData,
        content: "Perfect length comment",
      });
      expect(result.content).toBe("Perfect length comment");
    });

    it("validates targetType enum", () => {
      const baseData = {
        content: "Test comment",
        targetId: "clp1234567890",
      };

      // Invalid target type
      expect(() =>
        commentCreateSchema.parse({
          ...baseData,
          targetType: "InvalidType",
        })
      ).toThrow();

      // Valid target types
      expect(
        commentCreateSchema.parse({
          ...baseData,
          targetType: "Album",
        }).targetType
      ).toBe("Album");

      expect(
        commentCreateSchema.parse({
          ...baseData,
          targetType: "AlbumPhoto",
        }).targetType
      ).toBe("AlbumPhoto");
    });
  });

  describe("searchSchema", () => {
    it("sets default values correctly", () => {
      const result = searchSchema.parse({ query: "test" });
      expect(result.type).toBe("all");
      expect(result.limit).toBe(20);
      expect(result.page).toBe(1);
    });

    it("validates query length constraints", () => {
      // Too long
      expect(() => searchSchema.parse({ query: "a".repeat(101) })).toThrow();

      // Empty (too short)
      expect(() => searchSchema.parse({ query: "" })).toThrow();

      // Valid
      const result = searchSchema.parse({ query: "adventure" });
      expect(result.query).toBe("adventure");
    });

    it("validates numeric constraints", () => {
      const baseData = { query: "test" };

      // Invalid limit (too high)
      expect(() => searchSchema.parse({ ...baseData, limit: 51 })).toThrow();

      // Invalid page (too low)
      expect(() => searchSchema.parse({ ...baseData, page: 0 })).toThrow();

      // Valid values
      const result = searchSchema.parse({
        ...baseData,
        limit: 10,
        page: 2,
      });
      expect(result.limit).toBe(10);
      expect(result.page).toBe(2);
    });
  });

  describe("paginationSchema", () => {
    it("sets default values correctly", () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("validates constraints", () => {
      // Invalid page
      expect(() => paginationSchema.parse({ page: 0 })).toThrow();

      // Invalid limit (too high)
      expect(() => paginationSchema.parse({ limit: 101 })).toThrow();

      // Valid values
      const result = paginationSchema.parse({ page: 5, limit: 50 });
      expect(result.page).toBe(5);
      expect(result.limit).toBe(50);
    });
  });

  describe("photoUploadSchema", () => {
    it("validates optional fields", () => {
      const validData = {
        caption: "Beautiful sunset",
        latitude: 37.7749,
        longitude: -122.4194,
      };

      const result = photoUploadSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it("allows empty object", () => {
      const result = photoUploadSchema.parse({});
      expect(result).toEqual({});
    });

    it("validates coordinate ranges when provided", () => {
      // Invalid latitude
      expect(() => photoUploadSchema.parse({ latitude: 100 })).toThrow();

      // Invalid longitude
      expect(() => photoUploadSchema.parse({ longitude: -200 })).toThrow();
    });

    it("validates caption length", () => {
      expect(() =>
        photoUploadSchema.parse({
          caption: "a".repeat(501),
        })
      ).toThrow();

      const result = photoUploadSchema.parse({
        caption: "Valid length caption",
      });
      expect(result.caption).toBe("Valid length caption");
    });
  });

  describe("fileUploadSchema", () => {
    it("validates file type enum", () => {
      const mockFile = new File(["content"], "test.jpg", {
        type: "image/jpeg",
      });

      // Valid types
      expect(
        fileUploadSchema.parse({ file: mockFile, type: "avatar" }).type
      ).toBe("avatar");

      expect(
        fileUploadSchema.parse({ file: mockFile, type: "banner" }).type
      ).toBe("banner");

      expect(
        fileUploadSchema.parse({ file: mockFile, type: "album" }).type
      ).toBe("album");

      // Invalid type
      expect(() =>
        fileUploadSchema.parse({ file: mockFile, type: "invalid" })
      ).toThrow();
    });

    it("requires file to be File instance", () => {
      expect(() =>
        fileUploadSchema.parse({ file: "not-a-file", type: "avatar" })
      ).toThrow();

      const mockFile = new File(["content"], "test.jpg", {
        type: "image/jpeg",
      });
      const result = fileUploadSchema.parse({ file: mockFile, type: "avatar" });
      expect(result.file).toBeInstanceOf(File);
    });
  });
});
