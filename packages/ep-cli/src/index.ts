#!/usr/bin/env bun

/**
 * ep.ts
 *
 * A unified project management CLI for EffectPatterns.
 */

import { Command } from "@effect/cli";
import { Effect, Layer } from "effect";

import { validateEnvironment } from "./config/validate-env.js";
import { CLI } from "./constants.js";

// Commands
import { adminCommand } from "./commands/admin-commands.js";
import { installCommand } from "./commands/install-commands.js";
import { patternCommand } from "./commands/pattern-commands.js";
import { listCommand, searchCommand, showCommand } from "./commands/pattern-repo-commands.js";
import { releaseCommand } from "./commands/release-commands.js";
import { skillsCommand } from "./commands/skills-commands.js";

// Services
import { NodeFileSystem } from "@effect/platform-node";
import { Display } from "./services/display/index.js";
import { LiveTUILoader, TUILoader } from "./services/display/tui-loader.js";
import { Execution } from "./services/execution/index.js";
import { InstallLive } from "./services/install/index.js";
import { Linter } from "./services/linter/index.js";
import { Logger, LoggerLive, parseLogLevel } from "./services/logger/index.js";
import { Skills } from "./services/skills/index.js";

/**
 * Resolve logger configuration from environment variables (synchronous version).
 *
 * Logger configuration is resolved from the following sources (in priority order):
 * 1. LOG_LEVEL environment variable (e.g., LOG_LEVEL=debug)
 * 2. DEBUG environment variable (if set, enables debug logging)
 * 3. VERBOSE environment variable (if set, enables debug logging)
 * 4. Default: "info" level
 *
 * Environment variables are used instead of CLI options to avoid duplicating
 * the @effect/cli parsing logic. Logger configuration happens during layer
 * initialization before CLI argument parsing, so CLI options cannot be used.
 * This approach also follows Unix principles and simplifies the architecture.
 *
 * @returns Logger configuration object with logLevel
 */
const resolveLoggerConfig = () => {
  const logLevelEnv = process.env.LOG_LEVEL;
  const debugEnv = process.env.DEBUG;
  const verboseEnv = process.env.VERBOSE;

  // Priority: explicit LOG_LEVEL > DEBUG > VERBOSE > default
  const logLevel =
    (logLevelEnv && parseLogLevel(logLevelEnv)) ||
    (debugEnv && "debug") ||
    (verboseEnv && "debug") ||
    "info";

  return { logLevel, verbose: logLevel === "debug" };
};

const globalConfig = resolveLoggerConfig();

/**
 * Unified Root Command
 *
 * Note: Logger configuration is done via environment variables (LOG_LEVEL, DEBUG, VERBOSE)
 * rather than CLI options to avoid duplicating the @effect/cli parsing logic.
 * This provides a cleaner separation of concerns and follows Unix principles.
 */
export const rootCommand = Command.make("ep").pipe(
  Command.withDescription(CLI.DESCRIPTION),
  Command.withSubcommands([
    searchCommand,
    listCommand,
    showCommand,
    patternCommand,
    installCommand,
    releaseCommand,
    adminCommand,
    skillsCommand,
  ])
);

// Layers
/**
 * Core runtime layer (Standard CLI)
 */
const BaseLayer = Layer.mergeAll(
  NodeFileSystem.layer,
  LoggerLive(globalConfig),
  LiveTUILoader
);

const ServiceLayer = Layer.mergeAll(
  Linter.Default,
  Skills.Default,
  Display.Default,
  InstallLive,
  Layer.provide(Execution.Default, Logger.Default)
).pipe(
  Layer.provide(BaseLayer)
);

export const runtimeLayer = Layer.merge(BaseLayer, ServiceLayer);

/**
 * Runtime layer with TUI support
 */
export const runtimeLayerWithTUI = Effect.gen(function* () {
  const tuiLoader = yield* TUILoader;
  const tui = yield* tuiLoader.load();

  if (tui?.runtimeLayer) {
    return runtimeLayer.pipe(Layer.provide(tui.runtimeLayer));
  }

  return runtimeLayer;
});

const cliRunner = Command.run(rootCommand, {
  name: CLI.RUNNER_NAME,
  version: CLI.VERSION,
});

export const createProgram = (argv: ReadonlyArray<string> = process.argv) =>
  cliRunner(argv);

// Run the program
const program = Effect.gen(function* () {
  // Validate environment first
  yield* validateEnvironment;
  // Then run the CLI
  yield* createProgram(process.argv);
});

const provided = program.pipe(
  Effect.provide(runtimeLayer),
  Effect.tapErrorCause((cause) =>
    Effect.gen(function* () {
      const logger = yield* Logger;
      yield* logger.error("Fatal Error", { cause });
    }).pipe(Effect.provide(runtimeLayer))
  )
);

void Effect.runPromise(provided as Effect.Effect<void, unknown, never>).catch(() => {
  process.exitCode = 1;
});
