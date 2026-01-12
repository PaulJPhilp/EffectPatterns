import {
  buildSnippet,
  type Pattern,
  loadPatternsFromDatabase,
  searchPatternsFromDatabase,
  getPatternFromDatabase,
} from "@effect-patterns/toolkit";
import { describe, expect, it } from "vitest";

describe("MCP Server Integration", () => {
  let patterns: readonly Pattern[];

  it("should load patterns from database", async () => {
    const patternsData = await loadPatternsFromDatabase();
    patterns = patternsData.patterns;

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0]).toHaveProperty("id");
    expect(patterns[0]).toHaveProperty("title");
  });

  it("should search patterns successfully", async () => {
    const patternsData = await loadPatternsFromDatabase();
    patterns = patternsData.patterns;

    const results = await searchPatternsFromDatabase({
      query: "effect",
      limit: 5,
    });

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it("should get pattern by ID", async () => {
    const patternsData = await loadPatternsFromDatabase();
    patterns = patternsData.patterns;

    if (patterns.length > 0) {
      const firstPattern = patterns[0];
      const result = await getPatternFromDatabase(firstPattern.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(firstPattern.id);
    }
  });

  it("should generate code snippet", async () => {
    const patternsData = await loadPatternsFromDatabase();
    patterns = patternsData.patterns;

    if (patterns.length > 0) {
      const snippet = buildSnippet({
        pattern: patterns[0],
        customName: "testExample",
        moduleType: "esm",
      });

      expect(snippet).toBeDefined();
      expect(typeof snippet).toBe("string");
      expect(snippet.length).toBeGreaterThan(0);
      expect(snippet).toContain("import");
    }
  });

  it("should handle missing pattern gracefully", async () => {
    const result = await getPatternFromDatabase("non-existent-pattern");
    expect(result).toBeNull();
  });
});
