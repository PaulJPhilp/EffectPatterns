/**
 * Cache Key Generation Tests
 *
 * Verifies that cache keys are generated consistently and deterministically,
 * ensuring that identical searches with different argument orders produce
 * the same cache key and hit the cache correctly.
 */

import type { SearchPatternsArgs } from "@/schemas/tool-schemas";
import { describe, expect, it } from "vitest";
import {
    generatePatternCacheKey,
    generateRequestCacheKey,
    generateSearchCacheKey,
} from "./cache-keys";

describe("Cache Key Generation", () => {
  describe("generateSearchCacheKey()", () => {
    it("should generate consistent keys for identical search args", () => {
      const args1: SearchPatternsArgs = {
        q: "effect-service",
        limit: 5,
        category: "service",
      };

      const args2: SearchPatternsArgs = {
        q: "effect-service",
        limit: 5,
        category: "service",
      };

      const key1 = generateSearchCacheKey(args1);
      const key2 = generateSearchCacheKey(args2);

      expect(key1).toBe(key2);
      expect(key1).toContain("search:v1:");
    });

    it("should generate identical keys regardless of argument order", () => {
      // Same search with different argument order in the objects
      const args1: SearchPatternsArgs = {
        q: "error-handling",
        category: "error-handling",
        limit: 10,
        format: "markdown",
      };

      const args2: SearchPatternsArgs = {
        format: "markdown",
        limit: 10,
        category: "error-handling",
        q: "error-handling",
      };

      const key1 = generateSearchCacheKey(args1);
      const key2 = generateSearchCacheKey(args2);

      expect(key1).toBe(key2);
    });

    it("should generate different keys for different queries", () => {
      const args1: SearchPatternsArgs = {
        q: "effect-service",
      };

      const args2: SearchPatternsArgs = {
        q: "retry-pattern",
      };

      const key1 = generateSearchCacheKey(args1);
      const key2 = generateSearchCacheKey(args2);

      expect(key1).not.toBe(key2);
    });

    it("should generate different keys for different categories", () => {
      const args1: SearchPatternsArgs = {
        q: "async",
        category: "concurrency",
      };

      const args2: SearchPatternsArgs = {
        q: "async",
        category: "error-handling",
      };

      const key1 = generateSearchCacheKey(args1);
      const key2 = generateSearchCacheKey(args2);

      expect(key1).not.toBe(key2);
    });

    it("should generate different keys for different difficulty levels", () => {
      const args1: SearchPatternsArgs = {
        q: "pattern",
        difficulty: "beginner",
      };

      const args2: SearchPatternsArgs = {
        q: "pattern",
        difficulty: "advanced",
      };

      const key1 = generateSearchCacheKey(args1);
      const key2 = generateSearchCacheKey(args2);

      expect(key1).not.toBe(key2);
    });

    it("should handle undefined/optional parameters consistently", () => {
      const args1: SearchPatternsArgs = {
        q: "test",
        limit: 3,
        // category and difficulty are undefined
      };

      const args2: SearchPatternsArgs = {
        q: "test",
        limit: 3,
        category: undefined,
        difficulty: undefined,
      };

      const key1 = generateSearchCacheKey(args1);
      const key2 = generateSearchCacheKey(args2);

      expect(key1).toBe(key2);
    });

    it("should handle special characters in query safely", () => {
      const args1: SearchPatternsArgs = {
        q: "Effect:Service",
      };

      const args2: SearchPatternsArgs = {
        q: "Effect:Service",
      };

      const key1 = generateSearchCacheKey(args1);
      const key2 = generateSearchCacheKey(args2);

      expect(key1).toBe(key2);
      // Should not contain unescaped separators that could cause collisions
      expect(key1).not.toContain("Effect:Service:");
    });

    it("should include all relevant parameters in the key", () => {
      const args: SearchPatternsArgs = {
        q: "effect-service",
        category: "service",
        difficulty: "intermediate",
        limit: 5,
        format: "json",
        limitCards: 3,
        includeProvenancePanel: true,
        includeStructuredPatterns: true,
      };

      const key = generateSearchCacheKey(args);

      // Key should be deterministic and include version
      expect(key).toContain("search:v1:");
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(20);
    });
  });

  describe("generateRequestCacheKey()", () => {
    it("should generate consistent keys for identical requests", () => {
      const key1 = generateRequestCacheKey("/patterns", "GET");
      const key2 = generateRequestCacheKey("/patterns", "GET");

      expect(key1).toBe(key2);
      expect(key1).toContain("GET:/patterns:v1");
    });

    it("should distinguish between GET and POST", () => {
      const key1 = generateRequestCacheKey("/patterns", "GET");
      const key2 = generateRequestCacheKey("/patterns", "POST");

      expect(key1).not.toBe(key2);
      expect(key1).toContain("GET:");
      expect(key2).toContain("POST:");
    });

    it("should distinguish between different endpoints", () => {
      const key1 = generateRequestCacheKey("/patterns", "GET");
      const key2 = generateRequestCacheKey("/patterns/search", "GET");

      expect(key1).not.toBe(key2);
    });

    it("should serialize request data with sorted keys", () => {
      const data1 = { a: 1, b: 2, c: 3 };
      const data2 = { c: 3, a: 1, b: 2 };

      const key1 = generateRequestCacheKey("/analyze", "POST", data1);
      const key2 = generateRequestCacheKey("/analyze", "POST", data2);

      expect(key1).toBe(key2);
    });

    it("should handle missing request data", () => {
      const key1 = generateRequestCacheKey("/patterns", "GET");
      const key2 = generateRequestCacheKey("/patterns", "GET", undefined);

      expect(key1).toBe(key2);
    });

    it("should handle nested data structures with sorted keys", () => {
      const data1 = {
        outer: { z: 1, a: 2 },
        first: "value",
      };

      const data2 = {
        first: "value",
        outer: { a: 2, z: 1 },
      };

      const key1 = generateRequestCacheKey("/test", "POST", data1);
      const key2 = generateRequestCacheKey("/test", "POST", data2);

      expect(key1).toBe(key2);
    });
  });

  describe("generatePatternCacheKey()", () => {
    it("should generate consistent keys for same pattern ID", () => {
      const key1 = generatePatternCacheKey("effect-service");
      const key2 = generatePatternCacheKey("effect-service");

      expect(key1).toBe(key2);
      expect(key1).toBe("pattern:v1:effect-service");
    });

    it("should generate different keys for different pattern IDs", () => {
      const key1 = generatePatternCacheKey("effect-service");
      const key2 = generatePatternCacheKey("retry-pattern");

      expect(key1).not.toBe(key2);
    });

    it("should include version in the key", () => {
      const key = generatePatternCacheKey("test-pattern");

      expect(key).toContain(":v1:");
    });
  });

  describe("Cache Key Stability (Determinism)", () => {
    it("should produce identical keys across multiple invocations", () => {
      const args: SearchPatternsArgs = {
        q: "stream-composition",
        category: "streams",
        difficulty: "advanced",
        limit: 10,
        format: "both",
      };

      const keys = Array.from({ length: 5 }, () =>
        generateSearchCacheKey(args)
      );

      // All keys should be identical
      const firstKey = keys[0];
      expect(keys.every((k) => k === firstKey)).toBe(true);
    });

    it("should be independent of JavaScript object property iteration order", () => {
      // Create args through different means that might affect property order
      const args1: SearchPatternsArgs = Object.assign({}, {
        q: "test",
        limit: 5,
        category: "service" as SearchPatternsArgs["category"],
      });

      const args2: SearchPatternsArgs = Object.assign({}, {
        category: "service" as SearchPatternsArgs["category"],
        q: "test",
        limit: 5,
      });

      const key1 = generateSearchCacheKey(args1);
      const key2 = generateSearchCacheKey(args2);

      expect(key1).toBe(key2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty strings in search query", () => {
      const args1: SearchPatternsArgs = {
        q: "",
      };

      const args2: SearchPatternsArgs = {
        q: "",
      };

      const key1 = generateSearchCacheKey(args1);
      const key2 = generateSearchCacheKey(args2);

      expect(key1).toBe(key2);
    });

    it("should handle whitespace in search query", () => {
      const args1: SearchPatternsArgs = {
        q: "  effect  service  ",
      };

      const args2: SearchPatternsArgs = {
        q: "  effect  service  ",
      };

      const key1 = generateSearchCacheKey(args1);
      const key2 = generateSearchCacheKey(args2);

      expect(key1).toBe(key2);
    });

    it("should handle unicode characters", () => {
      const args1: SearchPatternsArgs = {
        q: "effect-pattern-🎯",
      };

      const args2: SearchPatternsArgs = {
        q: "effect-pattern-🎯",
      };

      const key1 = generateSearchCacheKey(args1);
      const key2 = generateSearchCacheKey(args2);

      expect(key1).toBe(key2);
    });

    it("should handle very long queries", () => {
      const longQuery = "a".repeat(1000);
      const args1: SearchPatternsArgs = { q: longQuery };
      const args2: SearchPatternsArgs = { q: longQuery };

      const key1 = generateSearchCacheKey(args1);
      const key2 = generateSearchCacheKey(args2);

      expect(key1).toBe(key2);
    });
  });
});
