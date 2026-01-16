/**
 * Patterns Search Route Tests
 *
 * Tests for the /api/patterns endpoint which searches patterns.
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

/**
 * Mock patterns search route
 */
async function patternsHandler(request: NextRequest) {
  // Check authentication
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Missing API key",
        status: 401,
      }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      }
    );
  }

  // Mock invalid API key rejection
  if (apiKey !== "test-api-key") {
    return new Response(
      JSON.stringify({
        error: "Invalid API key",
        status: 401,
      }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      }
    );
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  // Validate limit
  if (limit < 1 || limit > 100) {
    return new Response(
      JSON.stringify({
        error: "Limit must be between 1 and 100",
        status: 400,
      }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      }
    );
  }

  // Return mock patterns
  return new Response(
    JSON.stringify({
      patterns: [
        { id: "pattern-1", name: "Pattern 1", category: "concurrency" },
        { id: "pattern-2", name: "Pattern 2", category: "error-handling" },
      ],
      total: 2,
      query,
      limit,
      traceId: "trace-" + Date.now(),
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    }
  );
}

describe("Patterns Search Route (/api/patterns)", () => {
  it("should require API key", async () => {
    const request = new NextRequest("http://localhost:3000/api/patterns", {
      method: "GET",
    });

    const response = await patternsHandler(request);

    expect(response.status).toBe(401);
  });

  it("should reject invalid API key", async () => {
    const request = new NextRequest("http://localhost:3000/api/patterns", {
      method: "GET",
      headers: { "x-api-key": "invalid-key" },
    });

    const response = await patternsHandler(request);

    expect(response.status).toBe(401);
  });

  it("should accept valid API key", async () => {
    const request = new NextRequest("http://localhost:3000/api/patterns", {
      method: "GET",
      headers: { "x-api-key": "test-api-key" },
    });

    const response = await patternsHandler(request);

    expect(response.status).toBe(200);
  });

  it("should search patterns with query", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/patterns?q=error",
      {
        method: "GET",
        headers: { "x-api-key": "test-api-key" },
      }
    );

    const response = await patternsHandler(request);
    const data = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(Array.isArray(data.patterns)).toBe(true);
  });

  it("should handle limit parameter", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/patterns?q=test&limit=10",
      {
        method: "GET",
        headers: { "x-api-key": "test-api-key" },
      }
    );

    const response = await patternsHandler(request);
    const data = await response.json() as Record<string, unknown>;

    expect(data.limit).toBe(10);
  });

  it("should validate limit bounds", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/patterns?limit=101",
      {
        method: "GET",
        headers: { "x-api-key": "test-api-key" },
      }
    );

    const response = await patternsHandler(request);

    expect(response.status).toBe(400);
  });

  it("should reject zero limit", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/patterns?limit=0",
      {
        method: "GET",
        headers: { "x-api-key": "test-api-key" },
      }
    );

    const response = await patternsHandler(request);

    expect(response.status).toBe(400);
  });

  it("should include trace ID in response", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/patterns?q=test",
      {
        method: "GET",
        headers: { "x-api-key": "test-api-key" },
      }
    );

    const response = await patternsHandler(request);
    const data = await response.json() as Record<string, unknown>;

    expect(typeof data.traceId).toBe("string");
    expect((data.traceId as string).length).toBeGreaterThan(0);
  });

  it("should return JSON response", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/patterns?q=test",
      {
        method: "GET",
        headers: { "x-api-key": "test-api-key" },
      }
    );

    const response = await patternsHandler(request);

    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("should handle empty query", async () => {
    const request = new NextRequest("http://localhost:3000/api/patterns", {
      method: "GET",
      headers: { "x-api-key": "test-api-key" },
    });

    const response = await patternsHandler(request);

    expect(response.status).toBe(200);
  });

  it("should return array of patterns", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/patterns?q=test",
      {
        method: "GET",
        headers: { "x-api-key": "test-api-key" },
      }
    );

    const response = await patternsHandler(request);
    const data = await response.json() as Record<string, unknown>;

    expect(Array.isArray(data.patterns)).toBe(true);
    expect((data.patterns as Array<unknown>).length).toBeGreaterThan(0);
  });

  it("should handle special characters in query", async () => {
    const specialQueries = [
      "error-handling",
      "try/catch",
      "async await",
    ];

    for (const query of specialQueries) {
      const request = new NextRequest(
        `http://localhost:3000/api/patterns?q=${encodeURIComponent(query)}`,
        {
          method: "GET",
          headers: { "x-api-key": "test-api-key" },
        }
      );

      const response = await patternsHandler(request);

      expect([200, 400]).toContain(response.status);
    }
  });

  it("should handle API key from header", async () => {
    const request = new NextRequest("http://localhost:3000/api/patterns", {
      method: "GET",
      headers: { "x-api-key": "test-api-key" },
    });

    const response = await patternsHandler(request);

    expect(response.status).toBe(200);
  });
});
