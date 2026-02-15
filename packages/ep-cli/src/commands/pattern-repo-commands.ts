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
  options: {
    json: Options.boolean("json").pipe(
      Options.withDescription("Output results as JSON"),
      Options.withDefault(false)
    ),
  }
}).pipe(
  Command.withDescription("Search patterns by keyword"),
  Command.withHandler(({ args, options }) =>
    Effect.gen(function* () {
      const patterns = yield* PatternApi;
      const results = yield* patterns.search({ query: args.query, limit: 10 });

      if (options.json) {
        yield* Console.log(JSON.stringify({
          count: results.length,
          patterns: results,
        }, null, 2));
        return;
      }

      if (results.length === 0) {
        yield* Display.showError(`No patterns found for "${args.query}"`);
        yield* Display.showInfo(`Try: ep list --category core-concepts`);
        yield* Display.showInfo(`Try: ep list --difficulty beginner`);
        return;
      }

      yield* Console.log(`\nFound ${results.length} pattern(s):\n`);
      for (const p of results) {
        yield* Console.log(`  • ${p.title} (${p.id})`);
      }
      const first = results[0];
      if (first) {
        yield* Display.showInfo(`Next: ep show ${first.id}`);
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
    json: Options.boolean("json").pipe(
      Options.withDescription("Output results as JSON"),
      Options.withDefault(false)
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

      if (options.json) {
        yield* Console.log(JSON.stringify({
          count: results.length,
          patterns: results,
        }, null, 2));
        return;
      }

      yield* Console.log(`\nTotal Patterns: ${results.length}\n`);
      for (const p of results) {
        yield* Console.log(`  • ${p.title} (${p.id})`);
      }
      if (results.length > 0) {
        yield* Display.showInfo(`Next: ep show ${results[0]?.id}`);
      } else {
        yield* Display.showInfo(`Try: ep search retry`);
      }
    })
  )
);

/**
 * show <pattern-id> - Show details
 */
export const showCommand = Command.make("show", {
  args: { patternId: Args.text({ name: "pattern-id" }) },
  options: {
    json: Options.boolean("json").pipe(
      Options.withDescription("Output result as JSON"),
      Options.withDefault(false)
    ),
  }
}).pipe(
  Command.withDescription("Show detailed pattern information"),
  Command.withHandler(({ args, options }) =>
    Effect.gen(function* () {
      const patterns = yield* PatternApi;
      const p = yield* patterns.getById(args.patternId);

      if (!p) {
        if (options.json) {
          yield* Console.log(JSON.stringify({
            pattern: null,
            message: `Pattern "${args.patternId}" not found`,
          }, null, 2));
          return;
        }
        yield* Display.showError(`Pattern "${args.patternId}" not found`);
        yield* Display.showInfo(`Try: ep search "${args.patternId}"`);
        return;
      }

      if (options.json) {
        yield* Console.log(JSON.stringify({ pattern: p }, null, 2));
        return;
      }

      yield* Display.showPanel(p.description, p.title);
      yield* Display.showInfo(`Next: ep search "${p.category}"`);
    })
  )
);
