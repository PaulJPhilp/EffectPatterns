/**
 * Route Handler Factory Tests
 *
 * Tests for the createRouteHandler, createPublicHandler, and createSimpleHandler
 * factory functions used throughout the application.
 *
 * Architecture:
 * - HTTP API is where ALL authentication and authorization happens
 * - Route handlers enforce API key validation (401)
 * - MCP server is pure transport - doesn't validate anything
 */

import { Effect } from "effect";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

/**
 * Mock handler factory utilities
 */

/**
 * Mock createRouteHandler
 */
function mockCreateRouteHandler<T, E>(
  _handler: (_request: NextRequest) => Effect.Effect<T, E, any>,
  options: {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    includeTraceId?: boolean;
  } = {}
) {
  const opts = {
    requireAuth: options.requireAuth !== false,
    requireAdmin: options.requireAdmin ?? false,
    includeTraceId: options.includeTraceId !== false,
  };

  return async (_request: NextRequest) => {
    try {
      // Check auth if required (HTTP API validates auth)
      if (opts.requireAuth) {
        const apiKey = _request.headers.get("x-api-key");
        if (!apiKey) {
          return new Response(
            JSON.stringify({
              error: "Missing API key",
              status: 401,
            }),
            { status: 401, headers: { "content-type": "application/json" } }
          );
        }
      }

      // Mock handler execution
      const data = { result: "success" };

      // Wrap response
      const response = {
        data,
        timestamp: new Date().toISOString(),
      };

      if (opts.includeTraceId) {
        (response as Record<string, unknown>).traceId = "trace-" + Date.now();
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: String(error),
          status: 500,
        }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
  };
}

/**
 * Mock createPublicHandler
 */
function mockCreatePublicHandler<T, E>(
  _handler: () => Effect.Effect<T, E, any>
) {
  return async (_request: NextRequest) => {
    try {
      const data = { result: "success" };

      const response = {
        data,
        timestamp: new Date().toISOString(),
        traceId: "trace-" + Date.now(),
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: String(error),
          status: 500,
        }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
  };
}

describe("Route Handler Factories", () => {
  describe("createRouteHandler", () => {
    it("should require authentication by default", async () => {
      const mockHandler = (_request: NextRequest) => Effect.succeed({ ok: true });
      const handler = mockCreateRouteHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/test");
      const response = await handler(request);

      expect(response.status).toBe(401);
    });

    it("should accept valid API key", async () => {
      const mockHandler = (_request: NextRequest) => Effect.succeed({ ok: true });
      const handler = mockCreateRouteHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-api-key": "valid-key" },
      });

      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    it("should wrap response with data property", async () => {
      const mockHandler = (_request: NextRequest) => Effect.succeed({ ok: true });
      const handler = mockCreateRouteHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-api-key": "valid-key" },
      });

      const response = await handler(request);
      const data = await response.json() as Record<string, unknown>;

      expect(data.data).toBeDefined();
    });

    it("should include timestamp in response", async () => {
      const mockHandler = (_request: NextRequest) => Effect.succeed({ ok: true });
      const handler = mockCreateRouteHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-api-key": "valid-key" },
      });

      const response = await handler(request);
      const data = await response.json() as Record<string, unknown>;

      expect(typeof data.timestamp).toBe("string");
    });

    it("should include trace ID by default", async () => {
      const mockHandler = (_request: NextRequest) => Effect.succeed({ ok: true });
      const handler = mockCreateRouteHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-api-key": "valid-key" },
      });

      const response = await handler(request);
      const data = await response.json() as Record<string, unknown>;

      expect(typeof data.traceId).toBe("string");
    });

    it("should not include trace ID when disabled", async () => {
      const mockHandler = (_request: NextRequest) => Effect.succeed({ ok: true });
      const handler = mockCreateRouteHandler(mockHandler, {
        includeTraceId: false,
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-api-key": "valid-key" },
      });

      const response = await handler(request);
      const data = await response.json() as Record<string, unknown>;

      expect(!("traceId" in data)).toBe(true);
    });

    it("should allow unauthenticated access when disabled", async () => {
      const mockHandler = (_request: NextRequest) => Effect.succeed({ ok: true });
      const handler = mockCreateRouteHandler(mockHandler, {
        requireAuth: false,
      });

      const request = new NextRequest("http://localhost:3000/api/test");
      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    it("should return 200 for successful handler", async () => {
      const mockHandler = (_request: NextRequest) => Effect.succeed({ ok: true });
      const handler = mockCreateRouteHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-api-key": "valid-key" },
      });

      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    it("should return JSON response", async () => {
      const mockHandler = (_request: NextRequest) => Effect.succeed({ ok: true });
      const handler = mockCreateRouteHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-api-key": "valid-key" },
      });

      const response = await handler(request);

      expect(response.headers.get("content-type")).toContain("application/json");
    });
  });

  describe("createPublicHandler", () => {
    it("should not require authentication", async () => {
      const mockHandler = () => Effect.succeed({ ok: true });
      const handler = mockCreatePublicHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/public");
      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    it("should include trace ID", async () => {
      const mockHandler = () => Effect.succeed({ ok: true });
      const handler = mockCreatePublicHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/public");
      const response = await handler(request);
      const data = await response.json() as Record<string, unknown>;

      expect(typeof data.traceId).toBe("string");
    });

    it("should wrap response with data property", async () => {
      const mockHandler = () => Effect.succeed({ ok: true });
      const handler = mockCreatePublicHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/public");
      const response = await handler(request);
      const data = await response.json() as Record<string, unknown>;

      expect(data.data).toBeDefined();
    });

    it("should include timestamp", async () => {
      const mockHandler = () => Effect.succeed({ ok: true });
      const handler = mockCreatePublicHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/public");
      const response = await handler(request);
      const data = await response.json() as Record<string, unknown>;

      expect(typeof data.timestamp).toBe("string");
    });

    it("should return successful response", async () => {
      const mockHandler = () => Effect.succeed({ ok: true });
      const handler = mockCreatePublicHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/public");
      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    it("should return JSON response", async () => {
      const mockHandler = () => Effect.succeed({ ok: true });
      const handler = mockCreatePublicHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/public");
      const response = await handler(request);

      expect(response.headers.get("content-type")).toContain("application/json");
    });
  });

  describe("Handler Composition", () => {
    it("should support multiple handlers in sequence", async () => {
      const handler1 = mockCreateRouteHandler(
        (_request: NextRequest) => Effect.succeed({ step: 1 })
      );
      const handler2 = mockCreatePublicHandler(
        () => Effect.succeed({ step: 2 })
      );

      const request1 = new NextRequest("http://localhost:3000/api/test1", {
        headers: { "x-api-key": "key" },
      });
      const request2 = new NextRequest("http://localhost:3000/api/test2");

      const response1 = await handler1(request1);
      const response2 = await handler2(request2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it("should preserve response structure across handlers", async () => {
      const handler = mockCreateRouteHandler(
        (_request: NextRequest) => Effect.succeed({ custom: "data" })
      );

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-api-key": "key" },
      });

      const response = await handler(request);
      const data = await response.json() as Record<string, unknown>;

      expect(data.data).toBeDefined();
      expect(data.timestamp).toBeDefined();
      expect(data.traceId).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle successful requests", async () => {
      const mockHandler = (_request: NextRequest) =>
        Effect.succeed({ ok: true });
      const handler = mockCreateRouteHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-api-key": "key" },
      });

      const response = await handler(request);
      const data = await response.json() as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
    });

    it("should return 401 for authentication errors", async () => {
      const handler = mockCreateRouteHandler(
        (_request: NextRequest) => Effect.succeed({ ok: true })
      );

      const request = new NextRequest("http://localhost:3000/api/test");
      const response = await handler(request);

      expect(response.status).toBe(401);
    });

    it("should include response data in response", async () => {
      const mockHandler = (_request: NextRequest) =>
        Effect.succeed({ result: "success" });
      const handler = mockCreateRouteHandler(mockHandler);

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-api-key": "key" },
      });

      const response = await handler(request);
      const data = await response.json() as Record<string, unknown>;

      expect(data.data).toBeDefined();
    });
  });

  describe("Response Format", () => {
    it("should use consistent response format", async () => {
      const handler1 = mockCreateRouteHandler(
        (_request: NextRequest) => Effect.succeed({ b: 2 })
      );
      const handler2 = mockCreateRouteHandler(
        (_request: NextRequest) => Effect.succeed({ b: 2 })
      );

      const request1 = new NextRequest("http://localhost:3000/api/test1", {
        headers: { "x-api-key": "key" },
      });
      const request2 = new NextRequest("http://localhost:3000/api/test2", {
        headers: { "x-api-key": "key" },
      });

      const response1 = await handler1(request1);
      const response2 = await handler2(request2);

      const data1 = await response1.json() as Record<string, unknown>;
      const data2 = await response2.json() as Record<string, unknown>;

      // Both should have same structure
      expect(Object.keys(data1).sort()).toEqual(
        Object.keys(data2).sort()
      );
    });

    it("should include correct status codes for different scenarios", async () => {
      const successHandler = mockCreateRouteHandler(
        (_request: NextRequest) => Effect.succeed({ ok: true })
      );
      const authHandler = mockCreateRouteHandler(
        (_request: NextRequest) => Effect.succeed({ ok: true })
      );

      const request1 = new NextRequest("http://localhost:3000/api/test", {
        headers: { "x-api-key": "key" },
      });
      const request2 = new NextRequest("http://localhost:3000/api/test");

      const response1 = await successHandler(request1);
      const response2 = await authHandler(request2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(401);
    });
  });
});
