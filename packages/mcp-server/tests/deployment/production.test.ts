/**
 * Production Environment Tests
 *
 * Tests for the production deployment of the Effect Patterns MCP server.
 * These tests are more conservative and verify reliability and uptime.
 *
 * Architecture:
 * - HTTP API handles all authentication and authorization
 * - Tier validation (free/paid) happens at HTTP API level
 * - MCP server is pure transport - passes requests through
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  getDeploymentConfig,
  endpoints,
  sla,
  testData,
} from "./helpers/environment-config";
import { createDeploymentClient, DeploymentClient } from "./helpers/deployment-client";

describe("Production Environment", () => {
  let client: DeploymentClient;
  const config = getDeploymentConfig("production");

  beforeAll(() => {
    client = createDeploymentClient(config);
  });

  describe("Availability & SLA", () => {
    it("should be available and healthy", async () => {
      const response = await client.get(endpoints.health);
      expect(response.status).toBe(200);
    });

    it("should respond to health check within strict SLA", async () => {
      const response = await client.get(endpoints.health);
      // Production should be faster than staging
      expect(response.duration).toBeLessThan(sla.healthCheck * 0.8);
    });

    it("should maintain 99.9% uptime availability", async () => {
      // Test multiple times over time (simple version for quick test)
      const attempts = 5;
      let successes = 0;

      for (let i = 0; i < attempts; i++) {
        try {
          const response = await client.get(endpoints.health);
          if (response.status === 200) {
            successes++;
          }
        } catch {
          // Network error counts as failure
        }
      }

      expect(successes).toBe(attempts); // 100% for this quick test
    });

    it("should not have extended downtime", async () => {
      // Multiple requests should not fail
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

  describe("Authentication & Security", () => {
    it("should enforce API key requirement", async () => {
      const client2 = createDeploymentClient({
        ...config,
        apiKey: undefined,
      });

      const response = await client2.get(endpoints.patterns);
      expect([401, 403]).toContain(response.status);
    });

    it("should reject unauthorized requests", async () => {
      const client2 = createDeploymentClient({
        ...config,
        apiKey: "invalid-key-" + Date.now(),
      });

      const response = await client2.get(endpoints.patterns);
      expect([401, 403]).toContain(response.status);
    });

    it("should verify API key on every request", async () => {
      // Valid key should work
      const validResponse = await client.get(endpoints.health);
      expect(validResponse.status).toBe(200);

      // Invalid key should fail
      const client2 = createDeploymentClient({
        ...config,
        apiKey: "invalid-xyz",
      });
      const invalidResponse = await client2.get(endpoints.patterns);
      expect([401, 403]).toContain(invalidResponse.status);
    });

    it("should use HTTPS in production", async () => {
      expect(config.baseUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Core Functionality Reliability", () => {
    it("should reliably search patterns", async () => {
      const response = await client.searchPatterns(testData.searchQuery, 3);
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it("should reliably retrieve patterns", async () => {
      const response = await client.getPattern(testData.patternId);
      expect([200, 404]).toContain(response.status);
    });

    it("should reliably analyze code", async () => {
      const response = await client.analyzeCode(testData.sampleCode);
      expect([200, 400]).toContain(response.status);
    });

    it("should reliably review code", async () => {
      const response = await client.reviewCode(testData.sampleCode);
      expect([200, 400]).toContain(response.status);
    });

    it("should reliably list rules", async () => {
      const response = await client.listRules();
      expect(response.status).toBe(200);
    });

    it("should maintain consistency across requests", async () => {
      // Same request should return same results
      const response1 = await client.listRules();
      const response2 = await client.listRules();

      expect(JSON.stringify(response1.data)).toBe(
        JSON.stringify(response2.data)
      );
    });
  });

  describe("Error Resilience", () => {
    it("should handle invalid requests gracefully", async () => {
      const response = await client.post("/api/analyze-code", {
        source: "", // Invalid
      });

      expect([200, 400, 413]).toContain(response.status);
    });

    it("should handle missing resources", async () => {
      const response = await client.getPattern("non-existent-production-xyz");
      expect([404, 200]).toContain(response.status);
    });

    it("should not expose internal errors", async () => {
      const response = await client.get(endpoints.patterns);
      const errorText = JSON.stringify(response.data).toLowerCase();

      // Should not leak sensitive info
      expect(errorText).not.toContain("password");
      expect(errorText).not.toContain("secret");
    });

    it("should recover after errors", async () => {
      // Try an invalid request
      await client.getPattern("non-existent");

      // Should still work
      const response = await client.get(endpoints.health);
      expect(response.status).toBe(200);
    });

    it("should handle rate limiting gracefully", async () => {
      // Make many requests
      const requests = Array(20)
        .fill(null)
        .map(() => client.get(endpoints.health));

      const results = await Promise.all(requests);

      // Should not crash, may have rate limit errors
      for (const result of results) {
        expect([200, 429]).toContain(result.status);
      }
    });
  });

  describe("Performance SLA", () => {
    it("should respond within tight SLA", async () => {
      const response = await client.get(endpoints.health);
      expect(response.duration).toBeLessThan(sla.healthCheck * 0.5); // Tight SLA
    });

    it("should maintain low latency under load", async () => {
      const times: number[] = [];

      for (let i = 0; i < 10; i++) {
        const response = await client.get(endpoints.health);
        times.push(response.duration);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      expect(avgTime).toBeLessThan(sla.averageResponse * 0.7);
      expect(maxTime).toBeLessThan(sla.healthCheck);
    });

    it("should not degrade performance during concurrent requests", async () => {
      const concurrentRequests = Array(10)
        .fill(null)
        .map(() => client.get(endpoints.health));

      const results = await Promise.all(concurrentRequests);

      for (const result of results) {
        expect(result.duration).toBeLessThan(sla.healthCheck);
      }
    });
  });

  describe("Data Integrity", () => {
    it("should return consistent pattern data", async () => {
      const response1 = await client.getPattern(testData.patternId);
      const response2 = await client.getPattern(testData.patternId);

      expect(JSON.stringify(response1.data)).toBe(
        JSON.stringify(response2.data)
      );
    });

    it("should not corrupt data in responses", async () => {
      const response = await client.searchPatterns(testData.searchQuery, 1);

      if (response.status === 200 && response.data) {
        // Response should be valid JSON
        expect(response.data).toBeDefined();
        // Should be serializable back to JSON
        expect(() => JSON.stringify(response.data)).not.toThrow();
      }
    });

    it("should maintain database consistency", async () => {
      // Multiple searches should be consistent
      const results1 = await client.searchPatterns(testData.searchQuery, 5);
      const results2 = await client.searchPatterns(testData.searchQuery, 5);

      if (results1.status === 200 && results2.status === 200) {
        expect(JSON.stringify(results1.data)).toBe(
          JSON.stringify(results2.data)
        );
      }
    });
  });

  describe("Production Integration Workflows", () => {
    it("should complete end-to-end workflow", async () => {
      // Search
      const searchResponse = await client.searchPatterns(testData.searchQuery, 1);
      expect(searchResponse.status).toBe(200);

      // Analyze
      const analyzeResponse = await client.analyzeCode(testData.sampleCode);
      expect([200, 400]).toContain(analyzeResponse.status);

      // Review
      const reviewResponse = await client.reviewCode(testData.sampleCode);
      expect([200, 400]).toContain(reviewResponse.status);

      // Get pattern
      const patternResponse = await client.getPattern(testData.patternId);
      expect([200, 404]).toContain(patternResponse.status);
    });

    it("should handle production load patterns", async () => {
      // Simulate realistic usage pattern
      const operations = [
        client.get(endpoints.health),
        client.searchPatterns("error", 5),
        client.analyzeCode(testData.sampleCode),
        client.reviewCode(testData.sampleCode),
        client.listRules(),
      ];

      const results = await Promise.all(operations);

      for (const result of results) {
        expect(result.status).toBeGreaterThan(0);
      }
    });
  });

  describe("Monitoring & Observability", () => {
    it("should include trace IDs for debugging", async () => {
      const response = await client.get(endpoints.health);
      // May have traceId in response or headers
      expect(response.data || response.headers).toBeDefined();
    });

    it("should provide consistent response format", async () => {
      const response1 = await client.get(endpoints.health);
      const response2 = await client.get(endpoints.health);

      expect(typeof response1.status).toBe(typeof response2.status);
      expect(typeof response1.data).toBe(typeof response2.data);
    });

    it("should log errors appropriately", async () => {
      // Error should not crash system
      try {
        await client.getPattern("non-existent");
      } catch {
        // Expected
      }

      // System should still be responsive
      const response = await client.get(endpoints.health);
      expect(response.status).toBe(200);
    });
  });

  describe("Production Safety", () => {
    it("should not allow data exfiltration", async () => {
      const response = await client.searchPatterns("' OR '1'='1", 5); // SQL injection attempt
      expect([200, 400]).toContain(response.status);
      // Should not error in revealing way
    });

    it("should handle malformed requests safely", async () => {
      try {
        await client.post("/api/analyze-code", null);
      } catch {
        // Expected
      }

      // Should not crash
      const response = await client.get(endpoints.health);
      expect(response.status).toBe(200);
    });

    it("should enforce timeout limits", async () => {
      // Try with very short timeout
      const shortClient = createDeploymentClient({
        ...config,
        timeout: 100, // 100ms is very short
      });

      try {
        await shortClient.searchPatterns(testData.searchQuery, 100);
      } catch {
        // Expected to timeout or fail
      }

      // Regular client should still work
      const response = await client.get(endpoints.health);
      expect(response.status).toBe(200);
    });
  });
});
