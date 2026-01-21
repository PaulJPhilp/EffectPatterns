/**
 * Route Test Harness
 *
 * Utilities for testing Next.js API routes in isolation.
 *
 * Architecture Note:
 * - HTTP API is where ALL authentication and authorization happens
 * - MCP server is pure transport - it doesn't validate auth
 * - Tier validation (free/paid) happens at HTTP API level
 * - These tests verify HTTP API auth and tier enforcement
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Mock NextRequest factory
 */
export function createMockRequest(options: {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
} = {}): NextRequest {
  const method = options.method || "GET";
  const url = options.url || "http://localhost:3000/api/test";
  const headers = new Headers(options.headers);

  // Add default headers
  if (!headers.has("content-type") && options.body) {
    headers.set("content-type", "application/json");
  }

  const body =
    options.body && method !== "GET" ? JSON.stringify(options.body) : null;

  return new NextRequest(url, {
    method,
    headers,
    body,
  });
}

/**
 * Route handler test response
 */
export interface RouteTestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  text: string;
}

/**
 * Parse response headers to object
 */
function parseHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Execute a route handler and return response
 */
export async function executeRoute(
  handler: (request: NextRequest) => Promise<Response | NextResponse>,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): Promise<RouteTestResponse> {
  const request = createMockRequest(options);

  try {
    const response = await handler(request);

    // Handle NextResponse or Response
    const nextResponse = response instanceof NextResponse ? response : response;

    const text = await nextResponse.clone().text();
    let data: unknown;

    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return {
      status: nextResponse.status,
      statusText: nextResponse.statusText,
      headers: parseHeaders(nextResponse.headers),
      data,
      text,
    };
  } catch (error) {
    // Handler threw an error
    throw new Error(`Route handler error: ${error}`);
  }
}

/**
 * Test route with multiple requests
 */
export async function testRoute(
  handler: (request: NextRequest) => Promise<Response | NextResponse>,
  tests: Array<{
    name: string;
    request: Parameters<typeof executeRoute>[1];
    expect: (response: RouteTestResponse) => void;
  }>
): Promise<void> {
  for (const test of tests) {
    try {
      const response = await executeRoute(handler, test.request);
      test.expect(response);
    } catch (error) {
      throw new Error(`Test "${test.name}" failed: ${error}`);
    }
  }
}

/**
 * Assertion helpers
 */
export const assertions = {
  /**
   * Assert response status code
   */
  status: (response: RouteTestResponse, expected: number) => {
    if (response.status !== expected) {
      throw new Error(
        `Expected status ${expected}, got ${response.status}`
      );
    }
  },

  /**
   * Assert response has JSON data
   */
  hasJsonData: (response: RouteTestResponse) => {
    if (typeof response.data !== "object" || response.data === null) {
      throw new Error(`Expected JSON data, got ${typeof response.data}`);
    }
  },

  /**
   * Assert response data has property
   */
  hasProperty: (response: RouteTestResponse, property: string) => {
    const data = response.data as Record<string, unknown>;
    if (!data || !(property in data)) {
      throw new Error(`Expected property "${property}" not found in response`);
    }
  },

  /**
   * Assert response includes error
   */
  hasError: (response: RouteTestResponse) => {
    const data = response.data as Record<string, unknown>;
    if (!data || !("error" in data)) {
      throw new Error(`Expected "error" property in error response`);
    }
  },

  /**
   * Assert response includes trace ID
   */
  hasTraceId: (response: RouteTestResponse) => {
    const data = response.data as Record<string, unknown>;
    if (!data || !("traceId" in data)) {
      throw new Error(`Expected "traceId" in response`);
    }
  },

  /**
   * Assert content type
   */
  contentType: (response: RouteTestResponse, expected: string) => {
    const contentType = response.headers["content-type"] || "";
    if (!contentType.includes(expected)) {
      throw new Error(
        `Expected content-type to include "${expected}", got "${contentType}"`
      );
    }
  },
};

/**
 * Common test data
 */
export const testData = {
  validApiKey: "test-api-key",
  invalidApiKey: "invalid-key",
  sampleCode: `
export const handler = (input: any) => {
  return input * 2;
};
  `.trim(),
  patternId: "effect-service",
  validSearchQuery: { q: "error", limit: 5 },
};
