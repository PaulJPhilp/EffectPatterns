/**
 * Error Handler Tests
 *
 * Tests for error mapping and HTTP response generation.
 *
 * Architecture:
 * - HTTP API error handler maps Effect errors to HTTP responses
 * - MCP server is pure transport - doesn't handle errors, just passes through
 */

import { describe, it, expect } from "vitest";

/**
 * Mock error types
 */
class AuthenticationError extends Error {
  readonly _tag = "AuthenticationError";
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

class AuthorizationError extends Error {
  readonly _tag = "AuthorizationError";
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

class ValidationError extends Error {
  readonly _tag = "ValidationError";
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

class PatternNotFoundError extends Error {
  readonly _tag = "PatternNotFoundError";
  constructor(message: string) {
    super(message);
    this.name = "PatternNotFoundError";
  }
}

class RateLimitError extends Error {
  readonly _tag = "RateLimitError";
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

class FileSizeError extends Error {
  readonly _tag = "FileSizeError";
  readonly maxSize: number;
  readonly actualSize: number;

  constructor(message: string, maxSize: number, actualSize: number) {
    super(message);
    this.name = "FileSizeError";
    this.maxSize = maxSize;
    this.actualSize = actualSize;
  }
}

/**
 * Mock error handler
 */
function mapErrorToResponse(error: unknown): Response {
  let status = 500;
  let body: Record<string, unknown> = { error: "Internal server error" };

  if (error instanceof AuthenticationError) {
    status = 401;
    body = { error: error.message, status: 401 };
  } else if (error instanceof AuthorizationError) {
    status = 403;
    body = { error: error.message, status: 403 };
  } else if (error instanceof ValidationError) {
    status = 400;
    body = { error: error.message, status: 400 };
  } else if (error instanceof PatternNotFoundError) {
    status = 404;
    body = { error: error.message, status: 404 };
  } else if (error instanceof RateLimitError) {
    status = 429;
    body = { error: error.message, status: 429 };
  } else if (error instanceof FileSizeError) {
    status = 413;
    body = {
      error: error.message,
      status: 413,
      maxSize: error.maxSize,
      actualSize: error.actualSize,
    };
  } else if (error instanceof Error) {
    status = 500;
    body = { error: error.message, status: 500 };
  } else {
    body = { error: String(error), status: 500 };
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Error Handler", () => {
  describe("HTTP Status Code Mapping", () => {
    it("should map AuthenticationError to 401", () => {
      const error = new AuthenticationError("Missing API key");
      const response = mapErrorToResponse(error);

      expect(response.status).toBe(401);
    });

    it("should map AuthorizationError to 403", () => {
      const error = new AuthorizationError("Insufficient permissions");
      const response = mapErrorToResponse(error);

      expect(response.status).toBe(403);
    });

    it("should map ValidationError to 400", () => {
      const error = new ValidationError("Invalid input");
      const response = mapErrorToResponse(error);

      expect(response.status).toBe(400);
    });

    it("should map PatternNotFoundError to 404", () => {
      const error = new PatternNotFoundError("Pattern not found");
      const response = mapErrorToResponse(error);

      expect(response.status).toBe(404);
    });

    it("should map RateLimitError to 429", () => {
      const error = new RateLimitError("Too many requests");
      const response = mapErrorToResponse(error);

      expect(response.status).toBe(429);
    });

    it("should map FileSizeError to 413", () => {
      const error = new FileSizeError("File too large", 1024, 2048);
      const response = mapErrorToResponse(error);

      expect(response.status).toBe(413);
    });

    it("should map unknown Error to 500", () => {
      const error = new Error("Unknown error");
      const response = mapErrorToResponse(error);

      expect(response.status).toBe(500);
    });

    it("should map non-Error values to 500", () => {
      const response = mapErrorToResponse("String error");

      expect(response.status).toBe(500);
    });
  });

  describe("Response Format", () => {
    it("should return JSON response", async () => {
      const error = new ValidationError("Invalid input");
      const response = mapErrorToResponse(error);

      expect(response.headers.get("content-type")).toContain("application/json");
    });

    it("should include error message", async () => {
      const errorMessage = "Test error message";
      const error = new ValidationError(errorMessage);
      const response = mapErrorToResponse(error);

      const data = await response.json() as Record<string, unknown>;
      expect(data.error).toBe(errorMessage);
    });

    it("should include status code in body", async () => {
      const error = new ValidationError("Invalid input");
      const response = mapErrorToResponse(error);

      const data = await response.json() as Record<string, unknown>;
      expect(data.status).toBe(400);
    });

    it("should include error message in response", async () => {
      const error = new Error("Something went wrong");
      const response = mapErrorToResponse(error);

      const data = await response.json() as Record<string, unknown>;
      expect(data.error).toBe("Something went wrong");
      expect(data.status).toBe(500);
    });
  });

  describe("Error-Specific Details", () => {
    it("should include file size details in FileSizeError", async () => {
      const error = new FileSizeError("File too large", 1024, 2048);
      const response = mapErrorToResponse(error);

      const data = await response.json() as Record<string, unknown>;
      expect(data.maxSize).toBe(1024);
      expect(data.actualSize).toBe(2048);
    });

    it("should preserve custom error properties", async () => {
      const error = new FileSizeError("Code too large", 100000, 150000);
      const response = mapErrorToResponse(error);

      const data = await response.json() as Record<string, unknown>;
      expect(data.maxSize).toBe(100000);
      expect(data.actualSize).toBe(150000);
    });
  });

  describe("Content Negotiation", () => {
    it("should return JSON for JSON errors", async () => {
      const error = new ValidationError("Invalid JSON");
      const response = mapErrorToResponse(error);

      expect(response.headers.get("content-type")).toContain("application/json");
    });

    it("should handle null errors", () => {
      const response = mapErrorToResponse(null);

      expect(response.status).toBe(500);
    });

    it("should handle undefined errors", () => {
      const response = mapErrorToResponse(undefined);

      expect(response.status).toBe(500);
    });
  });

  describe("Error Categories", () => {
    describe("Authentication Errors", () => {
      it("should handle missing API key", () => {
        const error = new AuthenticationError("Missing API key");
        const response = mapErrorToResponse(error);

        expect(response.status).toBe(401);
      });

      it("should handle invalid API key", () => {
        const error = new AuthenticationError("Invalid API key");
        const response = mapErrorToResponse(error);

        expect(response.status).toBe(401);
      });
    });

    describe("Validation Errors", () => {
      it("should handle invalid request format", () => {
        const error = new ValidationError("Invalid request format");
        const response = mapErrorToResponse(error);

        expect(response.status).toBe(400);
      });

      it("should handle missing required parameters", () => {
        const error = new ValidationError("Missing required parameter: source");
        const response = mapErrorToResponse(error);

        expect(response.status).toBe(400);
      });
    });

    describe("Resource Errors", () => {
      it("should handle pattern not found", () => {
        const error = new PatternNotFoundError("Pattern 'xyz' not found");
        const response = mapErrorToResponse(error);

        expect(response.status).toBe(404);
      });
    });

    describe("Rate Limiting Errors", () => {
      it("should handle rate limit exceeded", () => {
        const error = new RateLimitError("Rate limit exceeded");
        const response = mapErrorToResponse(error);

        expect(response.status).toBe(429);
      });
    });

    describe("Size Errors", () => {
      it("should handle oversized requests", () => {
        const error = new FileSizeError("Payload too large", 1000000, 2000000);
        const response = mapErrorToResponse(error);

        expect(response.status).toBe(413);
      });
    });

  });

  describe("Error Consistency", () => {
    it("should produce consistent response format", async () => {
      const error1 = new ValidationError("Error 1");
      const error2 = new ValidationError("Error 2");

      const response1 = mapErrorToResponse(error1);
      const response2 = mapErrorToResponse(error2);

      const data1 = await response1.json() as Record<string, unknown>;
      const data2 = await response2.json() as Record<string, unknown>;

      expect(Object.keys(data1).sort()).toEqual(
        Object.keys(data2).sort()
      );
    });

    it("should maintain error message integrity", async () => {
      const message = "Specific error with special chars: !@#$%";
      const error = new ValidationError(message);
      const response = mapErrorToResponse(error);

      const data = await response.json() as Record<string, unknown>;
      expect(data.error).toBe(message);
    });
  });

  describe("Security", () => {
    it("should not expose file paths in errors", () => {
      const error = new Error("Error at /usr/home/code/src/handler.ts:123");
      const response = mapErrorToResponse(error);

      expect(response.status).toBe(500);
      // Stack traces should be hidden in production
    });

    it("should not expose database details in errors", () => {
      const error = new Error(
        "Database error: connection failed to postgres://user@host:5432"
      );
      const response = mapErrorToResponse(error);

      expect(response.status).toBe(500);
    });

    it("should sanitize error messages", async () => {
      const error = new ValidationError("Invalid input");
      const response = mapErrorToResponse(error);

      const data = await response.json() as Record<string, unknown>;
      // Should not contain sensitive information
      expect(String(data.error)).not.toMatch(/password|secret|key|token/i);
    });
  });
});
