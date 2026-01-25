import { describe, expect, it } from "vitest";
import {
    elicitPatternId,
    elicitSearchFilters,
    elicitSearchQuery,
    isSearchQueryValid,
    isSearchTooBroad,
} from "../elicitation-helpers.js";

describe("Elicitation Helpers", () => {
  describe("elicitSearchQuery", () => {
    it("should return elicitation for missing query", () => {
      const result = elicitSearchQuery();
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("Search Query Needed");
      
      expect(result.structuredContent.type).toBe("elicitation");
      expect(result.structuredContent.needsInput?.fields).toContain("q");
      expect(result.structuredContent.needsInput?.suggestions).toBeDefined();
      expect(Array.isArray(result.structuredContent.needsInput?.suggestions?.q)).toBe(true);
    });
  });

  describe("elicitSearchFilters", () => {
    it("should return elicitation for too many results", () => {
      const result = elicitSearchFilters(50, ["validation", "service"], ["beginner", "intermediate"]);
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("Narrow Your Search");
      expect(result.content[0].text).toContain("50");
      
      expect(result.structuredContent.type).toBe("elicitation");
      expect(result.structuredContent.needsInput?.fields).toContain("category");
      expect(result.structuredContent.needsInput?.fields).toContain("difficulty");
      expect(result.structuredContent.options).toBeDefined();
      expect(result.structuredContent.options?.length).toBeGreaterThan(0);
    });

    it("should handle missing category/difficulty options", () => {
      const result = elicitSearchFilters(30);
      
      expect(result.structuredContent.options).toBeUndefined();
    });
  });

  describe("elicitPatternId", () => {
    it("should return elicitation for invalid pattern ID", () => {
      const result = elicitPatternId("invalid-pattern", ["valid-pattern-1", "valid-pattern-2"]);
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("Pattern Not Found");
      expect(result.content[0].text).toContain("invalid-pattern");
      expect(result.content[0].text).toContain("Did you mean");
      
      expect(result.structuredContent.type).toBe("elicitation");
      expect(result.structuredContent.needsInput?.fields).toContain("id");
      expect(result.structuredContent.needsInput?.suggestions?.id).toEqual(["valid-pattern-1", "valid-pattern-2"]);
    });

    it("should handle missing suggestions", () => {
      const result = elicitPatternId("unknown");
      
      expect(result.structuredContent.needsInput?.suggestions).toBeUndefined();
      expect(result.structuredContent.options).toBeUndefined();
    });
  });

  describe("isSearchQueryValid", () => {
    it("should return false for empty query", () => {
      expect(isSearchQueryValid()).toBe(false);
      expect(isSearchQueryValid("")).toBe(false);
      expect(isSearchQueryValid("   ")).toBe(false);
    });

    it("should return true for valid query", () => {
      expect(isSearchQueryValid("error")).toBe(true);
      expect(isSearchQueryValid("error handling")).toBe(true);
    });
  });

  describe("isSearchTooBroad", () => {
    it("should return true for unfiltered large result sets", () => {
      expect(isSearchTooBroad(25, false)).toBe(true);
      expect(isSearchTooBroad(21, false)).toBe(true);
    });

    it("should return false for filtered results", () => {
      expect(isSearchTooBroad(25, true)).toBe(false);
      expect(isSearchTooBroad(100, true)).toBe(false);
    });

    it("should return false for small result sets", () => {
      expect(isSearchTooBroad(20, false)).toBe(false);
      expect(isSearchTooBroad(10, false)).toBe(false);
    });
  });
});
