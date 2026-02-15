/**
 * Show commands for inspecting database contents
 *
 * Displays summary information about what's stored in the database:
 * - all: Show patterns, skills, and application patterns
 * - patterns: Show effect patterns
 * - skills: Show skills
 */

import {
  ApplicationPatternRepositoryService,
  createSkillRepository,
  DatabaseService,
  DatabaseLayer,
  EffectPatternRepositoryService,
} from "@effect-patterns/toolkit";
import { Command } from "@effect/cli";
import { Console, Effect } from "effect";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";

// ============================================
// Display helpers
// ============================================

const showPatterns = Effect.gen(function* () {
  const patternRepo = yield* EffectPatternRepositoryService;

  const patterns = yield* Effect.tryPromise({
    try: () => patternRepo.findAll(),
    catch: (error) => new Error(`Failed to query patterns: ${error}`),
  });

  const counts = yield* Effect.tryPromise({
    try: () => patternRepo.countBySkillLevel(),
    catch: (error) => new Error(`Failed to count patterns: ${error}`),
  });

  yield* Console.log(`\n  Effect Patterns: ${patterns.length}`);
  yield* Console.log(
    `    Beginner: ${counts.beginner}  Intermediate: ${counts.intermediate}  Advanced: ${counts.advanced}`
  );

  // Group by category
  const categories = new Map<string, number>();
  for (const p of patterns) {
    const cat = p.category ?? "(none)";
    categories.set(cat, (categories.get(cat) ?? 0) + 1);
  }

  if (categories.size > 0) {
    const sorted = [...categories.entries()].sort((a, b) => b[1] - a[1]);
    yield* Console.log(`    Categories: ${sorted.length}`);
    for (const [cat, count] of sorted) {
      yield* Console.log(`      ${cat}: ${count}`);
    }
  }

  return patterns.length;
});

const showSkills = Effect.gen(function* () {
  const dbService = yield* DatabaseService;
  const skillRepo = createSkillRepository(dbService.db);

  const skills = yield* Effect.tryPromise({
    try: () => skillRepo.findAll(),
    catch: (error) => new Error(`Failed to query skills: ${error}`),
  });

  yield* Console.log(`\n  Skills: ${skills.length}`);

  if (skills.length === 0) {
    yield* Console.log(`    (none — run scripts/load-skills.ts to populate)`);
    return 0;
  }

  // Stats
  const validated = skills.filter((s) => s.validated).length;
  const totalPatterns = skills.reduce((sum, s) => sum + s.patternCount, 0);
  const versions = skills.map((s) => s.version);
  const maxVersion = Math.max(...versions);

  yield* Console.log(`    Validated: ${validated}/${skills.length}`);
  yield* Console.log(`    Total pattern links: ${totalPatterns}`);
  if (maxVersion > 1) {
    yield* Console.log(`    Max version: ${maxVersion}`);
  }

  // Group by category
  const categories = new Map<string, number>();
  for (const s of skills) {
    const cat = s.category ?? "(none)";
    categories.set(cat, (categories.get(cat) ?? 0) + 1);
  }

  const sorted = [...categories.entries()].sort((a, b) => b[1] - a[1]);
  yield* Console.log(`    Categories: ${sorted.length}`);
  for (const [cat, count] of sorted) {
    yield* Console.log(`      ${cat}: ${count}`);
  }

  return skills.length;
});

const showApplicationPatterns = Effect.gen(function* () {
  const appPatternRepo = yield* ApplicationPatternRepositoryService;

  const appPatterns = yield* Effect.tryPromise({
    try: () => appPatternRepo.findAll(),
    catch: (error) => new Error(`Failed to query application patterns: ${error}`),
  });

  yield* Console.log(`\n  Application Patterns: ${appPatterns.length}`);

  if (appPatterns.length > 0) {
    for (const ap of appPatterns) {
      const validated = ap.validated ? " [validated]" : "";
      yield* Console.log(
        `    ${ap.learningOrder}. ${ap.name} (${ap.slug})${validated}`
      );
    }
  }

  return appPatterns.length;
});

// ============================================
// Commands
// ============================================

/**
 * show patterns — List effect patterns in the database
 */
const showPatternsCommand = Command.make("patterns", {
  options: {
    ...globalOptions,
  },
})
  .pipe(Command.withDescription("Show effect patterns stored in the database"))
  .pipe(
    Command.withHandler(({ options }) =>
      Effect.gen(function* () {
        yield* configureLoggerFromOptions(options);
        yield* Display.showInfo("Querying database for patterns...");

        yield* Effect.scoped(showPatterns).pipe(
          Effect.provide(DatabaseLayer),
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Display.showError(
                `Database error: ${error instanceof Error ? error.message : String(error)}`
              );
            })
          )
        );
      })
    )
  );

/**
 * show skills — List skills in the database
 */
const showSkillsCommand = Command.make("skills", {
  options: {
    ...globalOptions,
  },
})
  .pipe(Command.withDescription("Show skills stored in the database"))
  .pipe(
    Command.withHandler(({ options }) =>
      Effect.gen(function* () {
        yield* configureLoggerFromOptions(options);
        yield* Display.showInfo("Querying database for skills...");

        yield* Effect.scoped(showSkills).pipe(
          Effect.provide(DatabaseLayer),
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Display.showError(
                `Database error: ${error instanceof Error ? error.message : String(error)}`
              );
            })
          )
        );
      })
    )
  );

/**
 * show all — Show everything in the database
 */
const showAllCommand = Command.make("all", {
  options: {
    ...globalOptions,
  },
})
  .pipe(Command.withDescription("Show all data stored in the database"))
  .pipe(
    Command.withHandler(({ options }) =>
      Effect.gen(function* () {
        yield* configureLoggerFromOptions(options);
        yield* Display.showInfo("Querying database...");

        yield* Effect.scoped(
          Effect.gen(function* () {
            const appCount = yield* showApplicationPatterns;
            const patternCount = yield* showPatterns;
            const skillCount = yield* showSkills;

            yield* Console.log(
              `\n  Total: ${appCount} application patterns, ${patternCount} effect patterns, ${skillCount} skills`
            );
          })
        ).pipe(
          Effect.provide(DatabaseLayer),
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Display.showError(
                `Database error: ${error instanceof Error ? error.message : String(error)}`
              );
            })
          )
        );
      })
    )
  );

/**
 * Compose all show commands into a single command group
 */
export const showCommand = Command.make("show").pipe(
  Command.withDescription("Show what data is stored in the database"),
  Command.withSubcommands([showAllCommand, showPatternsCommand, showSkillsCommand])
);
