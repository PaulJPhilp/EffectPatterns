/**
 * Pattern Diff Generator Tests
 *
 * Tests for migration diff generation functionality.
 */

import { describe, it, expect } from "vitest";
import {
  generateMigrationDiff,
  listMigrationPatterns,
  isMigrationPattern,
} from "../api.js";

describe("Pattern Diff Generator", () => {
  describe("isMigrationPattern", () => {
    it("should identify known migration patterns", () => {
      expect(isMigrationPattern("effect-fail-tagged-error")).toBe(true);
      expect(isMigrationPattern("service-effect-service-with-layer")).toBe(
        true
      );
      expect(isMigrationPattern("effect-catch-tag-vs-catch-all")).toBe(true);
    });

    it("should reject unknown patterns", () => {
      expect(isMigrationPattern("unknown-pattern")).toBe(false);
      expect(isMigrationPattern("not-a-pattern")).toBe(false);
    });
  });

  describe("listMigrationPatterns", () => {
    it("should return array of pattern IDs", () => {
      const patterns = listMigrationPatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it("should include known patterns", () => {
      const patterns = listMigrationPatterns();
      expect(patterns).toContain("effect-fail-tagged-error");
      expect(patterns).toContain("service-effect-service-with-layer");
    });

    it("should only contain strings", () => {
      const patterns = listMigrationPatterns();
      expect(patterns.every((p) => typeof p === "string")).toBe(true);
    });
  });

  describe("generateMigrationDiff", () => {
    it("should return empty array for unknown patterns", () => {
      const diff = generateMigrationDiff("unknown");
      expect(diff).toEqual([]);
    });

    it("should generate diff for known migration patterns", () => {
      const diff = generateMigrationDiff("effect-fail-tagged-error");
      expect(diff.length).toBeGreaterThan(0);
    });

    it("should include before and after sections", () => {
      const diff = generateMigrationDiff("effect-fail-tagged-error");
      const texts = diff.map((b) => b.text).join("\n");
      expect(texts).toContain("Before (v3 style)");
      expect(texts).toContain("After (v4 style)");
    });

    it("should include explanation", () => {
      const diff = generateMigrationDiff("effect-fail-tagged-error");
      expect(diff.length).toBeGreaterThan(0);
      // Should have explanation about v4 changes
      const hasExplanation = diff.some(
        (b) =>
          b.text.includes("Effect.fail") ||
          b.text.includes("TaggedError")
      );
      expect(hasExplanation).toBe(true);
    });

    it("should include annotations with priorities", () => {
      const diff = generateMigrationDiff("service-effect-service-with-layer");
      const hasAnnotations = diff.some((b) => b.annotations !== undefined);
      expect(hasAnnotations).toBe(true);
    });

    it("should have proper MCP TextContent structure", () => {
      const diff = generateMigrationDiff("effect-catch-tag-vs-catch-all");
      expect(
        diff.every((block) => block.type === "text" && typeof block.text === "string")
      ).toBe(true);
    });

    it("should include anti-pattern highlighting", () => {
      const diff = generateMigrationDiff("effect-fail-tagged-error");
      const texts = diff.map((b) => b.text).join("\n");
      // Should have warning indicators or anti-pattern markers
      const hasWarning = texts.includes("❌") || texts.includes("⚠️");
      expect(hasWarning).toBe(true);
    });

    it("should include improvement annotations", () => {
      const diff = generateMigrationDiff("effect-fail-tagged-error");
      const texts = diff.map((b) => b.text).join("\n");
      // Should have success/improvement indicators
      const hasSuccess = texts.includes("✅");
      expect(hasSuccess).toBe(true);
    });

    it("layer-merge-composition should show proper migration", () => {
      const diff = generateMigrationDiff("layer-merge-composition");
      const texts = diff.map((b) => b.text).join("\n");
      expect(texts).toContain("Layer.merge");
      expect(texts).toContain("Layer.mergeAll");
    });

    it("should have text blocks with proper annotations", () => {
      const diff = generateMigrationDiff("effect-catch-tag-vs-catch-all");
      const blocksWithAnnotations = diff.filter(
        (b) => b.annotations !== undefined
      );
      expect(blocksWithAnnotations.length).toBeGreaterThan(0);
      expect(
        blocksWithAnnotations.every(
          (b) =>
            b.annotations?.audience !== undefined &&
            Array.isArray(b.annotations.audience)
        )
      ).toBe(true);
    });
  });

  describe("Migration patterns content", () => {
    it("effect-fail-tagged-error should demonstrate typed errors", () => {
      const diff = generateMigrationDiff("effect-fail-tagged-error");
      const text = diff.map((b) => b.text).join("\n");
      expect(text).toContain("Data.TaggedError");
      expect(text).toContain("Error");
    });

    it("service-effect-service-with-layer should show scoped vs effect", () => {
      const diff = generateMigrationDiff("service-effect-service-with-layer");
      const text = diff.map((b) => b.text).join("\n");
      expect(text).toContain("scoped:");
      expect(text).toContain("Effect.addFinalizer");
    });

    it("effect-catch-tag-vs-catch-all should show catchTag usage", () => {
      const diff = generateMigrationDiff("effect-catch-tag-vs-catch-all");
      const text = diff.map((b) => b.text).join("\n");
      expect(text).toContain("catchTag");
      expect(text).toContain("UserNotFoundError");
    });

    it("layer-merge-composition should show Layer.mergeAll usage", () => {
      const diff = generateMigrationDiff("layer-merge-composition");
      const text = diff.map((b) => b.text).join("\n");
      expect(text).toContain("Layer.mergeAll");
    });
  });
});
