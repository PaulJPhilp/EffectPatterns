/**
 * MCP Content Builders Tests
 *
 * Tests for rich content block generation and annotation utilities.
 */

import { describe, expect, it } from "vitest";
import {
    buildPatternContent,
    buildScanFirstPatternContent,
    buildSearchResultsContent,
    buildViolationContent,
    createAnnotatedDiff,
    createAntiPatternAnnotation,
    createCodeBlock,
    createFindingsSummary,
    createSeverityBlock,
    createTextBlock,
    createTOC,
    extractTLDRPoints,
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
      expect(block.annotations?.priority).toBe(1);
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
      // No block should exceed priority 1
      expect(blocks.every((b) => (b.annotations?.priority ?? 1) <= 1)).toBe(true);
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
      expect(content.every((b) => (b.annotations?.priority ?? 1) <= 1)).toBe(true);
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

    it("should include severity label in header", () => {
      const content = buildViolationContent(
        "Test",
        "🔴 high",
        "Message",
        "Fix"
      );
      const texts = content.map((b) => b.text).join("\n");
      expect(texts).toContain("[🔴 HIGH SEVERITY]");
    });

    it("should include advisory label for medium severity", () => {
      const content = buildViolationContent(
        "Test",
        "🟡 medium",
        "Message",
        "Fix"
      );
      const texts = content.map((b) => b.text).join("\n");
      expect(texts).toContain("[🟡 ADVISORY]");
    });

    it("should include info label for low severity", () => {
      const content = buildViolationContent(
        "Test",
        "🔵 low",
        "Message",
        "Fix"
      );
      const texts = content.map((b) => b.text).join("\n");
      expect(texts).toContain("[🔵 INFO]");
    });

    it("should use blockquotes for emphasis", () => {
      const content = buildViolationContent(
        "Test",
        "🔴 high",
        "Message",
        "Fix"
      );
      const texts = content.map((b) => b.text).join("\n");
      expect(texts).toContain("> ");
    });
  });

  describe("createSeverityBlock", () => {
    it("should create high severity block", () => {
      const blocks = createSeverityBlock(
        "high",
        "Critical Issue",
        "This is critical"
      );
      expect(blocks.length).toBeGreaterThan(0);
      const texts = blocks.map((b) => b.text).join("\n");
      expect(texts).toContain("[🔴 HIGH SEVERITY]");
      expect(texts).toContain("Critical Issue");
    });

    it("should create medium severity block", () => {
      const blocks = createSeverityBlock(
        "medium",
        "Advisory",
        "This is advisory"
      );
      const texts = blocks.map((b) => b.text).join("\n");
      expect(texts).toContain("[🟡 ADVISORY]");
    });

    it("should create low severity block", () => {
      const blocks = createSeverityBlock(
        "low",
        "Info",
        "This is info"
      );
      const texts = blocks.map((b) => b.text).join("\n");
      expect(texts).toContain("[🔵 INFO]");
    });

    it("should include code block when provided", () => {
      const blocks = createSeverityBlock(
        "high",
        "Issue",
        "Description",
        "const x = 1"
      );
      const texts = blocks.map((b) => b.text).join("\n");
      expect(texts).toContain("```typescript");
      expect(texts).toContain("const x = 1");
    });

    it("should prioritize high severity blocks", () => {
      const blocks = createSeverityBlock(
        "high",
        "Issue",
        "Description"
      );
      expect(blocks[0].annotations?.priority).toBe(1);
    });

    it("should prioritize medium severity blocks", () => {
      const blocks = createSeverityBlock(
        "medium",
        "Issue",
        "Description"
      );
      expect(blocks[0].annotations?.priority).toBe(1);
    });

    it("should prioritize low severity blocks", () => {
      const blocks = createSeverityBlock(
        "low",
        "Issue",
        "Description"
      );
      expect(blocks[0].annotations?.priority).toBe(1);
    });
  });

  describe("createFindingsSummary", () => {
    it("should group findings by severity", () => {
      const findings = [
        {
          severity: "high" as const,
          title: "High Issue",
          description: "High severity",
        },
        {
          severity: "medium" as const,
          title: "Medium Issue",
          description: "Medium severity",
        },
        {
          severity: "low" as const,
          title: "Low Issue",
          description: "Low severity",
        },
      ];

      const blocks = createFindingsSummary(findings);
      const texts = blocks.map((b) => b.text).join("\n");

      expect(texts).toContain("🔴 High Severity");
      expect(texts).toContain("🟡 Advisory");
      expect(texts).toContain("🔵 Info");
    });

    it("should include finding count in summary", () => {
      const findings = [
        { severity: "high" as const, title: "Issue", description: "Desc" },
      ];

      const blocks = createFindingsSummary(findings);
      const texts = blocks.map((b) => b.text).join("\n");

      expect(texts).toContain("Findings Summary (1 total)");
    });

    it("should show correct count per severity", () => {
      const findings = [
        { severity: "high" as const, title: "Issue 1", description: "Desc" },
        { severity: "high" as const, title: "Issue 2", description: "Desc" },
        { severity: "medium" as const, title: "Issue 3", description: "Desc" },
      ];

      const blocks = createFindingsSummary(findings);
      const texts = blocks.map((b) => b.text).join("\n");

      expect(texts).toContain("High Severity (2)");
      expect(texts).toContain("Advisory (1)");
    });

    it("should handle empty findings lists", () => {
      const blocks = createFindingsSummary([]);
      expect(blocks.length).toBeGreaterThan(0);
      const texts = blocks.map((b) => b.text).join("\n");
      expect(texts).toContain("Findings Summary (0 total)");
    });

    it("should skip sections with no findings", () => {
      const findings = [
        { severity: "high" as const, title: "Issue", description: "Desc" },
      ];

      const blocks = createFindingsSummary(findings);
      const texts = blocks.map((b) => b.text).join("\n");

      expect(texts).toContain("High Severity (1)");
      expect(texts).not.toContain("Advisory");
      expect(texts).not.toContain("Info");
    });

    it("should include code examples when provided", () => {
      const findings = [
        {
          severity: "high" as const,
          title: "Issue",
          description: "Desc",
          code: "const x = 1",
        },
      ];

      const blocks = createFindingsSummary(findings);
      const texts = blocks.map((b) => b.text).join("\n");

      expect(texts).toContain("const x = 1");
    });
  });

  describe("extractTLDRPoints", () => {
    it("should extract points from useCases when provided", () => {
      const points = extractTLDRPoints(
        "Test description",
        ["Use case 1", "Use case 2", "Use case 3"]
      );
      expect(points.length).toBe(3);
      expect(points).toContain("Use case 1");
    });

    it("should extract points from bullet points in description", () => {
      const description = "- Point one\n- Point two\n- Point three";
      const points = extractTLDRPoints(description);
      expect(points.length).toBeGreaterThan(0);
      expect(points[0]).toContain("Point one");
    });

    it("should extract points from numbered lists", () => {
      const description = "1. First point\n2. Second point\n3. Third point";
      const points = extractTLDRPoints(description);
      expect(points.length).toBeGreaterThan(0);
      expect(points[0]).toContain("First point");
    });

    it("should fall back to sentences when no lists found", () => {
      const description = "This is a long sentence that should be extracted. This is another sentence. Short.";
      const points = extractTLDRPoints(description);
      expect(points.length).toBeGreaterThan(0);
    });

    it("should return substring when no substantial sentences found", () => {
      const description = "Short.";
      const points = extractTLDRPoints(description);
      expect(points.length).toBeGreaterThan(0);
    });
  });

  describe("createTOC", () => {
    it("should create TOC with all sections", () => {
      const toc = createTOC(true, true, true);
      expect(toc).toContain("What is this?");
      expect(toc).toContain("What should I do?");
      expect(toc).toContain("Show me the APIs");
      expect(toc).toContain("Related Patterns");
    });

    it("should create TOC with only required sections", () => {
      const toc = createTOC(false, false, false);
      expect(toc).toContain("What is this?");
      expect(toc).not.toContain("What should I do?");
    });

    it("should include use cases section when provided", () => {
      const toc = createTOC(false, true, false);
      expect(toc).toContain("What should I do?");
    });

    it("should include examples section when provided", () => {
      const toc = createTOC(true, false, false);
      expect(toc).toContain("Show me the APIs");
    });
  });

  describe("buildScanFirstPatternContent", () => {
    it("should build scan-first content with all sections", () => {
      const pattern = {
        id: "test-pattern",
        title: "Test Pattern",
        category: "concurrency",
        difficulty: "intermediate",
        description: "Test description",
        examples: [{ code: "const x = 1" }],
        useCases: ["Use case 1"],
        tags: ["Effect.all"],
        relatedPatterns: ["pattern-1"],
      };

      const block = buildScanFirstPatternContent(pattern, {
        includeExample: true,
        includeNotes: true,
        includeRelated: true,
      });
      expect(block.type).toBe("text");
      expect(block.text).toContain("Test Pattern");
      expect(block.text).toContain("const x = 1");
    });

    it("should work with minimal pattern data", () => {
      const pattern = {
        id: "minimal-pattern",
        title: "Minimal",
        category: "test",
        difficulty: "beginner",
        description: "Desc",
      };

      const block = buildScanFirstPatternContent(pattern);
      expect(block.type).toBe("text");
    });
  });

  describe("buildSearchResultsContent", () => {
    it("should build search results content", () => {
      const results = {
        count: 2,
        patterns: [
          {
            id: "pattern-1",
            title: "Pattern 1",
            category: "concurrency",
            difficulty: "intermediate",
            description: "Summary 1",
          },
          {
            id: "pattern-2",
            title: "Pattern 2",
            category: "errors",
            difficulty: "beginner",
            description: "Summary 2",
          },
        ],
      };

      const content = buildSearchResultsContent(results, { query: "test query" });
      expect(content.length).toBeGreaterThan(0);
      const texts = content.map((b) => b.text).join("\n");
      expect(texts).toContain("Pattern 1");
      expect(texts).toContain("Pattern 2");
      expect(texts).toContain("test query");
    });

    it("should handle empty results", () => {
      const results = {
        count: 0,
        patterns: [],
      };
      const content = buildSearchResultsContent(results, { query: "query" });
      expect(content.length).toBeGreaterThan(0);
      const texts = content.map((b) => b.text).join("\n");
      expect(texts).toContain("NO PATTERNS FOUND IN DATABASE");
    });
  });
});
