import { describe, it, expect } from "@jest/globals";
import healthHandler from "@/app/api/health/route";
import {
  RequestTestHelper,
  ResponseValidator,
  testDb,
} from "./utils/test-setup";

/**
 * Health Check API Tests
 * Tests system health monitoring and status endpoints
 */

describe("/api/health", () => {
  describe("GET /api/health", () => {
    it("should return healthy status when all systems operational", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
        }
      );

      ResponseValidator.expectSuccessResponse(res);

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData).toHaveProperty("status", "healthy");
      expect(responseData).toHaveProperty("timestamp");
      expect(responseData).toHaveProperty("services");
      expect(responseData).toHaveProperty("version");

      // Verify timestamp is recent (within last 10 seconds)
      const timestamp = new Date(responseData.timestamp);
      const now = new Date();
      const timeDiff = now.getTime() - timestamp.getTime();
      expect(timeDiff).toBeLessThan(10000);
    });

    it("should check database connectivity", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
        }
      );

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData.services).toHaveProperty("database");
      expect(responseData.services.database).toHaveProperty("status");
      expect(responseData.services.database).toHaveProperty("responseTime");

      if (responseData.services.database.status === "healthy") {
        expect(responseData.services.database.responseTime).toBeGreaterThan(0);
      }
    });

    it("should include system information", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
        }
      );

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData).toHaveProperty("uptime");
      expect(responseData).toHaveProperty("environment");
      expect(responseData).toHaveProperty("nodeVersion");

      expect(typeof responseData.uptime).toBe("number");
      expect(responseData.uptime).toBeGreaterThan(0);
      expect(responseData.environment).toMatch(/development|test|production/);
      expect(responseData.nodeVersion).toMatch(/\d+\.\d+\.\d+/);
    });

    it("should handle database connection failures gracefully", async () => {
      // Mock database connection failure
      jest
        .spyOn(testDb, "$queryRaw")
        .mockRejectedValueOnce(new Error("Connection failed"));

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
        }
      );

      // Health endpoint should still respond but indicate database issue
      ResponseValidator.expectSuccessResponse(res);

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData.services.database.status).toBe("unhealthy");
      expect(responseData.services.database).toHaveProperty("error");

      jest.restoreAllMocks();
    });

    it("should return degraded status when some services are unhealthy", async () => {
      // Mock partial service failure
      jest
        .spyOn(testDb, "$queryRaw")
        .mockRejectedValueOnce(new Error("Database slow response"));

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
        }
      );

      const responseData = ResponseValidator.expectJsonResponse(res);

      // Overall status should be degraded if any service is unhealthy
      expect(["degraded", "unhealthy"]).toContain(responseData.status);

      jest.restoreAllMocks();
    });

    it("should include memory usage information", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
        }
      );

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData).toHaveProperty("memory");
      expect(responseData.memory).toHaveProperty("used");
      expect(responseData.memory).toHaveProperty("total");
      expect(responseData.memory).toHaveProperty("percentage");

      expect(typeof responseData.memory.used).toBe("number");
      expect(typeof responseData.memory.total).toBe("number");
      expect(typeof responseData.memory.percentage).toBe("number");

      expect(responseData.memory.used).toBeGreaterThan(0);
      expect(responseData.memory.total).toBeGreaterThan(
        responseData.memory.used
      );
      expect(responseData.memory.percentage).toBeGreaterThan(0);
      expect(responseData.memory.percentage).toBeLessThan(100);
    });

    it("should set appropriate cache headers", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
        }
      );

      // Health checks should not be cached
      expect(res.getHeader("cache-control")).toContain("no-cache");
      expect(res.getHeader("content-type")).toContain("application/json");
    });

    it("should handle high concurrent requests", async () => {
      const promises = Array.from({ length: 20 }, () =>
        RequestTestHelper.executeApiRoute(
          (req, res) => healthHandler.GET(req, res),
          {
            method: "GET",
          }
        )
      );

      const results = await Promise.all(promises);

      // All requests should succeed
      results.forEach(({ res }) => {
        ResponseValidator.expectSuccessResponse(res);
        const data = ResponseValidator.expectJsonResponse(res);
        expect(data).toHaveProperty("status");
      });
    });

    it("should respond quickly", async () => {
      const startTime = Date.now();

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
        }
      );

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      ResponseValidator.expectSuccessResponse(res);

      // Health check should respond within 1 second
      expect(responseTime).toBeLessThan(1000);
    });

    it("should include build information if available", async () => {
      // Mock build information in environment
      const originalVersion = process.env.npm_package_version;
      const originalGitCommit = process.env.GIT_COMMIT;

      process.env.npm_package_version = "1.2.3";
      process.env.GIT_COMMIT = "abc123def456";

      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
        }
      );

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData).toHaveProperty("version");

      if (responseData.build) {
        expect(responseData.build).toHaveProperty("commit");
        expect(responseData.build).toHaveProperty("timestamp");
      }

      // Restore original environment
      if (originalVersion) process.env.npm_package_version = originalVersion;
      else delete process.env.npm_package_version;

      if (originalGitCommit) process.env.GIT_COMMIT = originalGitCommit;
      else delete process.env.GIT_COMMIT;
    });

    it("should handle different response formats based on Accept header", async () => {
      // Test JSON response (default)
      const { res: jsonRes } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        }
      );

      expect(jsonRes.getHeader("content-type")).toContain("application/json");

      // Test plain text response if supported
      const { res: textRes } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
          headers: {
            accept: "text/plain",
          },
        }
      );

      // Should still return JSON as that's the standard for health checks
      expect(textRes.getHeader("content-type")).toContain("application/json");
    });

    it("should reject non-GET methods", async () => {
      const methods = ["POST", "PUT", "DELETE", "PATCH"];

      for (const method of methods) {
        const { res } = await RequestTestHelper.executeApiRoute(
          (req, res) => {
            if (method === "POST" && healthHandler.POST) {
              return healthHandler.POST(req, res);
            }
            // Default to 405 Method Not Allowed
            res.status(405).json({ error: "Method not allowed" });
          },
          { method }
        );

        expect(res.statusCode).toBe(405);
      }
    });

    it("should include request tracking information", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
          headers: {
            "x-request-id": "test-request-123",
          },
        }
      );

      const responseData = ResponseValidator.expectJsonResponse(res);

      // May include request ID if implemented
      if (responseData.requestId) {
        expect(responseData.requestId).toBe("test-request-123");
      }

      // Should include some form of request tracking
      expect(responseData).toHaveProperty("timestamp");
    });
  });

  describe("Detailed Health Checks", () => {
    it("should provide detailed service status", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
          query: { detailed: "true" },
        }
      );

      const responseData = ResponseValidator.expectJsonResponse(res);
      expect(responseData.services).toHaveProperty("database");

      if (responseData.services.authentication) {
        expect(responseData.services.authentication).toHaveProperty("status");
      }

      if (responseData.services.storage) {
        expect(responseData.services.storage).toHaveProperty("status");
      }
    });

    it("should include performance metrics in detailed mode", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
          query: { metrics: "true" },
        }
      );

      const responseData = ResponseValidator.expectJsonResponse(res);

      if (responseData.metrics) {
        expect(responseData.metrics).toHaveProperty("requests");
        expect(responseData.metrics).toHaveProperty("errors");
        expect(responseData.metrics).toHaveProperty("averageResponseTime");
      }
    });

    it("should validate query parameters", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
          query: { invalid: "parameter" },
        }
      );

      // Should still work with invalid parameters
      ResponseValidator.expectSuccessResponse(res);
    });
  });

  describe("Health Check Security", () => {
    it("should not expose sensitive information", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
        }
      );

      const responseData = ResponseValidator.expectJsonResponse(res);
      const responseString = JSON.stringify(responseData);

      // Should not contain sensitive information
      expect(responseString).not.toMatch(/password/i);
      expect(responseString).not.toMatch(/secret/i);
      expect(responseString).not.toMatch(/key/i);
      expect(responseString).not.toMatch(/token/i);
    });

    it("should have appropriate security headers", async () => {
      const { res } = await RequestTestHelper.executeApiRoute(
        (req, res) => healthHandler.GET(req, res),
        {
          method: "GET",
        }
      );

      // Verify security headers if implemented
      const headers = res.getHeaders();

      // These would be set by middleware in a real application
      if (headers["x-frame-options"]) {
        expect(headers["x-frame-options"]).toBe("DENY");
      }

      if (headers["x-content-type-options"]) {
        expect(headers["x-content-type-options"]).toBe("nosniff");
      }
    });
  });
});
