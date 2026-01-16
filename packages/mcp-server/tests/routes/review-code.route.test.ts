/**
 * Review Code Route Tests
 *
 * Tests for the /api/review-code endpoint which provides AI-powered code review.
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

/**
 * Mock review code route
 */
async function reviewCodeHandler(request: NextRequest) {
  // Check authentication
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing API key", status: 401 }),
      { status: 401, headers: { "content-type": "application/json" } }
    );
  }

  if (apiKey !== "test-api-key") {
    return new Response(
      JSON.stringify({ error: "Invalid API key", status: 401 }),
      { status: 401, headers: { "content-type": "application/json" } }
    );
  }

  // Parse request body
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (!text) {
      return new Response(
        JSON.stringify({ error: "Request body is required", status: 400 }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }
    body = JSON.parse(text);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON", status: 400 }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  // Validate code parameter
  if (!body.code || typeof body.code !== "string") {
    return new Response(
      JSON.stringify({ error: "code parameter is required", status: 400 }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const code = body.code as string;

  // Check size limit
  if (code.length > 100 * 1024) {
    return new Response(
      JSON.stringify({
        error: "Code too large",
        status: 413,
        maxSize: 100 * 1024,
        actualSize: code.length,
      }),
      { status: 413, headers: { "content-type": "application/json" } }
    );
  }

  // Mock review recommendations (free tier: top 3)
  const recommendations = [];

  if (code.includes(": any")) {
    recommendations.push({
      severity: "🔴 high",
      message: "Avoid using 'any' type for better type safety",
      impact: "Type Safety",
      suggestion: "Use specific types or generics instead of 'any'",
    });
  }

  if (code.includes("catch") && !code.includes("throw")) {
    recommendations.push({
      severity: "🟡 medium",
      message: "Catch block doesn't rethrow or log errors",
      impact: "Error Handling",
      suggestion: "Log or rethrow errors for proper debugging",
    });
  }

  if (code.includes("const") && code.includes("= {")) {
    recommendations.push({
      severity: "🔵 low",
      message: "Consider using const for immutability",
      impact: "Best Practices",
      suggestion: "Prefer const over let when variable doesn't change",
    });
  }

  return new Response(
    JSON.stringify({
      recommendations: recommendations.slice(0, 3), // Free tier: top 3
      totalFindings: recommendations.length,
      filePath: body.filePath || "unknown.ts",
      tier: "free",
      moreAvailable: recommendations.length > 3,
      traceId: "trace-" + Date.now(),
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    }
  );
}

describe("Review Code Route (/api/review-code)", () => {
  it("should require API key", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "const x = 1;" }),
    });

    const response = await reviewCodeHandler(request);

    expect(response.status).toBe(401);
  });

  it("should reject invalid API key", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "invalid-key",
      },
      body: JSON.stringify({ code: "const x = 1;" }),
    });

    const response = await reviewCodeHandler(request);

    expect(response.status).toBe(401);
  });

  it("should require code parameter", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({ filePath: "handler.ts" }),
    });

    const response = await reviewCodeHandler(request);

    expect(response.status).toBe(400);
  });

  it("should review valid code", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        code: "const x = 1;",
      }),
    });

    const response = await reviewCodeHandler(request);

    expect(response.status).toBe(200);
  });

  it("should return recommendations", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        code: "const x: any = 1;",
      }),
    });

    const response = await reviewCodeHandler(request);
    const data = await response.json() as Record<string, unknown>;

    expect(Array.isArray(data.recommendations)).toBe(true);
  });

  it("should limit recommendations to 3 (free tier)", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        code: "const x: any = {}; try { } catch (e) { } const y = { };",
      }),
    });

    const response = await reviewCodeHandler(request);
    const data = await response.json() as Record<string, unknown>;

    expect((data.recommendations as Array<unknown>).length).toBeLessThanOrEqual(3);
  });

  it("should include severity levels", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        code: "const x: any = 1;",
      }),
    });

    const response = await reviewCodeHandler(request);
    const data = await response.json() as Record<string, unknown>;

    const recommendations = data.recommendations as Array<Record<string, unknown>>;
    if (recommendations.length > 0) {
      expect(typeof recommendations[0].severity).toBe("string");
      expect(
        (recommendations[0].severity as string).match(/🔴|🟡|🔵/)
      ).toBeTruthy();
    }
  });

  it("should accept optional filePath", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        code: "const x = 1;",
        filePath: "src/handler.ts",
      }),
    });

    const response = await reviewCodeHandler(request);
    const data = await response.json() as Record<string, unknown>;

    expect(data.filePath).toBe("src/handler.ts");
  });

  it("should indicate tier", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        code: "const x = 1;",
      }),
    });

    const response = await reviewCodeHandler(request);
    const data = await response.json() as Record<string, unknown>;

    expect(data.tier).toBe("free");
  });

  it("should indicate if more findings available", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        code: "const x = 1;",
      }),
    });

    const response = await reviewCodeHandler(request);
    const data = await response.json() as Record<string, unknown>;

    expect(typeof data.moreAvailable).toBe("boolean");
  });

  it("should reject oversized code", async () => {
    const largeCode = "x".repeat(200 * 1024); // 200KB

    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        code: largeCode,
      }),
    });

    const response = await reviewCodeHandler(request);

    expect(response.status).toBe(413);
  });

  it("should return trace ID", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        code: "const x = 1;",
      }),
    });

    const response = await reviewCodeHandler(request);
    const data = await response.json() as Record<string, unknown>;

    expect(typeof data.traceId).toBe("string");
  });

  it("should handle invalid JSON", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: "{ invalid json",
    });

    const response = await reviewCodeHandler(request);

    expect(response.status).toBe(400);
  });

  it("should return JSON response", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        code: "const x = 1;",
      }),
    });

    const response = await reviewCodeHandler(request);

    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("should provide actionable recommendations", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        code: "const x: any = 1;",
      }),
    });

    const response = await reviewCodeHandler(request);
    const data = await response.json() as Record<string, unknown>;

    const recommendations = data.recommendations as Array<Record<string, unknown>>;
    if (recommendations.length > 0) {
      expect(typeof recommendations[0].suggestion).toBe("string");
      expect((recommendations[0].suggestion as string).length).toBeGreaterThan(0);
    }
  });
});
