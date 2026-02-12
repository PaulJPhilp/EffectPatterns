/**
 * Pattern Repository Commands
 */

import { Args, Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { Display } from "../services/display/index.js";
import { PatternApi } from "../services/pattern-api/index.js";

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
      const patterns = yield* PatternApi;
      const results = yield* patterns.search({ query: args.query, limit: 10 });

      if (results.length === 0) {
        yield* Display.showError(`No patterns found for "${args.query}"`);
      } else {
        yield* Console.log(`\nFound ${results.length} pattern(s):\n`);
        for (const p of results) {
          yield* Console.log(`  • ${p.title} (${p.id})`);
        }
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
      const patterns = yield* PatternApi;
      const results = yield* patterns.search({
        difficulty: Option.getOrUndefined(options.difficulty),
        category: Option.getOrUndefined(options.category),
      });

      yield* Console.log(`\nTotal Patterns: ${results.length}\n`);
      for (const p of results) {
        yield* Console.log(`  • ${p.title} (${p.id})`);
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
      const patterns = yield* PatternApi;
      const p = yield* patterns.getById(args.patternId);

      if (!p) {
        yield* Display.showError(`Pattern "${args.patternId}" not found`);
        return;
      }

      yield* Display.showPanel(p.description, p.title);
    })
  )
);
