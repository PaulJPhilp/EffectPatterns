/**
 * Pattern Repository Commands
 */

import { createDatabase, createEffectPatternRepository } from "@effect-patterns/toolkit";
import { Args, Command, Options } from "@effect/cli";
import { Console, Effect } from "effect";
import { Display } from "../services/display/index.js";
import { closeDatabaseSafely } from "../utils/database.js";

/**
 * search <query> - Search patterns
 */
export const searchCommand = Command.make("search", {
  args: { 
    query: Args.text({ name: "query" }).pipe(
      Args.withDescription("The search keyword")
    ) 
  },
}).pipe(
  Command.withDescription("Search patterns by keyword"),
  Command.withHandler(({ args }) =>
    Effect.gen(function* () {
      const { db } = createDatabase();
      try {
        const repo = createEffectPatternRepository(db);
        const results = yield* Effect.tryPromise({
          try: () => repo.search({ query: args.query, limit: 10 }),
          catch: (e) => new Error(`Search failed: ${e}`),
        });

        if (results.length === 0) {
          yield* Display.showError(`No patterns found for "${args.query}"`);
        } else {
          yield* Console.log(`\nFound ${results.length} pattern(s):\n`);
          for (const p of results) {
            yield* Console.log(`  • ${p.title} (${p.slug})`);
          }
        }
      } finally {
        yield* closeDatabaseSafely(db);
      }
    })
  )
);

/**
 * list - List all patterns
 */
export const listCommand = Command.make("list", {
  options: {
    difficulty: Options.optional(
      Options.text("difficulty").pipe(
        Options.withDescription("Filter by difficulty level")
      )
    ),
    category: Options.optional(
      Options.text("category").pipe(
        Options.withDescription("Filter by category")
      )
    ),
  },
}).pipe(
  Command.withDescription("List all patterns with optional filters"),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      const { db } = createDatabase();
      try {
        const repo = createEffectPatternRepository(db);
        const results = yield* Effect.tryPromise({
          try: () => repo.search({}),
          catch: (e) => new Error(`List failed: ${e}`),
        });

        yield* Console.log(`\nTotal Patterns: ${results.length}\n`);
        for (const p of results) {
          yield* Console.log(`  • ${p.title} (${p.slug})`);
        }
      } finally {
        yield* closeDatabaseSafely(db);
      }
    })
  )
);

/**
 * show <pattern-id> - Show details
 */
export const showCommand = Command.make("show", {
  args: { patternId: Args.text({ name: "pattern-id" }) },
}).pipe(
  Command.withDescription("Show detailed pattern information"),
  Command.withHandler(({ args }) =>
    Effect.gen(function* () {
      const { db } = createDatabase();
      try {
        const repo = createEffectPatternRepository(db);
        const p = yield* Effect.tryPromise({
          try: () => repo.findBySlug(args.patternId),
          catch: (e) => new Error(`Show failed: ${e}`),
        });

        if (!p) {
          yield* Display.showError(`Pattern "${args.patternId}" not found`);
          return;
        }

        yield* Display.showPanel(p.summary, p.title);
      } finally {
        yield* closeDatabaseSafely(db);
      }
    })
  )
);
