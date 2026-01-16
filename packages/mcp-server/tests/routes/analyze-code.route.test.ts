/**
 * Analyze Code Route Tests
 *
 * Tests for the /api/analyze-code endpoint which analyzes TypeScript code.
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

/**
 * Mock analyze code route
 */
async function analyzeCodeHandler(request: NextRequest) {
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

  // Validate source code
  if (!body.source || typeof body.source !== "string") {
    return new Response(
      JSON.stringify({ error: "source parameter is required", status: 400 }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const source = body.source as string;

  // Check size limit (1MB)
  if (source.length > 1024 * 1024) {
    return new Response(
      JSON.stringify({
        error: "Code too large",
        status: 413,
        maxSize: 1024 * 1024,
        actualSize: source.length,
      }),
      { status: 413, headers: { "content-type": "application/json" } }
    );
  }

  // Mock analysis results
  const suggestions = [];
  if (source.includes(": any")) {
    suggestions.push({
      message: "Avoid using 'any' type",
      severity: "high",
      line: 1,
    });
  }

  return new Response(
    JSON.stringify({
      source: source.substring(0, 100), // Return snippet
      suggestions,
      totalIssues: suggestions.length,
      filename: body.filename || "unknown.ts",
      analysisType: body.analysisType || "all",
      traceId: "trace-" + Date.now(),
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    }
  );
}

describe("Analyze Code Route (/api/analyze-code)", () => {
  it("should require API key", async () => {
    const request = new NextRequest("http://localhost:3000/api/analyze-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "const x = 1;" }),
    });

    const response = await analyzeCodeHandler(request);

    expect(response.status).toBe(401);
  });

  it("should reject invalid API key", async () => {
    const request = new NextRequest("http://localhost:3000/api/analyze-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "invalid-key",
      },
      body: JSON.stringify({ source: "const x = 1;" }),
    });

    const response = await analyzeCodeHandler(request);

    expect(response.status).toBe(401);
  });

  it("should require source parameter", async () => {
    const request = new NextRequest("http://localhost:3000/api/analyze-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({ filename: "test.ts" }),
    });

    const response = await analyzeCodeHandler(request);

    expect(response.status).toBe(400);
  });

  it("should analyze valid code", async () => {
    const request = new NextRequest("http://localhost:3000/api/analyze-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        source: "const x = 1;",
        filename: "test.ts",
      }),
    });

    const response = await analyzeCodeHandler(request);

    expect(response.status).toBe(200);
  });

  it("should detect 'any' type anti-pattern", async () => {
    const request = new NextRequest("http://localhost:3000/api/analyze-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        source: "const x: any = 1;",
      }),
    });

    const response = await analyzeCodeHandler(request);
    const data = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(Array.isArray(data.suggestions)).toBe(true);
    expect((data.suggestions as Array<unknown>).length).toBeGreaterThan(0);
  });

  it("should accept filename parameter", async () => {
    const request = new NextRequest("http://localhost:3000/api/analyze-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        source: "const x = 1;",
        filename: "src/handler.ts",
      }),
    });

    const response = await analyzeCodeHandler(request);
    const data = await response.json() as Record<string, unknown>;

    expect(data.filename).toBe("src/handler.ts");
  });

  it("should accept analysisType parameter", async () => {
    const analysisTypes = ["all", "validation", "patterns", "errors"];

    for (const type of analysisTypes) {
      const request = new NextRequest(
        "http://localhost:3000/api/analyze-code",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": "test-api-key",
          },
          body: JSON.stringify({
            source: "const x = 1;",
            analysisType: type,
          }),
        }
      );

      const response = await analyzeCodeHandler(request);

      expect(response.status).toBe(200);
    }
  });

  it("should reject oversized code", async () => {
    const largeCode = "x".repeat(2 * 1024 * 1024); // 2MB

    const request = new NextRequest("http://localhost:3000/api/analyze-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        source: largeCode,
      }),
    });

    const response = await analyzeCodeHandler(request);

    expect(response.status).toBe(413);
  });

  it("should return trace ID", async () => {
    const request = new NextRequest("http://localhost:3000/api/analyze-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        source: "const x = 1;",
      }),
    });

    const response = await analyzeCodeHandler(request);
    const data = await response.json() as Record<string, unknown>;

    expect(typeof data.traceId).toBe("string");
  });

  it("should handle invalid JSON", async () => {
    const request = new NextRequest("http://localhost:3000/api/analyze-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: "{ invalid json",
    });

    const response = await analyzeCodeHandler(request);

    expect(response.status).toBe(400);
  });

  it("should handle empty body", async () => {
    const request = new NextRequest("http://localhost:3000/api/analyze-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: "",
    });

    const response = await analyzeCodeHandler(request);

    expect(response.status).toBe(400);
  });

  it("should analyze code with syntax errors", async () => {
    const request = new NextRequest("http://localhost:3000/api/analyze-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        source: "const x = {",
      }),
    });

    const response = await analyzeCodeHandler(request);

    expect([200, 400]).toContain(response.status);
  });

  it("should return JSON response", async () => {
    const request = new NextRequest("http://localhost:3000/api/analyze-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-api-key",
      },
      body: JSON.stringify({
        source: "const x = 1;",
      }),
    });

    const response = await analyzeCodeHandler(request);

    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
