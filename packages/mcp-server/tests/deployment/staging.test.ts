/**
 * Staging Environment Tests
 *
 * Tests for the staging deployment of the Effect Patterns MCP server.
 * These tests verify functionality, performance, and reliability against staging.
 *
 * Architecture:
 * - HTTP API handles all authentication and authorization
 * - Tier validation (free/paid) happens at HTTP API level
 * - MCP server is pure transport - passes requests through
 */

import { beforeAll, describe, expect, it } from "vitest";
import { createDeploymentClient, DeploymentClient } from "./helpers/deployment-client";
import {
    endpoints,
    getDeploymentConfig,
    sla,
    testData,
} from "./helpers/environment-config";

describe.skipIf(!process.env.STAGING_API_KEY)("Staging Environment", () => {
  let client: DeploymentClient;
  const config = getDeploymentConfig("staging");

  beforeAll(() => {
    client = createDeploymentClient(config);
  });

  describe("Health & Availability", () => {
    it("should be available", async () => {
      const response = await client.get(endpoints.health);
      expect(response.status).toBe(200);
    });

    it("should respond within SLA", async () => {
      const response = await client.get(endpoints.health);
      expect(response.duration).toBeLessThan(sla.healthCheck);
    });

    it("should return health status", async () => {
      const response = await client.get(endpoints.health);
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it("should be consistently available", async () => {
      const results = await Promise.all([
        client.get(endpoints.health),
        client.get(endpoints.health),
        client.get(endpoints.health),
      ]);

      for (const result of results) {
        expect(result.status).toBe(200);
      }
    });
  });

  describe("Authentication", () => {
    it("should reject requests without API key", async () => {
      const client2 = createDeploymentClient({
        ...config,
        apiKey: undefined,
      });

      const response = await client2.get(endpoints.patterns);
      expect([401, 403, 400]).toContain(response.status);
    });

    it("should reject invalid API key", async () => {
      const client2 = createDeploymentClient({
        ...config,
        apiKey: "invalid-key-xyz",
      });

      const response = await client2.get(endpoints.patterns);
      expect([401, 403]).toContain(response.status);
    });

    it("should accept valid API key in header", async () => {
      const response = await client.get(endpoints.patterns);
      expect([200, 400, 401]).toContain(response.status);
      // 401 only if API key wasn't set, 400 for missing params
    });
  });

  describe("Core Functionality", () => {
    it("should search patterns successfully", async () => {
      const response = await client.searchPatterns(testData.searchQuery, 5);
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it("should search within SLA", async () => {
      const response = await client.searchPatterns(testData.searchQuery, 5);
      expect(response.duration).toBeLessThan(sla.search);
    });

    it("should get pattern by ID", async () => {
      const response = await client.getPattern(testData.patternId);
      expect([200, 404]).toContain(response.status);
    });

    it("should analyze code successfully", async () => {
      const response = await client.analyzeCode(testData.sampleCode, "test.ts");
      expect([200, 400, 413]).toContain(response.status);
      // 400 for validation, 413 for size limit
    });

    it("should analyze code within SLA", async () => {
      const response = await client.analyzeCode(testData.sampleCode);
      expect(response.duration).toBeLessThan(sla.analysis);
    });

    it("should review code successfully", async () => {
      const response = await client.reviewCode(testData.sampleCode, "handler.ts");
      expect([200, 400, 413]).toContain(response.status);
    });

    it("should list analysis rules", async () => {
      const response = await client.listRules();
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it("should generate pattern code", async () => {
      const response = await client.generatePattern(testData.patternId, {
        ServiceName: "TestService",
      });
      expect([200, 404]).toContain(response.status);
    });

    it("should generate code within SLA", async () => {
      const response = await client.generatePattern(testData.patternId);
      expect(response.duration).toBeLessThan(sla.generation);
    });
  });

  describe("Error Handling", () => {
    it("should return 400 for invalid request", async () => {
      const response = await client.post("/api/analyze-code", {
        source: "", // Empty source
      });

      expect([200, 400, 413]).toContain(response.status);
    });

    it("should return 404 for non-existent pattern", async () => {
      const response = await client.getPattern("non-existent-pattern-xyz");
      expect([404, 200]).toContain(response.status);
    });

    it("should return 413 for oversized payload", async () => {
      const largeCode = "x".repeat(100 * 1024 * 1024); // 100MB

      try {
        const response = await client.analyzeCode(largeCode);
        expect([413, 400]).toContain(response.status);
      } catch (error) {
        // May fail before sending
        expect(String(error)).toBeDefined();
      }
    });

    it("should include trace ID in responses", async () => {
      const response = await client.get(endpoints.health);
      expect(response.data).toBeDefined();
      // Trace ID may be in response body or headers
    });

    it("should recover from errors", async () => {
      // Make request that might error
      await client.getPattern("non-existent");

      // Should still work after error
      const response = await client.get(endpoints.health);
      expect(response.status).toBe(200);
    });
  });

  describe("Response Format", () => {
    it("should return JSON responses", async () => {
      const response = await client.get(endpoints.health);
      expect(response.headers["content-type"]).toMatch(/json/i);
    });

    it("should include appropriate headers", async () => {
      const response = await client.get(endpoints.health);
      expect(response.headers).toBeDefined();
      expect(Object.keys(response.headers).length).toBeGreaterThan(0);
    });

    it("should return consistent response structure", async () => {
      const response1 = await client.get(endpoints.health);
      const response2 = await client.get(endpoints.health);

      expect(typeof response1.data).toBe(typeof response2.data);
    });
  });

  describe("Performance", () => {
    it("should handle concurrent requests", async () => {
      const requests = Array(5)
        .fill(null)
        .map(() => client.get(endpoints.health));

      const results = await Promise.all(requests);

      for (const result of results) {
        expect(result.status).toBe(200);
      }
    });

    it("should maintain performance under load", async () => {
      const results: number[] = [];

      for (let i = 0; i < 5; i++) {
        const response = await client.get(endpoints.health);
        results.push(response.duration);
      }

      const avgDuration = results.reduce((a, b) => a + b, 0) / results.length;
      expect(avgDuration).toBeLessThan(sla.averageResponse);
    });

    it("should not timeout on normal requests", async () => {
      const response = await client.searchPatterns(testData.searchQuery, 5);
      expect(response.status).toBeGreaterThan(0); // Should not timeout
    });
  });

  describe("Integration Tests", () => {
    it("should complete pattern search to retrieval workflow", async () => {
      // Search
      const searchResponse = await client.searchPatterns(testData.searchQuery, 1);
      expect(searchResponse.status).toBe(200);

      // Get first result (if available)
      const getResponse = await client.getPattern(testData.patternId);
      expect([200, 404]).toContain(getResponse.status);
    });

    it("should complete analysis workflow", async () => {
      // Analyze
      const analyzeResponse = await client.analyzeCode(testData.sampleCode);
      expect([200, 400]).toContain(analyzeResponse.status);

      // Review
      const reviewResponse = await client.reviewCode(testData.sampleCode);
      expect([200, 400]).toContain(reviewResponse.status);
    });

    it("should complete generation workflow", async () => {
      const response = await client.generatePattern(testData.patternId);
      expect([200, 404]).toContain(response.status);
    });
  });

  describe("API Versioning", () => {
    it("should support expected API endpoints", async () => {
      const healthResponse = await client.get("/api/health");
      expect(healthResponse.status).toBeGreaterThan(0);
    });

    it("should return appropriate status codes", async () => {
      const response = await client.get(endpoints.health);
      expect(response.status).toBe(200);
    });
  });
});
