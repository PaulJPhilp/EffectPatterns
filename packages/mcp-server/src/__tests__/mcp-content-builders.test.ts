/**
 * MCP Content Builders Tests
 *
 * Tests for rich content block generation and annotation utilities.
 */

import { describe, it, expect } from "vitest";
import {
  createTextBlock,
  createCodeBlock,
  createAnnotatedDiff,
  createAntiPatternAnnotation,
  buildPatternContent,
  buildViolationContent,
} from "../mcp-content-builders.js";

describe("MCP Content Builders", () => {
  describe("createTextBlock", () => {
    it("should create a text block with text content", () => {
      const block = createTextBlock("Hello, World!");
      expect(block.type).toBe("text");
      expect(block.text).toBe("Hello, World!");
    });

    it("should include annotations when provided", () => {
      const block = createTextBlock("Test", {
        priority: 1,
        audience: ["user"],
      });
      expect(block.annotations).toBeDefined();
      expect(block.annotations?.priority).toBe(1);
      expect(block.annotations?.audience).toContain("user");
    });

    it("should not include annotations when not provided", () => {
      const block = createTextBlock("Test");
      expect(block.annotations).toBeUndefined();
    });
  });

  describe("createCodeBlock", () => {
    it("should create a code block with language specification", () => {
      const code = 'console.log("hello")';
      const block = createCodeBlock(code, "typescript");
      expect(block.type).toBe("text");
      expect(block.text).toContain("```typescript");
      expect(block.text).toContain(code);
      expect(block.text).toContain("```");
    });

    it("should include description when provided", () => {
      const block = createCodeBlock("const x = 1", "typescript", "Example code");
      expect(block.text).toContain("Example code");
    });

    it("should default to typescript language", () => {
      const block = createCodeBlock("const x = 1");
      expect(block.text).toContain("```typescript");
    });

    it("should include annotations", () => {
      const block = createCodeBlock("const x = 1", "typescript", undefined, {
        priority: 2,
      });
      expect(block.annotations?.priority).toBe(2);
    });
  });

  describe("createAnnotatedDiff", () => {
    it("should create diff blocks with before and after sections", () => {
      const before = "const x = 1";
      const after = "const x: number = 1";

      const blocks = createAnnotatedDiff(before, after);

      expect(blocks.length).toBeGreaterThan(0);
      const blockTexts = blocks.map((b) => b.text).join("\n");
      expect(blockTexts).toContain("**Before (v3 style)**");
      expect(blockTexts).toContain("**After (v4 style)**");
      expect(blockTexts).toContain(before);
      expect(blockTexts).toContain(after);
    });

    it("should include explanation when provided", () => {
      const blocks = createAnnotatedDiff(
        "old",
        "new",
        undefined,
        "This is why we changed it"
      );
      const blockTexts = blocks.map((b) => b.text).join("\n");
      expect(blockTexts).toContain("This is why we changed it");
    });

    it("should annotate blocks with priorities", () => {
      const blocks = createAnnotatedDiff("before", "after");
      // First block should have priority 1 for before section label
      expect(blocks.some((b) => b.annotations?.priority === 1)).toBe(true);
      // After section blocks should have priority 2
      expect(blocks.some((b) => b.annotations?.priority === 2)).toBe(true);
    });
  });

  describe("createAntiPatternAnnotation", () => {
    it("should create high-priority annotation for high severity", () => {
      const ann = createAntiPatternAnnotation(
        "high",
        "Critical issue"
      );
      expect(ann.priority).toBe(1);
      expect(ann.audience).toContain("user");
    });

    it("should create medium-priority annotation for medium severity", () => {
      const ann = createAntiPatternAnnotation(
        "medium",
        "Warning"
      );
      expect(ann.priority).toBe(2);
    });

    it("should create low-priority annotation for low severity", () => {
      const ann = createAntiPatternAnnotation(
        "low",
        "Note"
      );
      expect(ann.priority).toBe(3);
    });

    it("should include lastModified timestamp", () => {
      const ann = createAntiPatternAnnotation(
        "high",
        "Test"
      );
      expect(ann.lastModified).toBeDefined();
    });
  });

  describe("buildPatternContent", () => {
    it("should build content array with all sections", () => {
      const content = buildPatternContent(
        "Test Pattern",
        "This is a test pattern",
        "const x = 1",
        ["Use case 1", "Use case 2"],
        ["Related 1"]
      );

      expect(content.length).toBeGreaterThan(0);
      const texts = content.map((b) => b.text).join("\n");
      expect(texts).toContain("Test Pattern");
      expect(texts).toContain("This is a test pattern");
      expect(texts).toContain("const x = 1");
      expect(texts).toContain("Use case 1");
      expect(texts).toContain("Related 1");
    });

    it("should work without optional sections", () => {
      const content = buildPatternContent(
        "Pattern",
        "Description",
        "code"
      );
      expect(content.length).toBeGreaterThan(0);
    });

    it("should annotate with proper priorities", () => {
      const content = buildPatternContent(
        "Title",
        "Desc",
        "code",
        []
      );
      expect(content.some((b) => b.annotations?.priority === 1)).toBe(true);
      expect(content.some((b) => b.annotations?.priority === 2)).toBe(true);
    });
  });

  describe("buildViolationContent", () => {
    it("should build violation content with all parts", () => {
      const content = buildViolationContent(
        "Invalid Pattern",
        "🔴 high",
        "This is bad",
        "Fix it by doing this"
      );

      expect(content.length).toBeGreaterThan(0);
      const texts = content.map((b) => b.text).join("\n");
      expect(texts).toContain("Invalid Pattern");
      expect(texts).toContain("This is bad");
      expect(texts).toContain("Fix it by doing this");
    });

    it("should include example when provided", () => {
      const content = buildViolationContent(
        "Pattern",
        "🟡 medium",
        "Message",
        "Remediation",
        "bad code"
      );
      const texts = content.map((b) => b.text).join("\n");
      expect(texts).toContain("bad code");
    });

    it("should work without optional example", () => {
      const content = buildViolationContent(
        "Pattern",
        "🔵 low",
        "Message",
        "Remediation"
      );
      expect(content.length).toBeGreaterThan(0);
    });
  });
});
