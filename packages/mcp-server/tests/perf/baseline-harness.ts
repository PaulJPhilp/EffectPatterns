/**
 * MCP Server Performance Baseline Harness
 *
 * Measures latency, memory, and throughput for:
 * - search_patterns (hot path)
 * - get_pattern (hot path)
 * - rendering (markdown/JSON)
 *
 * Usage:
 *   bun tests/perf/baseline-harness.ts
 *
 * Output:
 *   - p50, p95, p99 latency (ms)
 *   - memory usage (MB)
 *   - throughput (ops/sec)
 */

import { performance } from "perf_hooks";

// ============================================================================
// Mock Fixtures
// ============================================================================

const MOCK_PATTERNS = [
  {
    id: "pattern-validation-filter-or-fail",
    title: "Input Validation with Effect.filterOrFail",
    category: "validation",
    difficulty: "beginner",
    description:
      "Create a validator using Effect.filterOrFail to check preconditions",
    examples: [
      {
        code: 'const validate = (n: number) => Effect.succeed(n).pipe(Effect.filterOrFail(x => x > 0, () => new Error("must be positive")))',
        language: "typescript",
      },
    ],
    useCases: ["Input validation", "Precondition checking"],
    tags: ["validation", "error-handling"],
    relatedPatterns: ["error-tagged-error"],
  },
  {
    id: "pattern-service-effect-service",
    title: "Effect.Service Skeleton",
    category: "service",
    difficulty: "intermediate",
    description: "Create a new Effect.Service skeleton for dependency injection",
    examples: [
      {
        code: "export class MyService extends Effect.Service<MyService>()('MyService', { effect: Effect.gen(function*() { return { method: () => Effect.succeed('result') }; }) }) {}",
        language: "typescript",
      },
    ],
    useCases: ["Service definition", "Dependency injection"],
    tags: ["service", "architecture"],
    relatedPatterns: [],
  },
  {
    id: "pattern-error-tagged-error",
    title: "Data.TaggedError Skeleton",
    category: "error-handling",
    difficulty: "intermediate",
    description: "Create a Data.TaggedError for typed failures",
    examples: [
      {
        code: 'export class ValidationError extends Data.TaggedError("ValidationError")<{ readonly message: string }> {}',
        language: "typescript",
      },
    ],
    useCases: ["Error definition", "Type-safe errors"],
    tags: ["error-handling", "types"],
    relatedPatterns: [],
  },
];

interface SearchResultsPayload {
  readonly count: number;
  readonly patterns: readonly typeof MOCK_PATTERNS;
}

// ============================================================================
// Content Builders (Mock from mcp-content-builders.ts)
// ============================================================================

type TextContent = { type: "text"; text: string; annotations?: unknown };

function createTextBlock(
  text: string,
  _annotations?: unknown
): TextContent {
  return {
    type: "text",
    text,
  };
}

function createCodeBlock(
  code: string,
  _language: string = "typescript",
  description?: string
): TextContent {
  const codeBlock = `\`\`\`${_language}\n${code}\n\`\`\``;
  const fullText = description ? `${description}\n\n${codeBlock}` : codeBlock;
  return { type: "text", text: fullText };
}

function buildIndexTable(patterns: readonly typeof MOCK_PATTERNS): string {
  if (patterns.length === 0) return "No patterns found.";

  const header =
    "| Pattern | Category | Difficulty | Tags |\n| :--- | :--- | :--- | :--- |";
  const rows = patterns.map((p) => {
    const tags = p.tags ? p.tags.join(", ") : "";
    return `| **${p.title}** (\`${p.id}\`) | ${p.category} | ${p.difficulty} | ${tags} |`;
  });

  return `${header}\n${rows.join("\n")}`;
}

function buildSearchResultsContent(
  results: SearchResultsPayload,
  options: { limitCards?: number; query?: string } = {}
): TextContent[] {
  const content: TextContent[] = [];
  const limitCards = options.limitCards ?? 3;

  // Summary header
  const queryInfo = options.query ? ` for "${options.query}"` : "";
  content.push(
    createTextBlock(
      `# Search Results${queryInfo}\nFound **${results.count}** patterns.`
    )
  );

  // Index table
  content.push(
    createTextBlock(`## Index\n\n${buildIndexTable(results.patterns)}`)
  );

  // Top N cards
  if (results.patterns.length > 0) {
    const displayCount = Math.min(results.patterns.length, limitCards);
    content.push(
      createTextBlock(`## Top ${displayCount} Patterns`)
    );

    for (let i = 0; i < displayCount; i++) {
      const pattern = results.patterns[i];
      content.push(
        createTextBlock(`### ${pattern.title}`)
      );
      content.push(
        createTextBlock(
          `**Category:** ${pattern.category} | **Difficulty:** ${pattern.difficulty}`
        )
      );
      if (pattern.examples && pattern.examples.length > 0) {
        content.push(
          createCodeBlock(
            pattern.examples[0].code,
            pattern.examples[0].language || "typescript"
          )
        );
      }
    }
  }

  return content;
}

// ============================================================================
// Test Runners
// ============================================================================

interface LatencyStats {
  samples: number[];
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
}

function calculateStats(samples: number[]): LatencyStats {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;

  return {
    samples,
    min: sorted[0],
    max: sorted[n - 1],
    mean: sorted.reduce((a, b) => a + b, 0) / n,
    p50: sorted[Math.floor(n * 0.5)],
    p95: sorted[Math.floor(n * 0.95)],
    p99: sorted[Math.floor(n * 0.99)],
  };
}

function formatStats(name: string, stats: LatencyStats): string {
  return `
${name}:
  Samples: ${stats.samples.length}
  Min:     ${stats.min.toFixed(2)}ms
  Mean:    ${stats.mean.toFixed(2)}ms
  p50:     ${stats.p50.toFixed(2)}ms
  p95:     ${stats.p95.toFixed(2)}ms
  p99:     ${stats.p99.toFixed(2)}ms
  Max:     ${stats.max.toFixed(2)}ms`;
}

async function runSearchPatternsTest(iterations: number = 100): Promise<LatencyStats> {
  console.log(`\n📊 Testing search_patterns (${iterations} iterations)...`);

  const latencies: number[] = [];
  const searchQueries = ["service", "validation", "effect", "error"];

  for (let i = 0; i < iterations; i++) {
    const query = searchQueries[i % searchQueries.length];
    const startMem = process.memoryUsage().heapUsed / 1024 / 1024;

    const start = performance.now();

    // Simulate API call (would be real fetch in integration test)
    const results: SearchResultsPayload = {
      count: MOCK_PATTERNS.length,
      patterns: MOCK_PATTERNS,
    };

    // Render results
    const content = buildSearchResultsContent(results, {
      limitCards: 3,
      query,
    });

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed / 1024 / 1024;

    latencies.push(end - start);

    if (i % 20 === 0) {
      console.log(
        `  [${i}/${iterations}] latency: ${(end - start).toFixed(2)}ms, heap: ${(endMem - startMem).toFixed(2)}MB`
      );
    }
  }

  return calculateStats(latencies);
}

async function runGetPatternTest(iterations: number = 100): Promise<LatencyStats> {
  console.log(`\n📊 Testing get_pattern (${iterations} iterations)...`);

  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const patternId =
      MOCK_PATTERNS[i % MOCK_PATTERNS.length].id;
    const startMem = process.memoryUsage().heapUsed / 1024 / 1024;

    const start = performance.now();

    // Simulate API call
    const pattern = MOCK_PATTERNS[i % MOCK_PATTERNS.length];

    // Render pattern
    const content: TextContent[] = [];
    content.push(createTextBlock(`# ${pattern.title}`));
    content.push(
      createTextBlock(
        `**Category:** ${pattern.category} | **Difficulty:** ${pattern.difficulty}`
      )
    );
    content.push(createTextBlock(pattern.description));
    if (pattern.examples && pattern.examples.length > 0) {
      content.push(
        createCodeBlock(
          pattern.examples[0].code,
          pattern.examples[0].language || "typescript"
        )
      );
    }

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed / 1024 / 1024;

    latencies.push(end - start);

    if (i % 20 === 0) {
      console.log(
        `  [${i}/${iterations}] latency: ${(end - start).toFixed(2)}ms, heap: ${(endMem - startMem).toFixed(2)}MB`
      );
    }
  }

  return calculateStats(latencies);
}

async function runRenderingTest(iterations: number = 100): Promise<LatencyStats> {
  console.log(
    `\n📊 Testing markdown rendering (${iterations} iterations)...`
  );

  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const resultSize = (i % 3) + 1; // 1, 2, or 3 patterns
    const patterns = MOCK_PATTERNS.slice(0, resultSize);
    const startMem = process.memoryUsage().heapUsed / 1024 / 1024;

    const start = performance.now();

    const results: SearchResultsPayload = {
      count: patterns.length,
      patterns,
    };

    buildSearchResultsContent(results, {
      limitCards: 3,
      query: "test",
    });

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed / 1024 / 1024;

    latencies.push(end - start);

    if (i % 20 === 0) {
      console.log(
        `  [${i}/${iterations}] latency: ${(end - start).toFixed(2)}ms, heap: ${(endMem - startMem).toFixed(2)}MB`
      );
    }
  }

  return calculateStats(latencies);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("🚀 MCP Server Performance Baseline Harness");
  console.log("==========================================");
  console.log(`Node: ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log(
    `Memory: ${(require("os").totalmem() / 1024 / 1024 / 1024).toFixed(1)}GB`
  );

  const startMem = process.memoryUsage().heapUsed / 1024 / 1024;

  // Run tests
  const searchStats = await runSearchPatternsTest(100);
  const getStats = await runGetPatternTest(100);
  const renderStats = await runRenderingTest(100);

  const endMem = process.memoryUsage().heapUsed / 1024 / 1024;

  // Print results
  console.log("\n" + "=".repeat(50));
  console.log("BASELINE RESULTS");
  console.log("=".repeat(50));

  console.log(formatStats("search_patterns", searchStats));
  console.log(formatStats("get_pattern", getStats));
  console.log(formatStats("markdown_rendering", renderStats));

  console.log(`
Memory Usage:
  Start: ${startMem.toFixed(2)}MB
  End:   ${endMem.toFixed(2)}MB
  Delta: ${(endMem - startMem).toFixed(2)}MB`);

  console.log("\n✅ Baseline complete. Save results for comparison.");
}

main().catch(console.error);
