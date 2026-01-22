/**
 * Comprehensive tests for MCP results presentation logic
 * 
 * Coverage:
 * - normalizePattern: raw → PresentedPatternCard
 * - renderCardMarkdown: card → markdown
 * - renderIndexMarkdown: index → table
 * - Determinism: same inputs → same outputs
 * - Tool-noise regression: no MCP artifacts in output
 * - Edge cases: missing fields, huge content, special chars
 */

import { describe, it, expect } from "vitest";
import { normalizePattern } from "../normalize-pattern";
import { renderCardMarkdown } from "../render-card-markdown";
import { renderIndexMarkdown } from "../render-index-markdown";
import type {
  PatternSource,
  PresentedPatternCard,
  PresentedPatternIndex,
} from "../pattern-types";

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockSource(overrides?: Partial<PatternSource>): PatternSource {
  return {
    patternId: "test-pattern",
    filePath: "content/patterns/test-pattern.mdx",
    commit: "abc123def456",
    server: "https://effect-patterns-mcp.vercel.app",
    retrievedAt: 1705900000000,
    indexedAt: 1705900001000,
    contentHash: "sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    effectVersion: "3.19.14",
    ...overrides,
  };
}

function createMockRawPattern(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "process-collection-in-parallel-with-foreach",
    title: "Process a Collection in Parallel with Effect.forEach",
    difficulty: "intermediate",
    category: "concurrency",
    summary: "Use Effect.forEach with concurrency option.",
    tags: ["concurrency", "parallel", "performance"],
    examples: [
      {
        title: "Basic Usage",
        code: "const result = yield* Effect.forEach(items, fn, { concurrency: 5 });",
        language: "typescript",
        notes: "Processes 5 items concurrently.",
      },
      {
        title: "Advanced Usage",
        code: "const result = yield* Effect.forEach(items, fn, { concurrency: 'inherit' });",
        language: "typescript",
        notes: "Uses parent concurrency setting.",
      },
    ],
    related: [
      { id: "run-effects-in-parallel-with-all", title: "Run All Effects" },
    ],
    ...overrides,
  };
}

function createMockCard(overrides?: Partial<PresentedPatternCard>): PresentedPatternCard {
  const source = createMockSource();
  return {
    id: "process-collection-in-parallel-with-foreach",
    title: "Process a Collection in Parallel with Effect.forEach",
    difficulty: "intermediate",
    category: "concurrency",
    summary: "Use Effect.forEach with concurrency option.",
    tags: ["concurrency", "parallel", "performance"],
    source,
    useGuidance: {
      whenUse: [
        "Processing large collections (100+) with bounded concurrency",
        "Preventing resource exhaustion",
      ],
      whenAvoid: [
        "Small arrays (<10 items) where overhead exceeds benefit",
        "When you need results in strict order",
      ],
    },
    sections: {
      default: {
        behavior: "If you omit `concurrency` option, runs all items sequentially",
        rationale: "Without explicit concurrency, you sacrifice parallelism benefits",
        riskLevel: "high",
      },
      recommended: [
        {
          practice: "Use `{ concurrency: N }` where N = 2-4x CPU cores",
          conditions: ["I/O-bound work", "Network requests"],
          tradeoffs: ["Higher N = more memory"],
        },
      ],
      gotchas: [
        "Using Effect.all on large arrays instead of forEach",
        "Forgetting to handle per-item errors",
      ],
    },
    minimalExample: {
      title: "Basic Usage",
      code: "const result = yield* Effect.forEach(items, fn, { concurrency: 5 });",
      language: "typescript",
      notes: "Processes 5 items concurrently.",
    },
    advancedExample: {
      title: "Advanced Usage",
      code: "const result = yield* Effect.forEach(items, fn, { concurrency: 'inherit' });",
      language: "typescript",
      notes: "Uses parent concurrency setting.",
    },
    relatedPatterns: [
      { id: "run-effects-in-parallel-with-all", title: "Run All Effects" },
    ],
    ...overrides,
  };
}

function createMockIndex(cards: PresentedPatternCard[]): PresentedPatternIndex {
  const categories: Record<string, number> = {};
  const difficulties: Record<"beginner" | "intermediate" | "advanced", number> = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
  };

  cards.forEach(c => {
    categories[c.category] = (categories[c.category] || 0) + 1;
    difficulties[c.difficulty]++;
  });

  return {
    patterns: cards,
    totalCount: cards.length,
    categories,
    difficulties,
    indexedAt: Date.now(),
    sources: cards.map(c => c.source),
  };
}

// ============================================================================
// normalizePattern Tests
// ============================================================================

describe("normalizePattern", () => {
  describe("basic normalization", () => {
    it("extracts all fields from raw pattern", () => {
      const raw = createMockRawPattern();
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.id).toBe("process-collection-in-parallel-with-foreach");
      expect(card.title).toBe("Process a Collection in Parallel with Effect.forEach");
      expect(card.difficulty).toBe("intermediate");
      expect(card.category).toBe("concurrency");
      expect(card.summary).toBe("Use Effect.forEach with concurrency option.");
      expect(card.tags).toEqual(["concurrency", "parallel", "performance"]);
    });

    it("preserves source provenance unchanged", () => {
      const raw = createMockRawPattern();
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.source).toEqual(source);
      expect(card.source.patternId).toBe("test-pattern");
      expect(card.source.contentHash).toBe("sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6");
    });

    it("extracts minimal example from first example", () => {
      const raw = createMockRawPattern();
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.minimalExample.title).toBe("Basic Usage");
      expect(card.minimalExample.code).toContain("Effect.forEach");
      expect(card.minimalExample.language).toBe("typescript");
    });

    it("extracts advanced example from second example", () => {
      const raw = createMockRawPattern();
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.advancedExample).toBeDefined();
      expect(card.advancedExample?.title).toBe("Advanced Usage");
      expect(card.advancedExample?.code).toContain("inherit");
    });

    it("extracts related patterns with id and title", () => {
      const raw = createMockRawPattern();
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.relatedPatterns).toHaveLength(1);
      expect(card.relatedPatterns?.[0].id).toBe("run-effects-in-parallel-with-all");
      expect(card.relatedPatterns?.[0].title).toBe("Run All Effects");
    });
  });

  describe("missing fields handling", () => {
    it("defaults difficulty to intermediate when missing", () => {
      const raw = createMockRawPattern({ difficulty: undefined });
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.difficulty).toBe("intermediate");
    });

    it("defaults category to general when missing", () => {
      const raw = createMockRawPattern({ category: undefined });
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.category).toBe("general");
    });

    it("defaults tags to empty array when missing", () => {
      const raw = createMockRawPattern({ tags: undefined });
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.tags).toEqual([]);
    });

    it("uses description as summary when summary missing", () => {
      const raw = createMockRawPattern({
        summary: undefined,
        description: "Fallback description.",
      });
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.summary).toBe("Fallback description.");
    });

    it("provides default example when none provided", () => {
      const raw = createMockRawPattern({ examples: undefined });
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.minimalExample.title).toBe("Basic Usage");
      expect(card.minimalExample.code).toContain("See pattern documentation");
    });

    it("returns undefined advancedExample when only one example", () => {
      const raw = createMockRawPattern({
        examples: [{ title: "Only Example", code: "code", language: "typescript" }],
      });
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.advancedExample).toBeUndefined();
    });

    it("returns undefined relatedPatterns when none provided", () => {
      const raw = createMockRawPattern({ related: undefined });
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.relatedPatterns).toBeUndefined();
    });
  });

  describe("category-specific sections", () => {
    it("adds default/recommended/gotchas for concurrency category", () => {
      const raw = createMockRawPattern({ category: "concurrency" });
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.sections.default).toBeDefined();
      expect(card.sections.default?.behavior).toContain("omit");
      expect(card.sections.default?.riskLevel).toBe("high");
      expect(card.sections.recommended).toBeDefined();
      expect(card.sections.gotchas).toBeDefined();
    });

    it("adds retryPolicy for error-handling category", () => {
      const raw = createMockRawPattern({ category: "error-handling" });
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.sections.retryPolicy).toBeDefined();
      expect(card.sections.retryPolicy).toContain("Schedule");
    });

    it("adds setupTeardown for testing category", () => {
      const raw = createMockRawPattern({ category: "testing" });
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.sections.setupTeardown).toBeDefined();
      expect(card.sections.setupTeardown).toContain("withClock");
    });

    it("omits category-specific sections for other categories", () => {
      const raw = createMockRawPattern({ category: "streams" });
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.sections.default).toBeUndefined();
      expect(card.sections.recommended).toBeUndefined();
      expect(card.sections.retryPolicy).toBeUndefined();
      expect(card.sections.setupTeardown).toBeUndefined();
    });
  });

  describe("use guidance inference", () => {
    it("infers whenUse for known pattern IDs", () => {
      const raw = createMockRawPattern({
        id: "process-collection-in-parallel-with-foreach",
      });
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.useGuidance.whenUse.length).toBeGreaterThan(0);
      expect(card.useGuidance.whenUse[0]).toContain("large collections");
    });

    it("infers whenAvoid for known pattern IDs", () => {
      const raw = createMockRawPattern({
        id: "process-collection-in-parallel-with-foreach",
      });
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.useGuidance.whenAvoid.length).toBeGreaterThan(0);
      expect(card.useGuidance.whenAvoid[0]).toContain("Small arrays");
    });

    it("returns empty arrays for unknown pattern IDs", () => {
      const raw = createMockRawPattern({ id: "unknown-pattern" });
      const source = createMockSource();

      const card = normalizePattern(raw, source);

      expect(card.useGuidance.whenUse).toEqual([]);
      expect(card.useGuidance.whenAvoid).toEqual([]);
    });
  });
});

// ============================================================================
// renderCardMarkdown Tests
// ============================================================================

describe("renderCardMarkdown", () => {
  describe("basic rendering", () => {
    it("renders title as h2 heading", () => {
      const card = createMockCard();

      const output = renderCardMarkdown(card);

      expect(output).toContain("## Process a Collection in Parallel");
    });

    it("renders difficulty, category, and tags on one line", () => {
      const card = createMockCard();

      const output = renderCardMarkdown(card);

      expect(output).toContain("**intermediate** | concurrency | concurrency, parallel, performance");
    });

    it("renders summary", () => {
      const card = createMockCard();

      const output = renderCardMarkdown(card);

      expect(output).toContain("Use Effect.forEach with concurrency option.");
    });

    it("renders When to Use / Avoid section", () => {
      const card = createMockCard();

      const output = renderCardMarkdown(card);

      expect(output).toContain("### When to Use / Avoid");
      expect(output).toContain("**Use when:**");
      expect(output).toContain("**Avoid when:**");
      expect(output).toContain("- Processing large collections");
      expect(output).toContain("- Small arrays");
    });

    it("renders minimal example with code fence", () => {
      const card = createMockCard();

      const output = renderCardMarkdown(card);

      expect(output).toContain("### Minimal Example");
      expect(output).toContain("```typescript");
      expect(output).toContain("Effect.forEach");
      expect(output).toContain("```");
    });
  });

  describe("optional sections", () => {
    it("renders Default Behavior when present", () => {
      const card = createMockCard();

      const output = renderCardMarkdown(card);

      expect(output).toContain("### Default Behavior");
      expect(output).toContain("If you omit `concurrency` option");
      expect(output).toContain("*Rationale:*");
      expect(output).toContain("*Risk Level:* high");
    });

    it("omits Default Behavior when not present", () => {
      const card = createMockCard({
        sections: { ...createMockCard().sections, default: undefined },
      });

      const output = renderCardMarkdown(card);

      expect(output).not.toContain("### Default Behavior");
    });

    it("renders Recommended section when present", () => {
      const card = createMockCard();

      const output = renderCardMarkdown(card);

      expect(output).toContain("### Recommended");
      expect(output).toContain("**1.**");
      expect(output).toContain("When:");
      expect(output).toContain("Tradeoffs:");
    });

    it("omits Recommended when not present", () => {
      const card = createMockCard({
        sections: { ...createMockCard().sections, recommended: undefined },
      });

      const output = renderCardMarkdown(card);

      expect(output).not.toContain("### Recommended");
    });

    it("renders Common Gotchas when present", () => {
      const card = createMockCard();

      const output = renderCardMarkdown(card);

      expect(output).toContain("### Common Gotchas");
      expect(output).toContain("- Using Effect.all");
    });

    it("omits Gotchas when not present", () => {
      const card = createMockCard({
        sections: { ...createMockCard().sections, gotchas: undefined },
      });

      const output = renderCardMarkdown(card);

      expect(output).not.toContain("### Common Gotchas");
    });

    it("renders Advanced Example when present and not excluded", () => {
      const card = createMockCard();

      const output = renderCardMarkdown(card, { includeAdvancedExamples: true });

      expect(output).toContain("### Advanced Example");
      expect(output).toContain("inherit");
    });

    it("omits Advanced Example when includeAdvancedExamples is false", () => {
      const card = createMockCard();

      const output = renderCardMarkdown(card, { includeAdvancedExamples: false });

      expect(output).not.toContain("### Advanced Example");
    });

    it("renders Related Patterns with links", () => {
      const card = createMockCard();

      const output = renderCardMarkdown(card);

      expect(output).toContain("### Related Patterns");
      expect(output).toContain("[Run All Effects](../run-effects-in-parallel-with-all.md)");
    });
  });

  describe("category-specific sections", () => {
    it("renders Setup & Teardown for testing patterns", () => {
      const card = createMockCard({
        sections: { setupTeardown: "Use TestClock for time control." },
      });

      const output = renderCardMarkdown(card);

      expect(output).toContain("### Setup & Teardown");
      expect(output).toContain("Use TestClock");
    });

    it("renders Retry Policy for error-handling patterns", () => {
      const card = createMockCard({
        sections: { retryPolicy: "See Schedule.exponential for backoff." },
      });

      const output = renderCardMarkdown(card);

      expect(output).toContain("### Retry Policy");
      expect(output).toContain("Schedule.exponential");
    });

    it("renders Layering for architecture patterns", () => {
      const card = createMockCard({
        sections: { layering: "Use Layer.merge for composition." },
      });

      const output = renderCardMarkdown(card);

      expect(output).toContain("### Layering");
      expect(output).toContain("Layer.merge");
    });
  });

  describe("provenance panel", () => {
    it("includes provenance panel when requested", () => {
      const card = createMockCard();

      const output = renderCardMarkdown(card, { includeProvenancePanel: true });

      expect(output).toContain("<details>");
      expect(output).toContain("<summary>📋 Trace / Provenance</summary>");
      expect(output).toContain("**Pattern ID**: `test-pattern`");
      expect(output).toContain("**File**: `content/patterns/test-pattern.mdx`");
      expect(output).toContain("**Commit**: `abc123def456`");
      expect(output).toContain("**Server**: https://effect-patterns-mcp.vercel.app");
      expect(output).toContain("**Retrieved**:");
      expect(output).toContain("**Content Hash**: `sha256:a1b2c3d4e...`");
      expect(output).toContain("**Effect Version**: 3.19.14");
      expect(output).toContain("</details>");
    });

    it("omits provenance panel when not requested", () => {
      const card = createMockCard();

      const output = renderCardMarkdown(card, { includeProvenancePanel: false });

      expect(output).not.toContain("<details>");
      expect(output).not.toContain("Trace / Provenance");
    });

    it("omits provenance panel by default", () => {
      const card = createMockCard();

      const output = renderCardMarkdown(card);

      expect(output).not.toContain("<details>");
    });

    it("omits optional provenance fields when not present", () => {
      const card = createMockCard({
        source: createMockSource({
          commit: undefined,
          indexedAt: undefined,
          effectVersion: undefined,
        }),
      });

      const output = renderCardMarkdown(card, { includeProvenancePanel: true });

      expect(output).not.toContain("**Commit**:");
      expect(output).not.toContain("**Indexed**:");
      expect(output).not.toContain("**Effect Version**:");
    });
  });
});

// ============================================================================
// renderIndexMarkdown Tests
// ============================================================================

describe("renderIndexMarkdown", () => {
  describe("basic rendering", () => {
    it("renders pattern count in header", () => {
      const cards = [createMockCard(), createMockCard({ id: "pattern-2" })];
      const index = createMockIndex(cards);

      const output = renderIndexMarkdown(index);

      expect(output).toContain("## Pattern Reference (2 patterns)");
    });

    it("renders category counts", () => {
      const cards = [
        createMockCard({ category: "concurrency" }),
        createMockCard({ id: "p2", category: "concurrency" }),
        createMockCard({ id: "p3", category: "error-handling" }),
      ];
      const index = createMockIndex(cards);

      const output = renderIndexMarkdown(index);

      expect(output).toContain("concurrency: 2");
      expect(output).toContain("error-handling: 1");
    });

    it("renders difficulty counts", () => {
      const cards = [
        createMockCard({ difficulty: "beginner" }),
        createMockCard({ id: "p2", difficulty: "intermediate" }),
        createMockCard({ id: "p3", difficulty: "advanced" }),
      ];
      const index = createMockIndex(cards);

      const output = renderIndexMarkdown(index);

      expect(output).toContain("Beginner: 1");
      expect(output).toContain("Intermediate: 1");
      expect(output).toContain("Advanced: 1");
    });

    it("renders markdown table with headers", () => {
      const cards = [createMockCard()];
      const index = createMockIndex(cards);

      const output = renderIndexMarkdown(index);

      expect(output).toContain("| Pattern | Category | Difficulty | Key Guidance |");
      expect(output).toContain("|---------|----------|------------|--------------|");
    });

    it("renders pattern rows with bold title", () => {
      const cards = [createMockCard()];
      const index = createMockIndex(cards);

      const output = renderIndexMarkdown(index);

      expect(output).toContain("| **Process a Collection in Parallel");
    });
  });

  describe("key guidance column", () => {
    it("shows risk level when default section present", () => {
      const cards = [createMockCard()];
      const index = createMockIndex(cards);

      const output = renderIndexMarkdown(index);

      expect(output).toContain("**Risk:** high");
    });

    it("shows recommendation count when no default but has recommended", () => {
      const card = createMockCard({
        sections: {
          recommended: [
            { practice: "Do X", conditions: ["When Y"] },
            { practice: "Do Z", conditions: ["When W"] },
          ],
        },
      });
      const index = createMockIndex([card]);

      const output = renderIndexMarkdown(index);

      expect(output).toContain("2 recommendations");
    });

    it("shows 'See details' when no default or recommended", () => {
      const card = createMockCard({
        sections: {},
      });
      const index = createMockIndex([card]);

      const output = renderIndexMarkdown(index);

      expect(output).toContain("See details");
    });
  });

  describe("deterministic ordering", () => {
    it("always sorts patterns by id alphabetically", () => {
      const cards = [
        createMockCard({ id: "z-pattern", title: "Z Pattern" }),
        createMockCard({ id: "a-pattern", title: "A Pattern" }),
        createMockCard({ id: "m-pattern", title: "M Pattern" }),
      ];
      const index = createMockIndex(cards);

      const output = renderIndexMarkdown(index);

      const aIndex = output.indexOf("A Pattern");
      const mIndex = output.indexOf("M Pattern");
      const zIndex = output.indexOf("Z Pattern");

      expect(aIndex).toBeLessThan(mIndex);
      expect(mIndex).toBeLessThan(zIndex);
    });

    it("produces same output for same input (determinism)", () => {
      const cards = [
        createMockCard({ id: "pattern-1" }),
        createMockCard({ id: "pattern-2" }),
      ];
      const index = createMockIndex(cards);

      const output1 = renderIndexMarkdown(index);
      const output2 = renderIndexMarkdown(index);
      const output3 = renderIndexMarkdown(index);

      expect(output1).toBe(output2);
      expect(output2).toBe(output3);
    });
  });
});

// ============================================================================
// Tool-Noise Regression Tests
// ============================================================================

describe("tool-noise regression", () => {
  const toolNoisePatterns = [
    "Searching the Effect Patterns MCP server",
    "[8 tools called]",
    "[MCP fetch",
    "tools called",
    "Now let me",
    "Perfect. Now",
    "Let me search",
  ];

  it("renderCardMarkdown output contains no tool noise", () => {
    const card = createMockCard();
    const output = renderCardMarkdown(card, { includeProvenancePanel: true });

    toolNoisePatterns.forEach(pattern => {
      expect(output).not.toContain(pattern);
    });
  });

  it("renderIndexMarkdown output contains no tool noise", () => {
    const cards = [createMockCard(), createMockCard({ id: "p2" })];
    const index = createMockIndex(cards);
    const output = renderIndexMarkdown(index);

    toolNoisePatterns.forEach(pattern => {
      expect(output).not.toContain(pattern);
    });
  });

  it("normalizePattern does not inject tool noise into any field", () => {
    const raw = createMockRawPattern();
    const source = createMockSource();
    const card = normalizePattern(raw, source);

    const cardJson = JSON.stringify(card);
    toolNoisePatterns.forEach(pattern => {
      expect(cardJson).not.toContain(pattern);
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("edge cases", () => {
  describe("empty arrays", () => {
    it("handles empty tags array", () => {
      const raw = createMockRawPattern({ tags: [] });
      const source = createMockSource();
      const card = normalizePattern(raw, source);

      expect(card.tags).toEqual([]);

      const output = renderCardMarkdown(card);
      expect(output).toContain("**intermediate** | concurrency | ");
    });

    it("handles empty whenUse array", () => {
      const card = createMockCard({
        useGuidance: { whenUse: [], whenAvoid: [] },
      });

      const output = renderCardMarkdown(card);

      expect(output).toContain("**Use when:**");
      expect(output).toContain("**Avoid when:**");
    });

    it("handles zero patterns in index", () => {
      const index = createMockIndex([]);

      const output = renderIndexMarkdown(index);

      expect(output).toContain("## Pattern Reference (0 patterns)");
    });
  });

  describe("special characters", () => {
    it("handles markdown special characters in title", () => {
      const card = createMockCard({
        title: "Pattern with `backticks` and **bold**",
      });

      const output = renderCardMarkdown(card);

      expect(output).toContain("## Pattern with `backticks` and **bold**");
    });

    it("handles pipe characters in summary (table-safe)", () => {
      const card = createMockCard({
        summary: "Use A | B | C for options.",
      });

      const output = renderCardMarkdown(card);

      expect(output).toContain("Use A | B | C");
    });

    it("handles code with special regex characters", () => {
      const card = createMockCard({
        minimalExample: {
          title: "Regex Example",
          code: "const regex = /[a-z]+\\d*$/;",
          language: "typescript",
        },
      });

      const output = renderCardMarkdown(card);

      expect(output).toContain("/[a-z]+\\d*$/");
    });
  });

  describe("very long content", () => {
    it("handles very long code examples without truncation", () => {
      const longCode = "const x = 1;\n".repeat(500);
      const card = createMockCard({
        minimalExample: {
          title: "Long Example",
          code: longCode,
          language: "typescript",
        },
      });

      const output = renderCardMarkdown(card);

      expect(output).toContain(longCode);
      expect(output.length).toBeGreaterThan(5000);
    });

    it("handles very long summary", () => {
      const longSummary = "This is a very long summary. ".repeat(100);
      const card = createMockCard({ summary: longSummary });

      const output = renderCardMarkdown(card);

      expect(output).toContain(longSummary);
    });

    it("handles many patterns in index", () => {
      const cards = Array.from({ length: 100 }, (_, i) =>
        createMockCard({ id: `pattern-${String(i).padStart(3, "0")}` })
      );
      const index = createMockIndex(cards);

      const output = renderIndexMarkdown(index);

      expect(output).toContain("## Pattern Reference (100 patterns)");
      expect(output.split("\n").length).toBeGreaterThan(100);
    });
  });

  describe("missing optional fields in source", () => {
    it("normalizes pattern with minimal source", () => {
      const raw = createMockRawPattern();
      const source: PatternSource = {
        patternId: "minimal",
        filePath: "path.mdx",
        retrievedAt: Date.now(),
        contentHash: "hash123",
      };

      const card = normalizePattern(raw, source);

      expect(card.source.commit).toBeUndefined();
      expect(card.source.server).toBeUndefined();
      expect(card.source.indexedAt).toBeUndefined();
      expect(card.source.effectVersion).toBeUndefined();
    });
  });
});

// ============================================================================
// Snapshot Tests
// ============================================================================

describe("snapshot stability", () => {
  it("renderCardMarkdown produces stable output for representative card", () => {
    const card = createMockCard();
    const output = renderCardMarkdown(card);

    // This snapshot should be committed and not change unless intentional
    expect(output).toMatchSnapshot();
  });

  it("renderCardMarkdown with provenance produces stable output", () => {
    // Use fixed timestamp for reproducibility
    const card = createMockCard({
      source: createMockSource({
        retrievedAt: 1705900000000,
        indexedAt: 1705900001000,
      }),
    });
    const output = renderCardMarkdown(card, { includeProvenancePanel: true });

    expect(output).toMatchSnapshot();
  });

  it("renderIndexMarkdown produces stable output for representative index", () => {
    const cards = [
      createMockCard({ id: "pattern-a", title: "Pattern A" }),
      createMockCard({ id: "pattern-b", title: "Pattern B", difficulty: "advanced" }),
    ];
    const index: PresentedPatternIndex = {
      ...createMockIndex(cards),
      indexedAt: 1705900000000,
    };
    const output = renderIndexMarkdown(index);

    expect(output).toMatchSnapshot();
  });
});
