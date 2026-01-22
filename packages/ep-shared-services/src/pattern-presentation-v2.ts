/**
 * Pattern Presentation Service - Production-Ready Schema
 * 
 * Transforms raw pattern data into consistently-formatted cards with:
 * - Accurate "defaults" (what people commonly do / omitted config)
 * - Full provenance metadata (source, version, timestamps)
 * - Optional sections (gotchas, defaults, recommended not always present)
 * - Structured data for both markdown and UI rendering
 */

import { Effect } from "effect";

/**
 * Source metadata: preserves provenance for debugging & audits
 */
export interface PatternSource {
  readonly patternId: string;
  readonly filePath: string;
  readonly commit?: string;
  readonly server?: string;
  readonly timestamp: number;
  readonly effectVersion?: string;
}

/**
 * Defaults section: "what people commonly do" or "omitted config behavior"
 */
export interface DefaultBehavior {
  readonly behavior: string;
  readonly rationale: string;
  readonly riskLevel: "low" | "medium" | "high";
}

/**
 * Recommended section: optional, context-dependent
 */
export interface RecommendedPractice {
  readonly practice: string;
  readonly conditions: string[];
  readonly tradeoffs?: readonly string[];
}

/**
 * Flexible card section: optional, category-dependent
 * (not all patterns have defaults/recommended/gotchas)
 */
export interface PatternCardSections {
  readonly default?: DefaultBehavior;
  readonly recommended?: readonly RecommendedPractice[];
  readonly gotchas?: readonly string[];
  readonly tradeoffs?: readonly string[];
  readonly setupTeardown?: string;      // for testing patterns
  readonly retryPolicy?: string;         // for error-handling patterns
  readonly layering?: string;            // for architecture patterns
}

/**
 * Code example with full context
 */
export interface PatternExample {
  readonly title: string;
  readonly code: string;
  readonly language: "typescript" | "bash" | "text";
  readonly notes?: string;
}

/**
 * When to use / avoid guidance
 */
export interface UseGuidance {
  readonly whenUse: readonly string[];
  readonly whenAvoid: readonly string[];
}

/**
 * STRUCTURED DATA: Pattern card for rendering in UI, JSON APIs, etc.
 * (not markdown-specific)
 */
export interface PresentedPatternCard {
  // Core identity
  readonly id: string;
  readonly title: string;
  readonly difficulty: "beginner" | "intermediate" | "advanced";
  readonly category: string;
  readonly summary: string;
  readonly tags: readonly string[];
  
  // Provenance (preserve for debugging)
  readonly source: PatternSource;
  
  // Guidance sections (optional, flexible)
  readonly useGuidance: UseGuidance;
  readonly sections: PatternCardSections;
  
  // Examples
  readonly minimalExample: PatternExample;
  readonly advancedExample?: PatternExample;
  
  // Navigation
  readonly relatedPatterns?: readonly { readonly id: string; readonly title: string }[];
  
  // Rendering hints
  readonly renderHints?: {
    readonly includeAdvanced?: boolean;
    readonly collapsedSections?: readonly string[];
  };
}

/**
 * STRUCTURED DATA: Index for navigation (not markdown table)
 */
export interface PresentedPatternIndex {
  readonly patterns: readonly PresentedPatternCard[];
  readonly totalCount: number;
  readonly categories: Record<string, number>;
  readonly difficulties: Record<"beginner" | "intermediate" | "advanced", number>;
  
  // Provenance
  readonly indexedAt: number;
  readonly sources: readonly PatternSource[];
}

/**
 * OPTIONAL: Render options for different output formats
 */
export interface RenderOptions {
  readonly format: "markdown" | "json" | "ui-schema";
  readonly includeAdvanced?: boolean;
  readonly includeProvenancePanel?: boolean;
  readonly collapsedSections?: readonly string[];
}

/**
 * Structured output with provenance escape hatch
 */
export interface RenderedOutput {
  readonly content: string; // markdown, JSON, or schema string
  readonly format: "markdown" | "json" | "ui-schema";
  readonly provenance: {
    readonly sources: readonly PatternSource[];
    readonly renderedAt: number;
    readonly renderedBy: string;
  };
}

/**
 * Service to present patterns cleanly, with full provenance
 */
export class PatternPresenter extends Effect.Service<PatternPresenter>()(
  "PatternPresenter",
  {
    sync: () => ({
      /**
       * STEP 1: Normalize raw pattern into PresentedPatternCard
       * (preserves provenance, marks optional sections)
       */
      normalizePattern: (
        rawPattern: Record<string, unknown>,
        source: PatternSource
      ): PresentedPatternCard => {
        const id = String(rawPattern.id || "unknown");
        const title = String(rawPattern.title || "Untitled");
        const difficulty = (rawPattern.difficulty as "beginner" | "intermediate" | "advanced") || "intermediate";
        const category = String(rawPattern.category || "general");
        const summary = String(rawPattern.summary || rawPattern.description || "");
        const tags = Array.isArray(rawPattern.tags) ? rawPattern.tags.map(String) : [];

        const useGuidance = inferUseGuidance(id, category, tags);
        const sections = inferSections(id, category, rawPattern);
        const minimalExample = extractMinimalExample(rawPattern);
        const advancedExample = extractAdvancedExample(rawPattern);
        const relatedPatterns = Array.isArray(rawPattern.related)
          ? (rawPattern.related as Array<{ id: string; title?: string }>).map(r => ({
              id: r.id,
              title: r.title || r.id,
            }))
          : undefined;

        return {
          id,
          title,
          difficulty,
          category,
          summary,
          tags,
          source,
          useGuidance,
          sections,
          minimalExample,
          advancedExample,
          relatedPatterns,
        };
      },

      /**
       * STEP 2: Render structured card to markdown (with optional provenance panel)
       */
      renderCardMarkdown: (
        card: PresentedPatternCard,
        options?: RenderOptions
      ): string => {
        const sections: string[] = [
          `## ${card.title}`,
          `**${card.difficulty}** | ${card.category} | ${card.tags.join(", ")}`,
          "",
          card.summary,
          "",
        ];

        // Use When / Avoid (always present)
        sections.push("### When to Use / Avoid");
        sections.push("**Use when:**");
        sections.push(card.useGuidance.whenUse.map(s => `- ${s}`).join("\n"));
        sections.push("**Avoid when:**");
        sections.push(card.useGuidance.whenAvoid.map(s => `- ${s}`).join("\n"));
        sections.push("");

        // Default behavior (optional, only if present)
        if (card.sections.default) {
          sections.push("### Default Behavior");
          sections.push(`${card.sections.default.behavior}`);
          sections.push(`*Rationale:* ${card.sections.default.rationale}`);
          sections.push(`*Risk:* ${card.sections.default.riskLevel}`);
          sections.push("");
        }

        // Recommended (optional, only if present)
        if (card.sections.recommended && card.sections.recommended.length > 0) {
          sections.push("### Recommended");
          card.sections.recommended.forEach((rec, idx) => {
            sections.push(`${idx + 1}. ${rec.practice}`);
            sections.push(`   When: ${rec.conditions.join(" + ")}`);
            if (rec.tradeoffs) {
              sections.push(`   Tradeoffs: ${rec.tradeoffs.join(", ")}`);
            }
          });
          sections.push("");
        }

        // Examples
        sections.push("### Minimal Example");
        sections.push(`\`\`\`${card.minimalExample.language}`);
        sections.push(card.minimalExample.code);
        sections.push("```");
        if (card.minimalExample.notes) {
          sections.push(card.minimalExample.notes);
        }
        sections.push("");

        if (card.advancedExample) {
          sections.push("### Advanced Example");
          sections.push(`\`\`\`${card.advancedExample.language}`);
          sections.push(card.advancedExample.code);
          sections.push("```");
          if (card.advancedExample.notes) {
            sections.push(card.advancedExample.notes);
          }
          sections.push("");
        }

        // Gotchas (optional)
        if (card.sections.gotchas && card.sections.gotchas.length > 0) {
          sections.push("### Common Gotchas");
          sections.push(card.sections.gotchas.map(g => `- ${g}`).join("\n"));
          sections.push("");
        }

        // Category-specific sections
        if (card.sections.setupTeardown) {
          sections.push("### Setup & Teardown");
          sections.push(card.sections.setupTeardown);
          sections.push("");
        }
        if (card.sections.retryPolicy) {
          sections.push("### Retry Policy");
          sections.push(card.sections.retryPolicy);
          sections.push("");
        }
        if (card.sections.layering) {
          sections.push("### Layering Strategy");
          sections.push(card.sections.layering);
          sections.push("");
        }

        // Related patterns
        if (card.relatedPatterns && card.relatedPatterns.length > 0) {
          sections.push("### Related Patterns");
          sections.push(card.relatedPatterns.map(p => `- [${p.title}](./patterns/${p.id}.md)`).join("\n"));
          sections.push("");
        }

        // OPTIONAL: Provenance panel (collapsible)
        if (options?.includeProvenancePanel) {
          sections.push("---");
          sections.push("<details>");
          sections.push("<summary>📋 Trace / Provenance</summary>");
          sections.push("");
          sections.push(`- **Pattern ID**: \`${card.source.patternId}\``);
          sections.push(`- **File**: \`${card.source.filePath}\``);
          if (card.source.commit) {
            sections.push(`- **Commit**: \`${card.source.commit}\``);
          }
          if (card.source.server) {
            sections.push(`- **Server**: ${card.source.server}`);
          }
          sections.push(`- **Indexed**: ${new Date(card.source.timestamp).toISOString()}`);
          if (card.source.effectVersion) {
            sections.push(`- **Effect Version**: ${card.source.effectVersion}`);
          }
          sections.push("");
          sections.push("</details>");
        }

        return sections.filter(s => s !== "").join("\n");
      },

      /**
       * STEP 3: Render index as markdown table (non-markdown-specific version)
       */
      renderIndexMarkdown: (index: PresentedPatternIndex): string => {
        const header = `
## Pattern Reference (${index.totalCount} patterns)

**Categories:** ${Object.entries(index.categories)
          .map(([cat, count]) => `${cat}: ${count}`)
          .join(" | ")}

**Difficulty:** Beginner: ${index.difficulties.beginner} | Intermediate: ${index.difficulties.intermediate} | Advanced: ${index.difficulties.advanced}

---

### Patterns

| Pattern | Category | Difficulty | Key Guidance |
|---------|----------|------------|--------------|`;

        const rows = index.patterns.map(card => {
          const guidance = card.sections.default
            ? `${card.sections.default.riskLevel} risk if ignored`
            : card.sections.recommended?.length
              ? `${card.sections.recommended.length} recommended approaches`
              : "See details";

          return `| **${card.title}** | ${card.category} | ${card.difficulty} | ${guidance} |`;
        });

        return `${header}\n${rows.join("\n")}\n\n---\n\n### Click a pattern above to expand the card`;
      },

      /**
       * STEP 4: Render to JSON (for API/UI consumption)
       */
      renderJSON: (index: PresentedPatternIndex): string => {
        return JSON.stringify(
          {
            patterns: index.patterns,
            metadata: {
              totalCount: index.totalCount,
              categories: index.categories,
              difficulties: index.difficulties,
              indexedAt: index.indexedAt,
              sources: index.sources,
            },
          },
          null,
          2
        );
      },
    }),
  }
) {}

/**
 * Infer optional sections based on pattern type
 * (not all patterns have all sections)
 */
function inferSections(
  id: string,
  category: string,
  pattern: Record<string, unknown>
): PatternCardSections {
  const sections: PatternCardSections = {};

  // Only add sections that are relevant
  if (category === "concurrency") {
    sections.default = inferConcurrencyDefault(id);
    sections.recommended = inferConcurrencyRecommended(id);
    sections.gotchas = inferConcurrencyGotchas(id);
  }

  if (category === "error-handling") {
    sections.retryPolicy = "See documentation for retry schedules";
  }

  if (category === "testing") {
    sections.setupTeardown = "Provide test setup/teardown examples";
  }

  if (category === "services") {
    sections.layering = "Use Layer for composable dependencies";
  }

  return sections;
}

/**
 * Infer DEFAULT BEHAVIOR (not runtime default, but common pattern)
 * Phrasing: "what people do if they don't think about it"
 */
function inferConcurrencyDefault(id: string): DefaultBehavior | undefined {
  const defaults: Record<string, DefaultBehavior> = {
    "process-collection-in-parallel-with-foreach": {
      behavior:
        "If you omit `concurrency`, runs all items sequentially",
      rationale:
        "Explicit `concurrency` option forces intentional choice",
      riskLevel: "high",
    },
    "run-effects-in-parallel-with-all": {
      behavior:
        "If you omit `concurrency` option, runs effects sequentially",
      rationale:
        "Default is safe but sacrifices parallelism benefits",
      riskLevel: "medium",
    },
    "race-concurrent-effects": {
      behavior:
        "Races all effects until first succeeds; can hang if all fail",
      rationale:
        "Without timeout, unbounded race has no deadline",
      riskLevel: "high",
    },
    "run-background-tasks-with-fork": {
      behavior:
        "If you don't interrupt the fiber, it runs indefinitely",
      rationale:
        "Fork creates unmanaged fibers; cleanup is developer's responsibility",
      riskLevel: "high",
    },
    "concurrency-pattern-rate-limit-with-semaphore": {
      behavior:
        "If you don't use Semaphore, all operations run concurrently",
      rationale:
        "Unbounded concurrency exhausts connection pools and hits rate limits",
      riskLevel: "high",
    },
    "decouple-fibers-with-queue-pubsub": {
      behavior:
        "If you use `Queue.unbounded` and producer is faster than consumer, memory grows unbounded",
      rationale:
        "Unbounded queues have no backpressure",
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
        practice:
          "Use `{ concurrency: N }` where N = 2-4x CPU cores for I/O tasks",
        conditions: ["I/O-bound work", "network requests", "database queries"],
        tradeoffs: [
          "Higher N = more memory",
          "Lower N = less parallelism",
        ],
      },
    ],
    "run-effects-in-parallel-with-all": [
      {
        practice:
          "Explicitly set `{ concurrency: 'unbounded' }` if you want all in parallel",
        conditions: [
          "Independent effects",
          "no resource constraints",
        ],
      },
      {
        practice:
          "Use `{ concurrency: N }` for bounded parallelism",
        conditions: [
          "Resource limits",
          "API rate limits",
        ],
      },
    ],
    "race-concurrent-effects": [
      {
        practice:
          "Always pair with `timeout`: `Effect.race(task, Effect.fail(timeout))`",
        conditions: [
          "Fault tolerance",
          "preventing hangs",
        ],
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
      "Not measuring actual performance before choosing concurrency limit",
    ],
    "run-effects-in-parallel-with-all": [
      "Default is sequential—must explicitly opt into concurrency",
      "First failure fails entire `all`—use separate error handling if needed",
      "Unbounded concurrency on large arrays should use `forEach` instead",
    ],
    "race-concurrent-effects": [
      "Without timeout, can hang indefinitely",
      "Only gets first result—others are discarded",
      "Use `all` if you need all results, not `race`",
    ],
  };

  return gotchas[id];
}

/**
 * Guidance on when to use / avoid
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
        "Preventing resource exhaustion (connections, memory, API rate limits)",
      ],
      whenAvoid: [
        "Small arrays where overhead exceeds benefit (<10 items)",
        "When you need results in strict order",
      ],
    },
  };

  return patterns[id] || { whenUse: [], whenAvoid: [] };
}

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
