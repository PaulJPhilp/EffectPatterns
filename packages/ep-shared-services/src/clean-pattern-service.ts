/**
 * MCP Pattern Service with Clean Presentation
 * 
 * Wraps MCP pattern calls and hides all tool-call noise.
 * Returns clean, consistently-formatted pattern cards.
 * 
 * Usage:
 * - Instead of: console.log("Searching the Effect Patterns MCP server...")
 * - You get: Clean PatternCardIndex with interactive cards
 */

import { Effect } from "effect";
import type {
  PatternCard,
  PatternCardIndex,
  PatternPresentationOptions,
} from "./pattern-presentation";
import { PatternPresenter } from "./pattern-presentation";

/**
 * Clean MCP pattern service - hides tool noise
 */
export class CleanPatternService extends Effect.Service<CleanPatternService>()(
  "CleanPatternService",
  {
    sync: () => {
      // Mock data for demonstration
      const mockPatterns = [
        {
          id: "process-collection-in-parallel-with-foreach",
          title: "Process a Collection in Parallel with Effect.forEach",
          difficulty: "intermediate" as const,
          category: "concurrency",
          description:
            "Use Effect.forEach with the concurrency option to process collections",
          summary:
            "Use Effect.forEach with the `concurrency` option to process a collection of items in parallel with a fixed limit, preventing resource exhaustion.",
          tags: ["concurrency", "parallel", "performance"],
          examples: [
            {
              title: "Basic Parallel Processing",
              code: `const userIds = Array.from({ length: 10 }, (_, i) => i + 1);

const program = Effect.gen(function* () {
  const users = yield* Effect.forEach(userIds, fetchUserById, {
    concurrency: 5,
  });
  return users;
});`,
              language: "typescript" as const,
              notes:
                "This processes 10 users with max 5 concurrent fetches.",
            },
          ],
          related: [
            { id: "run-effects-in-parallel-with-all" },
            { id: "race-concurrent-effects" },
          ],
        },
        {
          id: "run-effects-in-parallel-with-all",
          title: "Run Independent Effects in Parallel with Effect.all",
          difficulty: "intermediate" as const,
          category: "concurrency",
          description:
            "Use Effect.all to run multiple independent effects concurrently",
          summary:
            "Use Effect.all to run multiple independent effects concurrently and collect all their results into a single tuple.",
          tags: ["concurrency", "parallel", "performance"],
          examples: [
            {
              title: "Parallel Data Fetching",
              code: `const fetchUser = Effect.succeed({ id: 1, name: "Paul" }).pipe(
  Effect.delay("1 second")
);

const fetchPosts = Effect.succeed([{ title: "Post 1" }]).pipe(
  Effect.delay("1.5 seconds")
);

const program = Effect.all([fetchUser, fetchPosts], {
  concurrency: "unbounded",
});`,
              language: "typescript" as const,
              notes:
                "Total time: 1.5s (longest), not 2.5s (sum).",
            },
          ],
          related: [
            { id: "process-collection-in-parallel-with-foreach" },
            { id: "race-concurrent-effects" },
          ],
        },
      ];

      return {
        /**
         * Search patterns - returns clean index without noise
         */
        searchPatterns: (query: string, category?: string): Effect.Effect<PatternCardIndex, never, PatternPresenter> =>
          Effect.gen(function* () {
            const presenter = yield* PatternPresenter;

            // Filter by query
            const filtered = mockPatterns.filter(
              p =>
                p.title.toLowerCase().includes(query.toLowerCase()) ||
                p.tags.some(t => t.includes(query.toLowerCase())) ||
                (category ? p.category === category : true)
            );

            // Format as index
            const index = presenter.formatIndex(filtered, {
              hideMetadata: true,
              includeAdvanced: false,
            });

            return index;
          }),

        /**
         * Get single pattern - returns clean card without noise
         */
        getPattern: (id: string): Effect.Effect<PatternCard, never, PatternPresenter> =>
          Effect.gen(function* () {
            const presenter = yield* PatternPresenter;

            // Mock: in production, yield* mcpServer.getPattern(id)
            const mockPattern = {
              id,
              title: "Pattern Title",
              difficulty: "intermediate" as const,
              category: "concurrency",
              description: "Pattern description",
              summary: "Pattern summary",
              tags: ["tag1", "tag2"],
              examples: [
                {
                  title: "Example",
                  code: "// code here",
                  language: "typescript" as const,
                },
              ],
            };

            const card = presenter.formatCard(mockPattern, {
              hideMetadata: true,
              includeAdvanced: true,
              includeGotchas: true,
            });

            return card;
          }),

        /**
         * List all patterns by category - returns clean index
         */
        listByCategory: (category: string): Effect.Effect<PatternCardIndex, never, PatternPresenter> =>
          Effect.gen(function* () {
            const presenter = yield* PatternPresenter;
            
            const mockPatternsForCategory = mockPatterns.filter(
              p => p.category === category
            );

            const index = presenter.formatIndex(mockPatternsForCategory, {
              hideMetadata: true,
            });

            return index;
          }),

        /**
         * Render search results as interactive table
         */
        renderSearchResults: (
          query: string,
          category?: string
        ): Effect.Effect<string, never, PatternPresenter> =>
          Effect.gen(function* () {
            const presenter = yield* PatternPresenter;
            
            // Reuse mock data
            const filtered = mockPatterns.filter(
              p =>
                p.title.toLowerCase().includes(query.toLowerCase()) ||
                p.tags.some(t => t.includes(query.toLowerCase())) ||
                (category ? p.category === category : true)
            );

            const index = presenter.formatIndex(filtered, {
              hideMetadata: true,
            });
            
            return presenter.renderIndex(index);
          }),

        /**
         * Render single pattern card in detail
         */
        renderCard: (id: string): Effect.Effect<string, never, PatternPresenter> =>
          Effect.gen(function* () {
            const presenter = yield* PatternPresenter;

            // Find pattern in mock data
            const pattern = mockPatterns.find(p => p.id === id);
            if (!pattern) {
              return `Pattern "${id}" not found`;
            }

            const card = presenter.formatCard(pattern, {
              hideMetadata: true,
              includeAdvanced: true,
              includeGotchas: true,
            });

            return presenter.renderCard(card);
          }),
      };
    },
  }
) {}

/**
 * Helper: Render clean summary without tool noise
 * 
 * Usage in Claude chat:
 * ```
 * const results = yield* cleanPatternService.searchPatterns("concurrency");
 * const rendered = yield* cleanPatternService.renderSearchResults("concurrency");
 * console.log(rendered); // Clean table, no "[8 tools called]" noise
 * ```
 */
export type CleanPatternServiceInterface = typeof CleanPatternService;
