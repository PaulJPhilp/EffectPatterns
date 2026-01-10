/**
 * Admin Commands
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import { glob } from "glob";
import path from "node:path";
import { PROJECT_ROOT } from "../constants.js";
import { Display } from "../services/display/index.js";
import { Execution } from "../services/execution/index.js";
import { Linter } from "../services/linter/index.js";

/**
 * admin:lint - Check patterns for Effect-TS best practices
 */
export const lintCommand = Command.make("lint", {
  options: {
    fix: Options.boolean("fix").pipe(
      Options.withDescription("Auto-fix fixable issues"),
      Options.withDefault(false)
    ),
  },
}).pipe(
  Command.withDescription("Check patterns for Effect-TS best practices"),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      const linter = yield* Linter;
      yield* Display.showInfo("Linting pattern source files...");

      const patternSrcDir = path.join(PROJECT_ROOT, "content/new/src/**/*.ts");
      const files = yield* Effect.tryPromise(() => glob(patternSrcDir));

      if (files.length === 0) {
        yield* Display.showWarning("No pattern source files found to lint.");
        return;
      }

      const results = yield* linter.lintFiles(files);
      const exitCode = yield* linter.printResults(results);

      if (exitCode !== 0) {
        return yield* Effect.fail(new Error("Linting failed with errors"));
      }

      yield* Display.showSuccess("Linting completed successfully!");
    })
  )
);

/**
 * admin:validate - Validates all pattern files
 */
export const validateCommand = Command.make("validate", {
  options: {
    verbose: Options.boolean("verbose").pipe(
      Options.withAlias("v"),
      Options.withDescription("Show detailed validation output"),
      Options.withDefault(false)
    ),
  },
}).pipe(
  Command.withDescription("Validates all pattern files for correctness and consistency."),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      yield* Execution.executeScriptWithTUI(
        path.join(PROJECT_ROOT, "scripts/publish/validate-improved.ts"),
        "Validating pattern files",
        { verbose: options.verbose }
      );
      yield* Display.showSuccess("All patterns are valid!");
    })
  )
);

/**
 * admin:test - Runs all TypeScript example tests
 */
export const testCommand = Command.make("test", {
  options: {
    verbose: Options.boolean("verbose").pipe(
      Options.withAlias("v"),
      Options.withDescription("Show detailed test output"),
      Options.withDefault(false)
    ),
  },
}).pipe(
  Command.withDescription("Runs all TypeScript example tests to ensure patterns execute correctly."),
  Command.withHandler(({ options }) =>
    Execution.executeScriptWithTUI(
      path.join(PROJECT_ROOT, "scripts/publish/test-improved.ts"),
      "Running TypeScript example tests",
      { verbose: options.verbose }
    )
  )
);

/**
 * admin:pipeline - Runs the full ingestion and publishing pipeline
 */
export const pipelineCommand = Command.make("pipeline", {
  options: {
    verbose: Options.boolean("verbose").pipe(
      Options.withAlias("v"),
      Options.withDescription("Show detailed output from each step"),
      Options.withDefault(false)
    ),
  },
}).pipe(
  Command.withDescription("Runs the complete pattern publishing pipeline from test to rules generation."),
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      yield* Execution.executeScriptWithTUI(
        path.join(PROJECT_ROOT, "scripts/publish/pipeline.ts"),
        "Publishing pipeline",
        { verbose: options.verbose }
      );
      yield* Display.showSuccess("Publishing pipeline completed successfully!");
    })
  )
);

/**
 * admin:generate - Generates the main project README.md file
 */
export const generateCommand = Command.make("generate", {
  options: {
    verbose: Options.boolean("verbose").pipe(
      Options.withAlias("v"),
      Options.withDescription("Show detailed generation output"),
      Options.withDefault(false)
    ),
  },
}).pipe(
  Command.withDescription("Generates the main project README.md file from pattern metadata."),
  Command.withHandler(({ options }) =>
    Execution.executeScriptWithTUI(
      path.join(PROJECT_ROOT, "scripts/publish/generate.ts"),
      "Generating README.md",
      { verbose: options.verbose }
    )
  )
);

/**
 * admin - Administrative commands
 */
export const adminCommand = Command.make("admin").pipe(
  Command.withDescription("Administrative commands for pattern management"),
  Command.withSubcommands([
    validateCommand,
    testCommand,
    pipelineCommand,
    generateCommand,
    lintCommand,
  ])
);
