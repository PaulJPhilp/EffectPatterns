/**
 * Health Route Tests - REAL ROUTE TESTING (ZERO MOCKS)
 *
 * Tests the ACTUAL route handler from app/api/health/route.ts
 * No mocks. No test doubles. Real implementation.
 *
 * Architecture:
 * - GET /api/health - Public health check endpoint
 * - No authentication required
 * - No external dependencies
 * - Returns service status with version and trace ID
 */

import { GET as healthGET } from "../../app/api/health/route";
import { describe, expect, it } from "vitest";

const healthRequest = () => new Request("http://localhost/api/health");

describe("Health Route (/api/health) - REAL ROUTE", () => {
  it("should return 200 status code", async () => {
    const response = await healthGET(healthRequest());
    expect(response.status).toBe(200);
  });

  it("should return JSON response", async () => {
    const response = await healthGET(healthRequest());
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("should return ok: true status", async () => {
    const response = await healthGET(healthRequest());
    const data = await response.json() as Record<string, unknown>;
    expect(data.ok).toBe(true);
  });

  it("should return service name", async () => {
    const response = await healthGET(healthRequest());
    const data = await response.json() as Record<string, unknown>;
    expect(data.service).toMatch(/effect-patterns/i);
  });

  it("should return version field", async () => {
    const response = await healthGET(healthRequest());
    const data = await response.json() as Record<string, unknown>;
    expect(data.version).toBeDefined();
    expect(typeof data.version).toBe("string");
    expect(data.version).toMatch(/^\d+\.\d+\.\d+/); // Semantic version
  });

  it("should return ISO timestamp", async () => {
    const response = await healthGET(healthRequest());
    const data = await response.json() as Record<string, unknown>;
    expect(typeof data.timestamp).toBe("string");
    const timestamp = data.timestamp as string;
    // Verify it's a valid ISO date string
    const date = new Date(timestamp);
    expect(date.getTime()).toBeGreaterThan(0);
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should include UUID trace ID in response body", async () => {
    const response = await healthGET(healthRequest());
    const data = await response.json() as Record<string, unknown>;
    expect(data.traceId).toBeDefined();
    expect(typeof data.traceId).toBe("string");
    // UUID format check: 8-4-4-4-12 hex digits with dashes
    expect(data.traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("should include trace ID in x-trace-id response header", async () => {
    const response = await healthGET(healthRequest());
    const traceIdHeader = response.headers.get("x-trace-id");
    expect(traceIdHeader).toBeDefined();
    expect(typeof traceIdHeader).toBe("string");
    // UUID format
    expect(traceIdHeader).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("should not require authentication", async () => {
    const response = await healthGET(healthRequest());
    expect(response.status).toBe(200);
    const data = await response.json() as Record<string, unknown>;
    expect(data.error).toBeUndefined();
  });

  it("should handle multiple concurrent requests", async () => {
    const responses = await Promise.all([
      healthGET(healthRequest()),
      healthGET(healthRequest()),
      healthGET(healthRequest()),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(200);
      const data = await response.json() as Record<string, unknown>;
      expect(data.ok).toBe(true);
      expect(data.service).toBeDefined();
    }
  });

  it("should return consistent response structure across multiple calls", async () => {
    const response1 = await healthGET(healthRequest());
    const data1 = await response1.json() as Record<string, unknown>;

    const response2 = await healthGET(healthRequest());
    const data2 = await response2.json() as Record<string, unknown>;

    // All calls should return same structure
    expect(typeof data1.ok).toBe(typeof data2.ok);
    expect(typeof data1.service).toBe(typeof data2.service);
    expect(typeof data1.version).toBe(typeof data2.version);
    expect(typeof data1.traceId).toBe(typeof data2.traceId);
    expect(typeof data1.timestamp).toBe(typeof data2.timestamp);

    // But trace IDs should be different (different UUIDs)
    expect(data1.traceId).not.toBe(data2.traceId);
  });

  it("should respond fast (< 50ms)", async () => {
    const start = performance.now();
    await healthGET(healthRequest());
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
  });

  it("should contain all required fields in response", async () => {
    const response = await healthGET(healthRequest());
    const data = await response.json() as Record<string, unknown>;

    const requiredFields = ["ok", "service", "version", "timestamp", "traceId", "environment"];
    for (const field of requiredFields) {
      expect(data).toHaveProperty(field);
      expect(data[field]).toBeDefined();
    }
  });

  it("should include environment in response", async () => {
    const response = await healthGET(healthRequest());
    const data = await response.json() as Record<string, unknown>;
    expect(data.environment).toBeDefined();
    expect(typeof data.environment).toBe("string");
    expect(["development", "preview", "production"]).toContain(data.environment);
  });

  it("should support deep=true query and return database field", async () => {
    const response = await healthGET(new Request("http://localhost/api/health?deep=true"));
    const data = await response.json() as Record<string, unknown>;
    expect(data.environment).toBeDefined();
    expect(data.database).toBeDefined();
    expect(data.database).toMatch(/^(ok|error)$/);
    if (data.database === "ok") {
      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    } else {
      expect(response.status).toBe(503);
      expect(data.ok).toBe(false);
    }
  });
});
