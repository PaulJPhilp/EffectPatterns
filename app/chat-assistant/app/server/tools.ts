import { tool } from 'ai';
import { Effect } from 'effect';
import { z } from 'zod';
import { runEffect } from './runtime';

interface PatternRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly difficulty: string;
  readonly tags: readonly string[];
  readonly keywords: readonly string[];
  readonly content: string;
}

const patternLibrary: readonly PatternRecord[] = [
  {
    id: 'run-tasks-in-parallel',
    title: 'Run Tasks in Parallel',
    description:
      'Use Effect.all or Effect.forEachPar to orchestrate parallel work.',
    category: 'concurrency',
    difficulty: 'intermediate',
    tags: ['concurrency', 'parallel', 'fibers'],
    keywords: [
      'concurrency',
      'parallel',
      'parallelize',
      'forEachPar',
      'Effect.all',
    ],
    content: `## Run Tasks in Parallel

Use Effect combinators to execute tasks concurrently:

\`\`\`ts
import { Effect } from "effect";

const program = Effect.all([
  Effect.promise(() => fetchUser()),
  Effect.promise(() => fetchOrders()),
]);
\`\`\`

Control concurrency limits:

\`\`\`ts
const withLimit = Effect.forEach(
  users,
  (user) => Effect.promise(() => processUser(user)),
  { concurrency: 4 }
);
\`\`\`
`,
  },
  {
    id: 'coordinate-fibers',
    title: 'Coordinate Fibers Safely',
    description:
      'Fork fibers and join or interrupt them to manage concurrency explicitly.',
    category: 'concurrency',
    difficulty: 'advanced',
    tags: ['concurrency', 'fibers', 'coordination'],
    keywords: ['fiber', 'fibers', 'join', 'interrupt'],
    content: `## Coordinate Fibers Safely

Fibers let you manage concurrent workflows:

\`\`\`ts
const program = Effect.gen(function* () {
  const fiber = yield* Effect.fork(someEffect);
  const result = yield* fiber.join();
  return result;
});
\`\`\`

Ensure cleanup with interruption:

\`\`\`ts
yield* Effect.acquireUseRelease(
  Effect.fork(acquireResource()),
  (fiber) => Effect.flatMap(fiber, (f) => f.join()),
  (fiber) => fiber.interrupt
);
\`\`\`
`,
  },
  {
    id: 'retry-with-schedule',
    title: 'Retry with Exponential Backoff',
    description:
      'Combine Effect.retry with Schedule.exponential and jitter for robustness.',
    category: 'resilience',
    difficulty: 'intermediate',
    tags: ['retry', 'schedule', 'backoff'],
    keywords: ['retry', 'backoff', 'exponential', 'schedule'],
    content: `## Retry with Exponential Backoff

Use schedules to add resilience:

\`\`\`ts
import { Effect, Schedule } from "effect";

const request = Effect.tryPromise({
  try: () => fetch("https://service"),
  catch: (cause) => new FetchError({ cause }),
});

const withBackoff = Effect.retry(
  request,
  Schedule.exponential("500 millis").pipe(
    Schedule.jittered,
    Schedule.intersect(Schedule.recurs(5))
  )
);
\`\`\`

Handle failures after retries:

\`\`\`ts
const safe = Effect.catchAll(withBackoff, (error) =>
  Effect.logError("Request failed", error)
);
\`\`\`
`,
  },
  {
    id: 'handle-errors-with-catch',
    title: 'Handle Errors with catchTag, catchTags, and catchAll',
    description:
      'Learn how to handle errors in Effect programs using typed error recovery.',
    category: 'error-handling',
    difficulty: 'beginner',
    tags: ['error-handling', 'recovery', 'typed-errors'],
    keywords: ['error', 'catch', 'typed', 'recovery'],
    content: `## Handle Errors with catchTag, catchTags, and catchAll

Recover from specific error types:

\`\`\`ts
const program = Effect.tryPromise(() => mayFail()).pipe(
  Effect.catchTag("NotFound", (error) => Effect.succeed(defaultValue)),
  Effect.catchAll((error) => Effect.fail(new AppError({ cause: error })))
);
\`\`\`

Use typed errors for precise recovery paths.
`,
  },
];

/**
 * AI Tools - Functions that the LLM can invoke
 *
 * These are wrappers around our Effect services that provide
 * a clean interface for the Vercel AI SDK
 */

/**
 * searchPatterns Tool
 * Allows the AI to search for Effect patterns in the pattern library
 */
export const searchPatternsTool = tool({
  description: `Search for Effect-TS patterns in the pattern library.
    Use this when the user asks about how to do something with Effect,
    wants to learn about a specific pattern, or needs examples.
    Returns matching patterns with descriptions and code examples.`,

  parameters: z.object({
    query: z
      .string()
      .describe(
        "The search query (e.g., 'retry with backoff', 'error handling', 'concurrent processing')"
      ),
    category: z.string().optional().describe('Filter by category if specified'),
    difficulty: z
      .string()
      .optional()
      .describe(
        'Filter by difficulty level: beginner, intermediate, or advanced'
      ),
    limit: z
      .number()
      .optional()
      .describe('Maximum number of results to return (default: 5)'),
  }),

  execute: async ({ query, category, difficulty, limit = 5 }) => {
    // For now, we'll create a simplified implementation
    // that returns mock data since we need to integrate with the toolkit properly

    // In a full implementation, this would:
    // 1. Load patterns from the toolkit
    // 2. Search using the toolkit's search function
    // 3. Return formatted results

    const normalizedQuery = query.toLowerCase().trim();

    const matches = patternLibrary.filter((pattern) => {
      if (category && pattern.category !== category) {
        return false;
      }

      if (difficulty && pattern.difficulty !== difficulty) {
        return false;
      }

      if (normalizedQuery.length === 0) {
        return true;
      }

      const inKeywords = pattern.keywords.some((keyword: string) =>
        normalizedQuery.includes(keyword.toLowerCase())
      );

      const inTags = pattern.tags.some((tag: string) =>
        normalizedQuery.includes(tag.toLowerCase())
      );

      return inKeywords || inTags;
    });

    const filtered = matches.length > 0 ? matches : patternLibrary;
    const limited = filtered.slice(0, limit);

    const total = filtered.length;
    const summary =
      limited.length > 0
        ? `Found ${total} pattern${total === 1 ? '' : 's'} matching "${query}". Top match: "${limited[0].title}" (${limited[0].category}).`
        : `No patterns found for "${query}".`;

    return {
      query,
      total,
      results: limited,
      summary,
      recommendations: limited.map((pattern) => ({
        id: pattern.id,
        title: pattern.title,
        why: pattern.description,
      })),
    };
  },
});

/**
 * reviewCodeSnippet Tool
 * Allows the AI to review Effect code and suggest improvements
 */
export const reviewCodeSnippetTool = tool({
  description: `Review an Effect-TS code snippet and suggest improvements.
    Use this when the user pastes code and asks for review, refactoring suggestions,
    or wants to know if they're following best practices.
    Returns analysis, suggestions, and optionally a diff showing the improved code.`,

  parameters: z.object({
    code: z.string().describe('The Effect-TS code snippet to review'),
  }),

  execute: async ({ code }) => {
    // Import McpClient dynamically to use in Effect context
    const { McpClient } = await import('./services/mcp-client');

    try {
      const result = await runEffect(
        Effect.gen(function* () {
          const client = yield* McpClient;
          return yield* client.reviewCode(code);
        })
      );

      return {
        analysis: result.analysis,
        suggestion: result.suggestion,
        diff: result.diff,
        reviewed: true,
      };
    } catch (error) {
      // If MCP server is not available, provide basic feedback
      return {
        analysis: 'MCP server is not available for detailed code review.',
        suggestion:
          'Please ensure the MCP server is running at ' +
          (process.env.MCP_SERVER_URL || 'http://localhost:3000'),
        diff: '',
        reviewed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Export all tools as a single object for the AI SDK
 */
export const tools = {
  searchPatterns: searchPatternsTool,
  reviewCodeSnippet: reviewCodeSnippetTool,
};
