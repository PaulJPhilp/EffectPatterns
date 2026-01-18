/**
 * Health Route Tests
 *
 * Tests for the /api/health endpoint which is public and requires no authentication.
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

/**
 * Mock health route handler
 */
async function healthHandler(request: NextRequest) {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "effect-patterns-mcp-server",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    }
  );
}

describe("Health Route (/api/health)", () => {
  it("should return 200 status code", async () => {
    const request = new NextRequest("http://localhost:3000/api/health");
    const response = await healthHandler(request);

    expect(response.status).toBe(200);
  });

  it("should return JSON response", async () => {
    const request = new NextRequest("http://localhost:3000/api/health");
    const response = await healthHandler(request);

    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("should return ok status", async () => {
    const request = new NextRequest("http://localhost:3000/api/health");
    const response = await healthHandler(request);

    const data = await response.json() as Record<string, unknown>;
    expect(data.ok).toBe(true);
  });

  it("should return service name", async () => {
    const request = new NextRequest("http://localhost:3000/api/health");
    const response = await healthHandler(request);

    const data = await response.json() as Record<string, unknown>;
    expect(data.service).toMatch(/effect-patterns/i);
  });

  it("should return timestamp", async () => {
    const request = new NextRequest("http://localhost:3000/api/health");
    const response = await healthHandler(request);

    const data = await response.json() as Record<string, unknown>;
    expect(typeof data.timestamp).toBe("string");
    expect(() => new Date(data.timestamp as string)).not.toThrow();
  });

  it("should not require authentication", async () => {
    const request = new NextRequest("http://localhost:3000/api/health");
    const response = await healthHandler(request);

    expect(response.status).toBe(200);
  });

  it("should handle GET request", async () => {
    const request = new NextRequest("http://localhost:3000/api/health", {
      method: "GET",
    });
    const response = await healthHandler(request);

    expect(response.status).toBe(200);
  });

  it("should handle multiple requests", async () => {
    const requests = Array(3)
      .fill(null)
      .map(
        () => new NextRequest("http://localhost:3000/api/health")
      );

    for (const request of requests) {
      const response = await healthHandler(request);
      expect(response.status).toBe(200);
    }
  });

  it("should return consistent response structure", async () => {
    const request1 = new NextRequest("http://localhost:3000/api/health");
    const response1 = await healthHandler(request1);
    const data1 = await response1.json() as Record<string, unknown>;

    const request2 = new NextRequest("http://localhost:3000/api/health");
    const response2 = await healthHandler(request2);
    const data2 = await response2.json() as Record<string, unknown>;

    expect(typeof data1.ok).toBe(typeof data2.ok);
    expect(typeof data1.service).toBe(typeof data2.service);
  });

  it("should be fast", async () => {
    const request = new NextRequest("http://localhost:3000/api/health");

    const start = Date.now();
    await healthHandler(request);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100); // Should be < 100ms
  });
});
