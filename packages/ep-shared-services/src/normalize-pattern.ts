/**
 * normalize-pattern.ts
 * 
 * Normalizes raw pattern data into PresentedPatternCard (domain layer).
 * Separates from rendering concerns.
 */

import type { PatternSource, PresentedPatternCard, DefaultBehavior, RecommendedPractice, PatternCardSections, UseGuidance, PatternExample } from "./pattern-types";

/**
 * Normalize raw pattern into presentation card
 * (preserves all provenance, marks optional sections)
 */
export function normalizePattern(
  raw: Record<string, unknown>,
  source: PatternSource
): PresentedPatternCard {
  const id = String(raw.id || "unknown");
  const title = String(raw.title || "Untitled");
  const difficulty = (raw.difficulty as "beginner" | "intermediate" | "advanced") || "intermediate";
  const category = String(raw.category || "general");
  const summary = String(raw.summary || raw.description || "");
  const tags = Array.isArray(raw.tags) ? raw.tags.map(String) : [];

  return {
    id,
    title,
    difficulty,
    category,
    summary,
    tags,
    source,
    useGuidance: inferUseGuidance(id, category, tags),
    sections: inferSections(id, category),
    minimalExample: extractMinimalExample(raw),
    advancedExample: extractAdvancedExample(raw),
    relatedPatterns: extractRelatedPatterns(raw),
  };
}

/**
 * Infer "When to Use / Avoid" guidance
 */
function inferUseGuidance(
  id: string,
  category: string,
  tags: readonly string[]
): UseGuidance {
  const patterns: Record<string, UseGuidance> = {
    "process-collection-in-parallel-with-foreach": {
      whenUse: [
        "Processing large collections (100+) with bounded concurrency",
        "Preventing resource exhaustion",
      ],
      whenAvoid: [
        "Small arrays (<10 items) where overhead exceeds benefit",
        "When you need results in strict order",
      ],
    },
    "run-effects-in-parallel-with-all": {
      whenUse: [
        "Running independent effects concurrently",
        "Fetching from multiple sources simultaneously",
      ],
      whenAvoid: [
        "Effects with dependencies (use flatMap)",
        "When you need only first result (use race)",
      ],
    },
  };

  return patterns[id] || { whenUse: [], whenAvoid: [] };
}

/**
 * Infer optional sections based on pattern type
 * (not all patterns have defaults/recommended/gotchas)
 */
function inferSections(id: string, category: string): PatternCardSections {
  const result: Record<string, unknown> = {};

  // Only add sections that are relevant
  if (category === "concurrency") {
    const def = inferConcurrencyDefault(id);
    if (def) result.default = def;
    const rec = inferConcurrencyRecommended(id);
    if (rec) result.recommended = rec;
    const gots = inferConcurrencyGotchas(id);
    if (gots) result.gotchas = gots;
  }

  if (category === "error-handling") {
    result.retryPolicy = "See Schedule for retry policies";
  }

  if (category === "testing") {
    result.setupTeardown = "Use Effect.withClock for deterministic time";
  }

  return result as PatternCardSections;
}

/**
 * Infer DEFAULT BEHAVIOR (what people do if not thinking about it)
 * Phrased as "if you omit config" or "if you don't use X"
 * 
 * NOTE: Pinned to effectVersion to avoid version-dependent claims
 */
function inferConcurrencyDefault(id: string): DefaultBehavior | undefined {
  const defaults: Record<string, DefaultBehavior> = {
    "process-collection-in-parallel-with-foreach": {
      behavior: "If you omit `concurrency` option, runs all items sequentially",
      rationale:
        "Without explicit concurrency, you sacrifice parallelism benefits",
      riskLevel: "high",
    },
    "run-effects-in-parallel-with-all": {
      behavior: "If you omit `concurrency` option, runs effects sequentially",
      rationale: "Default is safe but loses parallelism. Explicit opt-in is intentional.",
      riskLevel: "medium",
    },
    "race-concurrent-effects": {
      behavior:
        "If you don't set a timeout, race can hang indefinitely if all effects fail",
      rationale: "Unbounded race without deadline is a correctness bug",
      riskLevel: "high",
    },
  };

  return defaults[id];
}

/**
 * Infer RECOMMENDED approaches (context-dependent, can be multiple)
 */
function inferConcurrencyRecommended(
  id: string
): readonly RecommendedPractice[] | undefined {
  const recommendations: Record<string, readonly RecommendedPractice[]> = {
    "process-collection-in-parallel-with-foreach": [
      {
        practice: "Use `{ concurrency: N }` where N = 2-4x CPU cores",
        conditions: ["I/O-bound work", "Network requests", "Database queries"],
        tradeoffs: ["Higher N = more memory", "Lower N = less parallelism"],
      },
    ],
    "run-effects-in-parallel-with-all": [
      {
        practice: "Explicit `{ concurrency: 'unbounded' }` for all-in-parallel",
        conditions: ["Independent effects", "No resource constraints"],
      },
      {
        practice: "Use `{ concurrency: N }` for bounded parallelism",
        conditions: ["Resource limits", "API rate limits"],
      },
    ],
  };

  return recommendations[id];
}

/**
 * Infer GOTCHAS (mistakes to avoid)
 */
function inferConcurrencyGotchas(id: string): readonly string[] | undefined {
  const gotchas: Record<string, readonly string[]> = {
    "process-collection-in-parallel-with-foreach": [
      "Using `Effect.all(array.map(...))` instead of `forEach` on large arrays",
      "Forgetting to handle per-item errors",
      "Not tuning concurrency limit to your actual constraints",
    ],
    "run-effects-in-parallel-with-all": [
      "Default is sequential—must explicitly opt into concurrency",
      "First failure fails entire `all`—use separate error handling if needed",
      "Unbounded concurrency on large arrays should use `forEach`",
    ],
  };

  return gotchas[id];
}

/**
 * Extract minimal example from pattern data
 */
function extractMinimalExample(pattern: Record<string, unknown>): PatternExample {
  if (Array.isArray(pattern.examples) && pattern.examples.length > 0) {
    const ex = (pattern.examples[0] as Record<string, unknown>) || {};
    return {
      title: String(ex.title || "Example"),
      code: String(ex.code || "// No code provided"),
      language: (ex.language as "typescript" | "bash" | "text") || "typescript",
      notes: String(ex.notes || ""),
    };
  }

  return {
    title: "Basic Usage",
    code: "// See pattern documentation for code examples",
    language: "typescript",
  };
}

/**
 * Extract advanced example from pattern data
 */
function extractAdvancedExample(
  pattern: Record<string, unknown>
): PatternExample | undefined {
  if (Array.isArray(pattern.examples) && pattern.examples.length > 1) {
    const ex = (pattern.examples[1] as Record<string, unknown>) || {};
    return {
      title: String(ex.title || "Advanced Usage"),
      code: String(ex.code || "// No advanced example"),
      language: (ex.language as "typescript" | "bash" | "text") || "typescript",
      notes: String(ex.notes || ""),
    };
  }

  return undefined;
}

/**
 * Extract related patterns
 */
function extractRelatedPatterns(
  pattern: Record<string, unknown>
): readonly { readonly id: string; readonly title: string }[] | undefined {
  if (Array.isArray(pattern.related)) {
    return (pattern.related as Array<{ id: string; title?: string }>).map(r => ({
      id: r.id,
      title: r.title || r.id,
    }));
  }

  return undefined;
}
