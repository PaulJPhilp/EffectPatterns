/**
 * Show commands for inspecting database contents
 *
 * Displays summary information about what's stored in the database:
 * - all: Show patterns, skills, and application patterns
 * - patterns: Show effect patterns
 * - skills: Show skills
 */

import {
  createDatabase,
  createApplicationPatternRepository,
  createEffectPatternRepository,
  createSkillRepository,
} from "@effect-patterns/toolkit";
import { Args, Command, Options } from "@effect/cli";
import { Console, Effect } from "effect";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";

// ============================================
// Helpers
// ============================================

const withDatabase = <A>(
  fn: (repos: {
    appPatternRepo: ReturnType<typeof createApplicationPatternRepository>;
    patternRepo: ReturnType<typeof createEffectPatternRepository>;
    skillRepo: ReturnType<typeof createSkillRepository>;
  }) => Effect.Effect<A, Error, never>
) =>
  Effect.scoped(
    Effect.gen(function* () {
      const db = yield* Effect.try({
        try: () => createDatabase(),
        catch: (error) =>
          new Error(
            `Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`
          ),
      });
      yield* Effect.addFinalizer(() => Effect.promise(() => db.close()));

      const appPatternRepo = createApplicationPatternRepository(db.db);
      const patternRepo = createEffectPatternRepository(db.db);
      const skillRepo = createSkillRepository(db.db);

      return yield* fn({ appPatternRepo, patternRepo, skillRepo });
    })
  );

// ============================================
// Display helpers
// ============================================

const showPatterns = (
  patternRepo: ReturnType<typeof createEffectPatternRepository>
) =>
  Effect.gen(function* () {
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

const showSkills = (
  skillRepo: ReturnType<typeof createSkillRepository>
) =>
  Effect.gen(function* () {
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

const showApplicationPatterns = (
  appPatternRepo: ReturnType<typeof createApplicationPatternRepository>
) =>
  Effect.gen(function* () {
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

        yield* withDatabase(({ patternRepo }) =>
          showPatterns(patternRepo)
        ).pipe(
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

        yield* withDatabase(({ skillRepo }) =>
          showSkills(skillRepo)
        ).pipe(
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

        yield* withDatabase(({ appPatternRepo, patternRepo, skillRepo }) =>
          Effect.gen(function* () {
            const appCount = yield* showApplicationPatterns(appPatternRepo);
            const patternCount = yield* showPatterns(patternRepo);
            const skillCount = yield* showSkills(skillRepo);

            yield* Console.log(
              `\n  Total: ${appCount} application patterns, ${patternCount} effect patterns, ${skillCount} skills`
            );
          })
        ).pipe(
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
