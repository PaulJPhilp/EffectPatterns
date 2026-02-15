#!/usr/bin/env bun

/**
 * ep.ts
 *
 * A unified project management CLI for EffectPatterns.
 */

import { Command } from "@effect/cli";
import { Effect, Layer } from "effect";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { CLI } from "./constants.js";

// Commands
import { installCommand } from "./commands/install-commands.js";
import { listCommand, searchCommand, showCommand } from "./commands/pattern-repo-commands.js";
import { skillsCommand } from "./commands/skills-commands.js";

// Services
import { NodeContext } from "@effect/platform-node";
import { Display } from "./services/display/index.js";
import { LiveTUILoader, TUILoader } from "./services/display/tui-loader.js";
import { Install } from "./services/install/index.js";
import { LoggerLive, parseLogLevel } from "./services/logger/index.js";
import { PatternApi } from "./services/pattern-api/index.js";
import { Skills } from "./services/skills/index.js";

const EP_CLI_DOCS_URL =
  "https://github.com/PaulJPhilp/Effect-Patterns/tree/main/packages/ep-cli#readme";

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
    installCommand,
    skillsCommand,
  ])
);

// Layers
/**
 * Core runtime layer (Standard CLI)
 */
const BaseLayer = Layer.mergeAll(
  NodeContext.layer,
  LoggerLive(globalConfig),
  LiveTUILoader
);

const ServiceLayer = Layer.mergeAll(
  PatternApi.Default,
  Skills.Default,
  Display.Default,
  Layer.provide(Install.Default, PatternApi.Default)
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
    return runtimeLayer.pipe(Layer.provide(tui.runtimeLayer as Layer.Layer<never>));
  }

  return runtimeLayer;
});

const cliRunner = Command.run(rootCommand, {
  name: CLI.RUNNER_NAME,
  version: CLI.VERSION,
});

export const createProgram = (argv: ReadonlyArray<string> = process.argv) =>
  cliRunner(argv);

export const runCli = (argv: ReadonlyArray<string> = process.argv): Effect.Effect<void, unknown, never> =>
  Effect.scoped(
    createProgram(argv).pipe(
      Effect.provide(runtimeLayer)
    )
  ) as Effect.Effect<void, unknown, never>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDirectExecution = (() => {
  const executedFile = process.argv[1];
  if (!executedFile) return false;

  if (executedFile === __filename) return true;
  if (executedFile === __dirname + "/index.ts") return true;

  if (executedFile.endsWith("ep") || executedFile.endsWith("ep.js")) {
    return true;
  }

  if (executedFile.includes("dist") && executedFile.includes("index.js")) {
    return true;
  }

  return false;
})();

const extractErrorMessage = (error: unknown): string | null => {
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const combined = [error.message, error.stack].filter(Boolean).join("\n");

    if (combined.includes("CommandMismatch")) {
      return `Need command help? Run 'ep --help'.\nDocs: ${EP_CLI_DOCS_URL}`;
    }

    if (combined.includes("Unable to connect. Is the computer able to access the url?")) {
      return [
        "Unable to reach the Effect Patterns API.",
        "Check network connectivity and EFFECT_PATTERNS_API_URL, then retry.",
        `Docs: ${EP_CLI_DOCS_URL}`,
      ].join("\n");
    }

    if (combined.includes("Pattern API unauthorized (401)")) {
      return [
        "Pattern API request was unauthorized (401).",
        "Set PATTERN_API_KEY to a valid API key and retry.",
        `Docs: ${EP_CLI_DOCS_URL}`,
      ].join("\n");
    }

    if (combined.includes("SkillsDirectoryNotFoundError")) {
      return [
        "Skills directory was not found for this workspace.",
        "Run this command from a workspace containing .claude-plugin/plugins/effect-patterns/skills, or use pattern commands instead.",
        `Docs: ${EP_CLI_DOCS_URL}`,
      ].join("\n");
    }

    if (
      combined.includes("DisabledFeatureError") ||
      combined.includes("ValidationFailedError") ||
      combined.includes("UnsupportedToolError")
    ) {
      return null;
    }

    if (error.message.trim() === "An error has occurred") {
      return null;
    }

    if (error.message.trim()) {
      return `${error.message.trim()}\nDocs: ${EP_CLI_DOCS_URL}`;
    }
  }

  return String(error);
};

if (isDirectExecution) {
  void Effect.runPromise(runCli(process.argv)).catch((error) => {
    const message = extractErrorMessage(error);
    if (message) {
      console.error(message);
    }
    process.exitCode = 1;
  });
}
