/**
 * Tool Shared Utilities Tests
 *
 * Verifies cache metrics tracking and shared helper functions work correctly.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
    extractApiNames,
    generateRequestId,
    getCacheMetrics,
    normalizeAnnotations,
    normalizeContentBlocks,
    recordPatternHit,
    recordPatternMiss,
    recordSearchHit,
    recordSearchMiss,
    truncateAtWordBoundary,
} from "./tool-shared";

describe("Tool Shared Utilities", () => {
  describe("Cache Metrics Tracking", () => {
    beforeEach(() => {
      // Reset metrics before each test
      getCacheMetrics();
      // Note: We can't directly reset, but getCacheMetrics returns a copy
    });

    it("should track search cache hits", () => {
      const initialMetrics = getCacheMetrics();
      recordSearchHit();
      const updatedMetrics = getCacheMetrics();

      expect(updatedMetrics.searchHits).toBe(initialMetrics.searchHits + 1);
    });

    it("should track search cache misses", () => {
      const initialMetrics = getCacheMetrics();
      recordSearchMiss();
      const updatedMetrics = getCacheMetrics();

      expect(updatedMetrics.searchMisses).toBe(initialMetrics.searchMisses + 1);
    });

    it("should track pattern cache hits", () => {
      const initialMetrics = getCacheMetrics();
      recordPatternHit();
      const updatedMetrics = getCacheMetrics();

      expect(updatedMetrics.patternHits).toBe(initialMetrics.patternHits + 1);
    });

    it("should track pattern cache misses", () => {
      const initialMetrics = getCacheMetrics();
      recordPatternMiss();
      const updatedMetrics = getCacheMetrics();

      expect(updatedMetrics.patternMisses).toBe(initialMetrics.patternMisses + 1);
    });

    it("should return frozen, independent copies of metrics", () => {
      const metrics1 = getCacheMetrics();
      const metrics2 = getCacheMetrics();

      // Returned metrics should be frozen (immutable)
      expect(Object.isFrozen(metrics1)).toBe(true);

      // Each call returns an independent snapshot
      expect(metrics1).toEqual(metrics2);
      expect(metrics1).not.toBe(metrics2);
    });
  });

  describe("generateRequestId()", () => {
    it("should generate unique request IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).not.toBe(id2);
    });

    it("should follow the expected format", () => {
      const id = generateRequestId();

      expect(id).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id.startsWith("req_")).toBe(true);
    });

    it("should include timestamp", () => {
      const before = Date.now();
      const id = generateRequestId();
      const after = Date.now();

      // Extract timestamp from ID
      const timestampStr = id.substring(4, 4 + String(before).length);
      const timestamp = parseInt(timestampStr, 10);

      expect(timestamp).toBeGreaterThanOrEqual(before - 100);
      expect(timestamp).toBeLessThanOrEqual(after + 100);
    });
  });

  describe("normalizeAnnotations()", () => {
    it("should return undefined for undefined input", () => {
      const result = normalizeAnnotations(undefined);
      expect(result).toBeUndefined();
    });

    it("should pass through annotations without priority", () => {
      const input = { audience: ["user"] as ("user" | "assistant")[] };
      const result = normalizeAnnotations(input);

      expect(result).toEqual(input);
    });

    it("should clamp priority to maximum 1", () => {
      const input = { priority: 2, audience: ["user"] as ("user" | "assistant")[] };
      const result = normalizeAnnotations(input);

      expect(result?.priority).toBe(1);
    });

    it("should preserve priority if valid", () => {
      const input = { priority: 0.5, audience: ["user"] as ("user" | "assistant")[] };
      const result = normalizeAnnotations(input);

      expect(result?.priority).toBe(0.5);
    });
  });

  describe("normalizeContentBlocks()", () => {
    it("should filter out blocks without text field", () => {
      const input = [
        { type: "text" as const, text: "valid" },
        { type: "text" as const, text: null as any },
        { type: "text" as const, text: "also valid" },
      ];

      const result = normalizeContentBlocks(input);

      expect(result.length).toBe(2);
      expect(result[0].text).toBe("valid");
      expect(result[1].text).toBe("also valid");
    });

    it("should preserve blocks with valid text", () => {
      const input = [
        { type: "text" as const, text: "valid text" },
        { type: "text" as const, text: "another valid" },
      ];

      const result = normalizeContentBlocks(input);

      expect(result.length).toBe(2);
      expect(result[0].text).toBe("valid text");
    });
  });

  describe("extractApiNames()", () => {
    it("should return an array", () => {
      const code = "Effect.gen(function* () { })";
      const names = extractApiNames(code);

      expect(Array.isArray(names)).toBe(true);
    });

    it("should limit to 6 unique names", () => {
      const code = `
        Effect.gen Effect.map Effect.tap Effect.flatMap
        Effect.catchAll Effect.orElse Effect.zipWith
      `;
      const names = extractApiNames(code);

      expect(names.length).toBeLessThanOrEqual(6);
    });

    it("should return empty array for non-Effect code", () => {
      const code = "const x = 42; console.log(x);";
      const names = extractApiNames(code);

      expect(names.length).toBe(0);
    });
  });

  describe("truncateAtWordBoundary()", () => {
    it("should not truncate text shorter than max length", () => {
      const text = "Hello world";
      const result = truncateAtWordBoundary(text, 20);

      expect(result).toBe("Hello world");
    });

    it("should truncate at word boundary", () => {
      const text = "Hello world example test";
      const result = truncateAtWordBoundary(text, 15);

      expect(result).toContain("...");
      expect(result).not.toContain("example");
    });

    it("should add ellipsis when truncating", () => {
      const text = "This is a long sentence that will be truncated";
      const result = truncateAtWordBoundary(text, 20);

      expect(result.endsWith("...")).toBe(true);
    });

    it("should find a word boundary when possible", () => {
      const text = "Hello world beautiful day";
      const result = truncateAtWordBoundary(text, 15);

      // Should truncate at a word boundary
      expect(result.endsWith("...")).toBe(true);
      expect(result.includes("Hello")).toBe(true);
    });

    it("should handle very short max length", () => {
      const text = "Hello world";
      const result = truncateAtWordBoundary(text, 5);

      expect(result.length).toBeLessThanOrEqual(8); // 5 + "..."
      expect(result.endsWith("...")).toBe(true);
    });

    it("should handle text with no spaces", () => {
      const text = "supercalifragilisticexpialidocious";
      const result = truncateAtWordBoundary(text, 10);

      expect(result.length).toBeLessThanOrEqual(13); // 10 + "..."
      expect(result.endsWith("...")).toBe(true);
    });
  });
});
