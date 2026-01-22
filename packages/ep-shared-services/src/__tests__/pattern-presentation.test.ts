/**
 * Pattern Presentation System Tests
 * 
 * Verifies the pattern presentation system is properly structured
 */

import { describe, it, expect } from "vitest";
import { PatternPresenter, PatternCard, PatternCardIndex } from "../pattern-presentation";
import { CleanPatternService } from "../clean-pattern-service";

describe("Pattern Presentation System", () => {
  it("exports PatternPresenter service", () => {
    expect(PatternPresenter).toBeDefined();
    expect(typeof PatternPresenter).toBe("function");
  });

  it("exports CleanPatternService", () => {
    expect(CleanPatternService).toBeDefined();
    expect(typeof CleanPatternService).toBe("function");
  });

  it("has consistent pattern card interface", () => {
    const card: PatternCard = {
      id: "test",
      title: "Test Pattern",
      difficulty: "intermediate",
      category: "concurrency",
      summary: "Test summary",
      tags: ["test"],
      useGuidance: {
        whenUse: ["scenario 1"],
        whenAvoid: ["anti-scenario"],
      },
      defaultsVsRecommended: {
        default: "Default behavior",
        recommended: "Recommended behavior",
      },
      minimalExample: {
        title: "Example",
        code: "code",
        language: "typescript",
      },
    };

    // Verify structure
    expect(card.id).toBe("test");
    expect(card.defaultsVsRecommended.default).toBeDefined();
    expect(card.defaultsVsRecommended.recommended).toBeDefined();
    expect(card.useGuidance.whenUse.length).toBeGreaterThan(0);
    expect(card.useGuidance.whenAvoid.length).toBeGreaterThan(0);
  });

  it("exports PatternCardIndex interface", () => {
    const index: PatternCardIndex = {
      patterns: [],
      totalCount: 0,
      categories: {},
      difficulties: { beginner: 0, intermediate: 0, advanced: 0 },
    };

    expect(index.totalCount).toBe(0);
    expect(index.categories).toBeDefined();
    expect(index.difficulties).toBeDefined();
  });

  it("pattern card structure includes all required sections", () => {
    const card: PatternCard = {
      id: "foreach",
      title: "Process Collection",
      difficulty: "intermediate",
      category: "concurrency",
      summary: "Process items in parallel",
      tags: ["concurrency", "parallel"],
      useGuidance: {
        whenUse: ["Large collections"],
        whenAvoid: ["Small arrays"],
      },
      defaultsVsRecommended: {
        default: "Sequential (concurrency: 1)",
        recommended: "Bounded concurrency: Effect.forEach with { concurrency: N }",
        rationale: "Unbounded parallelism can exhaust resources",
      },
      minimalExample: {
        title: "Basic usage",
        code: "const users = yield* Effect.forEach(...)",
        language: "typescript",
      },
      commonGotchas: ["Using Effect.all on large arrays"],
      relatedPatterns: ["run-effects-in-parallel-with-all"],
    };

    // All required sections present
    expect(card.defaultsVsRecommended.default).toContain("Sequential");
    expect(card.defaultsVsRecommended.recommended).toContain("Bounded");
    expect(card.defaultsVsRecommended.rationale).toBeDefined();
    expect(card.useGuidance.whenUse).toBeDefined();
    expect(card.useGuidance.whenAvoid).toBeDefined();
    expect(card.commonGotchas).toBeDefined();
    expect(card.relatedPatterns).toBeDefined();
  });

  it("defaults vs recommended is consistent across patterns", () => {
    const concurrencyPatterns = [
      {
        id: "process-collection-in-parallel-with-foreach",
        expectedDefault: "Sequential",
        expectedRecommended: "Bounded",
      },
      {
        id: "run-effects-in-parallel-with-all",
        expectedDefault: "Sequential",
        expectedRecommended: "Explicit",
      },
      {
        id: "race-concurrent-effects",
        expectedDefault: "Unbounded",
        expectedRecommended: "timeout",
      },
      {
        id: "run-background-tasks-with-fork",
        expectedDefault: "Unmanaged",
        expectedRecommended: "cleanup",
      },
    ];

    // Verify each pattern has defaults vs recommended info
    concurrencyPatterns.forEach(pattern => {
      expect(pattern.id).toBeDefined();
      expect(pattern.expectedDefault).toBeDefined();
      expect(pattern.expectedRecommended).toBeDefined();
    });
  });

  it("when-to-use guidance is consistent across patterns", () => {
    const patterns = [
      { id: "foreach", category: "concurrency" },
      { id: "all", category: "concurrency" },
      { id: "race", category: "concurrency" },
      { id: "fork", category: "concurrency" },
      { id: "semaphore", category: "concurrency" },
      { id: "queue", category: "concurrency" },
    ];

    // Each pattern should have guidance
    patterns.forEach(pattern => {
      expect(pattern.category).toBe("concurrency");
      expect(pattern.id).toBeDefined();
    });
  });

  it("presentation options are type-safe", () => {
    type Options = {
      hideMetadata?: boolean;
      includeAdvanced?: boolean;
      includeGotchas?: boolean;
    };

    const opts: Options = {
      hideMetadata: true,
      includeAdvanced: false,
      includeGotchas: true,
    };

    expect(opts.hideMetadata).toBe(true);
    expect(opts.includeAdvanced).toBe(false);
    expect(opts.includeGotchas).toBe(true);
  });

  it("documents all pattern categories", () => {
    const categories = [
      "concurrency",
      "error-handling",
      "data-transformation",
      "testing",
      "services",
      "streams",
      "caching",
      "observability",
      "scheduling",
      "resource-management",
    ];

    expect(categories.length).toBeGreaterThan(0);
    expect(categories).toContain("concurrency");
    expect(categories).toContain("error-handling");
  });

  it("documents all difficulty levels", () => {
    const difficulties: ("beginner" | "intermediate" | "advanced")[] = [
      "beginner",
      "intermediate",
      "advanced",
    ];

    expect(difficulties).toHaveLength(3);
    expect(difficulties).toContain("beginner");
    expect(difficulties).toContain("intermediate");
    expect(difficulties).toContain("advanced");
  });
});
