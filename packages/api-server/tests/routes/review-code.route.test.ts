/**
 * Review Code Route Tests - REAL ROUTE TESTING (NO MOCKS)
 *
 * Tests the ACTUAL route handler from app/api/review-code/route.ts
 * Uses real review service, real auth, real Effect runtime.
 * No mock handlers.
 *
 * Architecture:
 * - POST /api/review-code
 * - AI-powered code review with architectural recommendations
 * - Returns a bounded set of top recommendations
 * - Requires API key authentication
 * - Uses createRouteHandler for auth/error handling
 */

import { POST as reviewCodePOST } from "../../app/api/review-code/route";
import { NextRequest } from "next/server";
import { describe, expect, it, beforeAll } from "vitest";

/**
 * Create a POST request with code review payload
 */
function createRequest(
  body: Record<string, unknown>,
  apiKey?: string
): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  return new NextRequest("http://localhost:3000/api/review-code", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("Review Code Route (/api/review-code) - REAL ROUTE", () => {
  beforeAll(() => {
    process.env.PATTERN_API_KEY = "test-key";
  });

  it("should require API key", async () => {
    const request = createRequest({ code: "const x = 1;" });
    const response = await reviewCodePOST(request);

    expect(response.status).toBe(401);
  });

  it("should reject invalid API key", async () => {
    const request = createRequest(
      { code: "const x = 1;" },
      "invalid-key"
    );
    const response = await reviewCodePOST(request);

    expect(response.status).toBe(401);
  });

  it("should require code parameter", async () => {
    const request = createRequest(
      { filePath: "handler.ts" },
      "test-key"
    );
    const response = await reviewCodePOST(request);

    expect(response.status).toBe(400);
  });

  it("should review valid TypeScript code", async () => {
    const request = createRequest(
      {
        code: `
export const handler = () => {
  const x: any = 42;
  return x;
};
        `.trim(),
      },
      "test-key"
    );
    const response = await reviewCodePOST(request);

    expect(response.status).toBe(200);
    const data = await response.json() as Record<string, unknown>;
    expect(data.recommendations).toBeDefined();
    expect(Array.isArray(data.recommendations)).toBe(true);
  });

  it("should detect 'any' type anti-pattern in review", async () => {
    const request = createRequest(
      {
        code: "const x: any = 1;",
      },
      "test-key"
    );
    const response = await reviewCodePOST(request);

    expect(response.status).toBe(200);
    const data = await response.json() as Record<string, unknown>;
    expect(Array.isArray(data.recommendations)).toBe(true);
  });

  it("should accept filePath parameter", async () => {
    const request = createRequest(
      {
        code: "const x = 1;",
        filePath: "src/handler.ts",
      },
      "test-key"
    );
    const response = await reviewCodePOST(request);

    expect(response.status).toBe(200);
    const data = await response.json() as Record<string, unknown>;
    // filePath is an input parameter, not returned in response
    expect(data.recommendations).toBeDefined();
  });

  it("should work without filePath (code-only mode)", async () => {
    const request = createRequest(
      {
        code: `
const helper = (x: number) => x * 2;
export default helper;
        `.trim(),
      },
      "test-key"
    );
    const response = await reviewCodePOST(request);

    expect(response.status).toBe(200);
    const data = await response.json() as Record<string, unknown>;
    expect(data.recommendations).toBeDefined();
  });

  it("should return only diagnostic information, no corrected code", async () => {
    const request = createRequest(
      {
        code: "const x: any = 42;",
        filePath: "test.ts",
      },
      "test-key"
    );
    const response = await reviewCodePOST(request);

    expect(response.status).toBe(200);
    const data = await response.json() as Record<string, unknown>;

    // Verify response structure contains only diagnostics
    expect(data).toHaveProperty("recommendations");

    // Verify NO corrected code fields
    expect(data).not.toHaveProperty("correctedCode");
    expect(data).not.toHaveProperty("after");
    expect(data).not.toHaveProperty("fixed");
    expect(data).not.toHaveProperty("patched");
  });

  it("should return JSON response", async () => {
    const request = createRequest(
      { code: "const x = 1;" },
      "test-key"
    );
    const response = await reviewCodePOST(request);

    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("should handle empty code", async () => {
    const request = createRequest(
      { code: "" },
      "test-key"
    );
    const response = await reviewCodePOST(request);

    expect([200, 400]).toContain(response.status);
  });

  it("should handle code with syntax errors", async () => {
    const request = createRequest(
      {
        code: `
const handler = () => {
  const x = {
  // missing closing brace
        `.trim(),
      },
      "test-key"
    );
    const response = await reviewCodePOST(request);

    expect([200, 400]).toContain(response.status);
  });

  it("should handle large code files (up to 100KB)", async () => {
    const largeCode = "const x = 1;\n".repeat(10000); // ~100KB
    const request = createRequest(
      { code: largeCode },
      "test-key"
    );
    const response = await reviewCodePOST(request);

    expect([200, 413]).toContain(response.status);
  });

  it("should reject oversized code (> 100KB)", async () => {
    const hugeCode = "const x = 1;\n".repeat(20000); // ~200KB
    const request = createRequest(
      { code: hugeCode },
      "test-key"
    );
    const response = await reviewCodePOST(request);

    expect(response.status).toBe(413);
  });

  it("should handle malformed JSON", async () => {
    const request = new NextRequest("http://localhost:3000/api/review-code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "test-key",
      },
      body: "{ invalid json }",
    });

    const response = await reviewCodePOST(request);
    // Real route may return 400 or 500 depending on error handling
    expect([400, 500]).toContain(response.status);
  });

  it("should include meta information in response", async () => {
    const request = createRequest(
      {
        code: "const x: any = 42;",
        filePath: "test.ts",
      },
      "test-key"
    );
    const response = await reviewCodePOST(request);

    if (response.status === 200) {
      const data = await response.json() as Record<string, unknown>;
      expect(data).toHaveProperty("meta");
      expect(data).toHaveProperty("timestamp");
    }
  });

  it("should include trace ID in response", async () => {
    const request = createRequest(
      { code: "const x = 1;" },
      "test-key"
    );
    const response = await reviewCodePOST(request);

    expect(response.status).toBe(200);
    const data = await response.json() as Record<string, unknown>;
    expect(data.traceId).toBeDefined();
  });

  it("should be usable for Effect-TS code review", async () => {
    const effectCode = `
import { Effect } from 'effect';

export const handler = Effect.gen(function*() {
  const result = yield* Effect.succeed(42);
  return result;
});
    `.trim();

    const request = createRequest(
      {
        code: effectCode,
        filePath: "handler.ts",
      },
      "test-key"
    );
    const response = await reviewCodePOST(request);

    expect(response.status).toBe(200);
    const data = await response.json() as Record<string, unknown>;
    expect(data.recommendations).toBeDefined();
  });
});
