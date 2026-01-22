/**
 * Pattern Presentation Service
 * 
 * Transforms raw pattern data into consistently-formatted cards with:
 * - Hidden tool-call metadata (no "Searching...", "[8 tools called]" noise)
 * - Consistent card structure across all patterns
 * - Explicit "defaults vs recommended" guidance
 */

import { Effect } from "effect";

/**
 * Card section: Explicit defaults vs recommended
 */
export interface DefaultsVsRecommended {
  readonly default: string;
  readonly recommended: string;
  readonly rationale?: string;
}

/**
 * Card section: When to use / avoid
 */
export interface UseGuidance {
  readonly whenUse: readonly string[];
  readonly whenAvoid: readonly string[];
}

/**
 * Card section: Code example with context
 */
export interface PatternExample {
  readonly title: string;
  readonly code: string;
  readonly language: "typescript" | "bash" | "text";
  readonly notes?: string;
}

/**
 * Pattern card: consistent structure for all patterns
 */
export interface PatternCard {
  readonly id: string;
  readonly title: string;
  readonly difficulty: "beginner" | "intermediate" | "advanced";
  readonly category: string;
  readonly summary: string;
  readonly tags: readonly string[];
  
  // Guidance
  readonly useGuidance: UseGuidance;
  readonly defaultsVsRecommended: DefaultsVsRecommended;
  
  // Examples
  readonly minimalExample: PatternExample;
  readonly advancedExample?: PatternExample;
  
  // Context
  readonly commonGotchas?: readonly string[];
  readonly relatedPatterns?: readonly string[];
}

/**
 * Index of pattern cards for navigation
 */
export interface PatternCardIndex {
  readonly patterns: readonly PatternCard[];
  readonly totalCount: number;
  readonly categories: Record<string, number>;
  readonly difficulties: Record<"beginner" | "intermediate" | "advanced", number>;
}

/**
 * Hide tool-call metadata - ensures clean output to user
 */
export interface PatternPresentationOptions {
  /**
   * Hide MCP search/fetch noise (default: true)
   */
  readonly hideMetadata?: boolean;
  /**
   * Include advanced examples (default: false for brief output)
   */
  readonly includeAdvanced?: boolean;
  /**
   * Include gotchas and edge cases (default: true)
   */
  readonly includeGotchas?: boolean;
}

/**
 * Service to present patterns cleanly
 */
export class PatternPresenter extends Effect.Service<PatternPresenter>()(
  "PatternPresenter",
  {
    sync: () => ({
      /**
       * Format a single pattern as a clean card
       */
      formatCard: (
        pattern: Record<string, unknown>,
        options?: PatternPresentationOptions
      ): PatternCard => {
        const opts = { hideMetadata: true, includeAdvanced: false, ...options };
        
        // Extract base info
        const id = String(pattern.id || "unknown");
        const title = String(pattern.title || "Untitled");
        const difficulty = (pattern.difficulty as "beginner" | "intermediate" | "advanced") || "intermediate";
        const category = String(pattern.category || "general");
        const summary = String(pattern.summary || pattern.description || "");
        const tags = Array.isArray(pattern.tags) ? pattern.tags.map(String) : [];
        
        // Generate defaults vs recommended based on pattern type
        const defaultsVsRecommended = inferDefaultsVsRecommended(id, category);
        
        // Generate use guidance
        const useGuidance = inferUseGuidance(id, category, tags);
        
        // Extract or generate examples
        const minimalExample = extractMinimalExample(pattern);
        const advancedExample = opts.includeAdvanced ? extractAdvancedExample(pattern) : undefined;
        
        // Extract gotchas
        const commonGotchas = opts.includeGotchas ? extractGotchas(pattern) : undefined;
        
        // Extract related patterns
        const relatedPatterns = Array.isArray(pattern.related)
          ? (pattern.related as Array<{ id: string }>).map(r => r.id)
          : undefined;
        
        return {
          id,
          title,
          difficulty,
          category,
          summary,
          tags,
          useGuidance,
          defaultsVsRecommended,
          minimalExample,
          advancedExample,
          commonGotchas,
          relatedPatterns,
        };
      },

      /**
       * Format multiple patterns as clean index
       */
      formatIndex: (
        patterns: readonly Record<string, unknown>[],
        options?: PatternPresentationOptions
      ): PatternCardIndex => {
        const formatCard = (p: Record<string, unknown>) => {
          const id = String(p.id || "unknown");
          const title = String(p.title || "Untitled");
          const difficulty = (p.difficulty as "beginner" | "intermediate" | "advanced") || "intermediate";
          const category = String(p.category || "general");
          const summary = String(p.summary || p.description || "");
          const tags = Array.isArray(p.tags) ? p.tags.map(String) : [];
          const defaultsVsRecommended = inferDefaultsVsRecommended(id, category);
          const useGuidance = inferUseGuidance(id, category, tags);
          const minimalExample = extractMinimalExample(p);
          const advancedExample = options?.includeAdvanced ? extractAdvancedExample(p) : undefined;
          const commonGotchas = options?.includeGotchas ? extractGotchas(p) : undefined;
          const relatedPatterns = Array.isArray(p.related) ? (p.related as Array<{ id: string }>).map(r => r.id) : undefined;
          
          return {
            id,
            title,
            difficulty,
            category,
            summary,
            tags,
            useGuidance,
            defaultsVsRecommended,
            minimalExample,
            advancedExample,
            commonGotchas,
            relatedPatterns,
          };
        };

        const cards = patterns.map(formatCard);
        
        // Count by category and difficulty
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
        };
      },

      /**
       * Render index as interactive table/card deck
       */
      renderIndex: (index: PatternCardIndex): string => {
        const header = `
## Pattern Reference (${index.totalCount} patterns)

**Categories:** ${Object.entries(index.categories)
          .map(([cat, count]) => `${cat}: ${count}`)
          .join(" | ")}

**Difficulty:** Beginner: ${index.difficulties.beginner} | Intermediate: ${index.difficulties.intermediate} | Advanced: ${index.difficulties.advanced}

---

### Patterns

| Pattern | Category | Difficulty | Default | Recommended |
|---------|----------|------------|---------|-------------|`;

        const rows = index.patterns.map(card => {
          const defaultText = card.defaultsVsRecommended.default
            .split(" / ")[0]
            ?.substring(0, 30) || "";
          const recText = card.defaultsVsRecommended.recommended
            .split(" / ")[0]
            ?.substring(0, 30) || "";
          
          return `| **${card.title}** | ${card.category} | ${card.difficulty} | ${defaultText} | ${recText} |`;
        });

        return `${header}\n${rows.join("\n")}\n\n---\n\n### Click a pattern above to expand the card`;
      },

      /**
       * Render a single card in detail
       */
      renderCard: (card: PatternCard): string => {
        const sections = [
          `## ${card.title}`,
          `**${card.difficulty}** | ${card.category} | ${card.tags.join(", ")}`,
          "",
          card.summary,
          "",
          "### When to Use / Avoid",
          `**Use when:**`,
          card.useGuidance.whenUse.map(s => `- ${s}`).join("\n"),
          `**Avoid when:**`,
          card.useGuidance.whenAvoid.map(s => `- ${s}`).join("\n"),
          "",
          "### Defaults vs Recommended",
          `**Default:** ${card.defaultsVsRecommended.default}`,
          `**Recommended:** ${card.defaultsVsRecommended.recommended}`,
          card.defaultsVsRecommended.rationale
            ? `**Rationale:** ${card.defaultsVsRecommended.rationale}`
            : "",
          "",
          "### Minimal Example",
          `\`\`\`${card.minimalExample.language}`,
          card.minimalExample.code,
          "```",
        ];

        if (card.minimalExample.notes) {
          sections.push("", card.minimalExample.notes);
        }

        if (card.advancedExample) {
          sections.push(
            "",
            "### Advanced Example",
            `\`\`\`${card.advancedExample.language}`,
            card.advancedExample.code,
            "```"
          );
          if (card.advancedExample.notes) {
            sections.push("", card.advancedExample.notes);
          }
        }

        if (card.commonGotchas && card.commonGotchas.length > 0) {
          sections.push(
            "",
            "### Common Gotchas",
            card.commonGotchas.map(g => `- ${g}`).join("\n")
          );
        }

        if (card.relatedPatterns && card.relatedPatterns.length > 0) {
          sections.push(
            "",
            "### Related Patterns",
            card.relatedPatterns.map(p => `- ${p}`).join("\n")
          );
        }

        return sections.filter(s => s !== "").join("\n");
      },
    }),
  }
) {}

/**
 * Infer defaults vs recommended based on pattern type
 */
function inferDefaultsVsRecommended(
  id: string,
  category: string
): DefaultsVsRecommended {
  const patterns: Record<string, DefaultsVsRecommended> = {
    // Concurrency patterns
    "process-collection-in-parallel-with-foreach": {
      default: "Sequential (concurrency: 1)",
      recommended: "Bounded concurrency: Effect.forEach with { concurrency: N }",
      rationale: "Unbounded parallelism can exhaust resources on large datasets",
    },
    "run-effects-in-parallel-with-all": {
      default: "Sequential by default",
      recommended: "Explicit concurrency: { concurrency: 'unbounded' } or number",
      rationale: "Default sequential prevents resource exhaustion but sacrifices performance",
    },
    "race-concurrent-effects": {
      default: "All effects run until first success or all fail",
      recommended: "Pair with timeout: Effect.race(task, Effect.fail(timeout))",
      rationale: "Unbounded racing can hang indefinitely without timeout",
    },
    "run-background-tasks-with-fork": {
      default: "Forked fibers run until interrupted",
      recommended: "Use Effect.fork with guaranteed cleanup: Fiber.interrupt in finally",
      rationale: "Unmanaged fibers can leak resources and cause hangs",
    },
    "concurrency-pattern-rate-limit-with-semaphore": {
      default: "Unbounded concurrency without Semaphore",
      recommended: "Bounded with Semaphore: { concurrency: N } via permits",
      rationale: "Prevents connection pool exhaustion and API rate limit violations",
    },
    "decouple-fibers-with-queue-pubsub": {
      default: "Unbounded queue (can cause memory issues)",
      recommended: "Bounded queue: Queue.bounded(N) with backpressure",
      rationale: "Prevents memory exhaustion when producers outpace consumers",
    },
  };

  return patterns[id] || {
    default: "Default behavior varies by pattern",
    recommended: "Check pattern documentation for recommended settings",
  };
}

/**
 * Infer use guidance based on pattern type
 */
function inferUseGuidance(
  id: string,
  category: string,
  tags: readonly string[]
): UseGuidance {
  const patterns: Record<string, UseGuidance> = {
    "process-collection-in-parallel-with-foreach": {
      whenUse: [
        "Processing large collections (100+) items concurrently",
        "Need to limit concurrent operations to prevent resource exhaustion",
        "Batch processing with backpressure",
      ],
      whenAvoid: [
        "Small arrays where concurrency overhead exceeds benefit (< 10 items)",
        "Sequential operations with data dependencies",
        "CPU-bound tasks that can't benefit from I/O concurrency",
      ],
    },
    "run-effects-in-parallel-with-all": {
      whenUse: [
        "Running independent effects that don't depend on each other",
        "Fetching data from multiple sources simultaneously",
        "Combining results from parallel operations",
      ],
      whenAvoid: [
        "Effects with complex dependencies (use flatMap instead)",
        "When you only need the first result (use race instead)",
        "Unbounded arrays without concurrency limits (use forEach)",
      ],
    },
    "race-concurrent-effects": {
      whenUse: [
        "Querying redundant sources and taking fastest result",
        "Implementing timeouts by racing against a delayed failure",
        "Fallback strategies (try fast source, race against slower fallback)",
      ],
      whenAvoid: [
        "When you need all results (use all instead)",
        "Without pairing with timeout (causes hangs)",
        "For sequential operations (adds unnecessary complexity)",
      ],
    },
    "run-background-tasks-with-fork": {
      whenUse: [
        "Long-running background tasks (server listeners, consumers)",
        "Tasks that must not block the main program flow",
        "When you need to manage lifecycle (interrupt, join)",
      ],
      whenAvoid: [
        "If you need immediate result (just yield* the effect)",
        "Tasks that should run after main completes (use scoped)",
        "Without proper cleanup (risk of resource leaks)",
      ],
    },
    "concurrency-pattern-rate-limit-with-semaphore": {
      whenUse: [
        "Limiting concurrent database connections",
        "API rate limiting (max N concurrent requests)",
        "Resource pooling with controlled access",
        "Preventing thundering herd or cascading failures",
      ],
      whenAvoid: [
        "When concurrency should be unbounded",
        "For CPU-bound parallelism (fibers aren't OS threads)",
        "Without release guarantees (can deadlock)",
      ],
    },
    "decouple-fibers-with-queue-pubsub": {
      whenUse: [
        "Producer-consumer patterns with independent lifecycles",
        "Broadcasting events to multiple subscribers",
        "Decoupling sender from receivers",
        "Implementing work distribution / task queues",
      ],
      whenAvoid: [
        "Simple direct effect composition (adds complexity)",
        "When data must flow synchronously",
        "Without proper queue bounding (memory issues)",
      ],
    },
  };

  return patterns[id] || {
    whenUse: ["Consult pattern documentation"],
    whenAvoid: ["Consult pattern documentation"],
  };
}

/**
 * Extract minimal example from pattern data
 */
function extractMinimalExample(pattern: Record<string, unknown>): PatternExample {
  // If pattern has examples array, use first one
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
function extractAdvancedExample(pattern: Record<string, unknown>): PatternExample | undefined {
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
 * Extract common gotchas from pattern
 */
function extractGotchas(pattern: Record<string, unknown>): readonly string[] {
  // Look for gotchas section or anti-patterns
  if (typeof pattern.gotchas === "string") {
    return [pattern.gotchas];
  }

  if (Array.isArray(pattern.gotchas)) {
    return pattern.gotchas.map(String);
  }

  if (typeof pattern.antiPattern === "string") {
    return [pattern.antiPattern];
  }

  // Generate based on pattern type
  const id = String(pattern.id || "");
  const commonGotchas: Record<string, readonly string[]> = {
    "process-collection-in-parallel-with-foreach": [
      "Using Effect.all on large arrays instead of Effect.forEach with concurrency limits",
      "Not setting concurrency: will run all items in parallel, exhausting resources",
      "Forgetting to handle errors in individual items",
    ],
    "run-effects-in-parallel-with-all": [
      "Default is sequential—must set concurrency option for parallelism",
      "One failure fails the entire Effect.all—use separate error handling if needed",
      "Unbounded concurrency on large arrays—use Effect.forEach instead",
    ],
    "race-concurrent-effects": [
      "Losing data: race only returns first result, others are interrupted",
      "Without timeout: can hang indefinitely if all effects fail",
      "Over-using race when you need all results (use Effect.all instead)",
    ],
    "run-background-tasks-with-fork": [
      "Forgetting to interrupt fibers—causes resource leaks",
      "Using fork when you need the result immediately",
      "Unhandled exceptions in forked fibers can crash silently",
    ],
    "concurrency-pattern-rate-limit-with-semaphore": [
      "Forgetting to release permits—can cause deadlock",
      "Not using try-finally for permit release guarantee",
      "Setting concurrency too low—starves throughput",
    ],
    "decouple-fibers-with-queue-pubsub": [
      "Unbounded queues cause memory exhaustion",
      "Not handling backpressure when queue is full",
      "Forgetting to shutdown producers/consumers gracefully",
    ],
  };

  return commonGotchas[id] || [];
}
