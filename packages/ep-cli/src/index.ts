#!/usr/bin/env bun

/**
 * ep.ts
 *
 * A unified project management CLI for EffectPatterns.
 */

import { Command } from "@effect/cli";
import { Effect, Layer } from "effect";
import { readFileSync } from "node:fs";
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
const mapCliLogLevel = (value: string): "debug" | "info" | "warn" | "error" | "silent" | undefined => {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "all":
    case "trace":
    case "debug":
      return "debug";
    case "info":
      return "info";
    case "warning":
      return "warn";
    case "error":
    case "fatal":
      return "error";
    case "none":
      return "silent";
    default:
      return undefined;
  }
};

const getCliLogLevel = (argv: ReadonlyArray<string>): "debug" | "info" | "warn" | "error" | "silent" | undefined => {
  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    if (!current) continue;

    if (current.startsWith("--log-level=")) {
      return mapCliLogLevel(current.slice("--log-level=".length));
    }

    if (current === "--log-level") {
      const next = argv[i + 1];
      if (next) {
        return mapCliLogLevel(next);
      }
    }
  }

  return undefined;
};

const shouldUseColors = () => {
  if (process.env.NO_COLOR) return false;
  if (process.env.CI) return false;
  if (process.env.TERM === "dumb") return false;
  return Boolean(process.stdout.isTTY);
};

const resolveLoggerConfig = (argv: ReadonlyArray<string> = process.argv) => {
  const logLevelEnv = process.env.LOG_LEVEL;
  const debugEnv = process.env.DEBUG;
  const verboseEnv = process.env.VERBOSE;
  const logLevelCli = getCliLogLevel(argv);

  // Priority: CLI --log-level > explicit LOG_LEVEL > DEBUG > VERBOSE > default
  const logLevel =
    logLevelCli ||
    (logLevelEnv && parseLogLevel(logLevelEnv)) ||
    (debugEnv && "debug") ||
    (verboseEnv && "debug") ||
    "info";

  return {
    logLevel,
    verbose: logLevel === "debug",
    useColors: shouldUseColors(),
  };
};

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
const createRuntimeLayer = (argv: ReadonlyArray<string> = process.argv) => {
  const loggerConfig = resolveLoggerConfig(argv);
  const baseLayer = Layer.mergeAll(
    NodeContext.layer,
    LoggerLive(loggerConfig),
    LiveTUILoader
  );

  const serviceLayer = Layer.mergeAll(
    PatternApi.Default,
    Skills.Default,
    Display.Default,
    Layer.provide(Install.Default, PatternApi.Default)
  ).pipe(
    Layer.provide(baseLayer)
  );

  return Layer.merge(baseLayer, serviceLayer);
};

export const runtimeLayer = createRuntimeLayer(process.argv);

/**
 * Runtime layer with TUI support
 */
export const runtimeLayerWithTUI = Effect.gen(function* () {
  const tuiLoader = yield* TUILoader;
  const tui = yield* tuiLoader.load();
  const layer = createRuntimeLayer(process.argv);

  if (tui?.runtimeLayer) {
    return layer.pipe(Layer.provide(tui.runtimeLayer as Layer.Layer<never>));
  }

  return layer;
});

const cliRunner = Command.run(rootCommand, {
  name: CLI.RUNNER_NAME,
  version: CLI.VERSION,
});

type PreparedArgv = {
  readonly argv: ReadonlyArray<string>;
  readonly readApiKeyFromStdin: boolean;
};

const prepareArgv = (argv: ReadonlyArray<string> = process.argv): PreparedArgv => {
  let readApiKeyFromStdin = false;
  const filtered: string[] = [];

  for (const arg of argv) {
    if (arg === "--api-key-stdin") {
      readApiKeyFromStdin = true;
      continue;
    }
    filtered.push(arg);
  }

  return {
    argv: filtered,
    readApiKeyFromStdin,
  };
};

const loadApiKeyFromStdin = (): void => {
  const raw = readFileSync(0, "utf8");
  const apiKey = raw.trim();

  if (!apiKey) {
    throw new Error(
      "No API key was provided on stdin. Pipe a PATTERN_API_KEY value when using --api-key-stdin."
    );
  }

  process.env.PATTERN_API_KEY = apiKey;
};

export const createProgram = (argv: ReadonlyArray<string> = process.argv) => {
  const prepared = prepareArgv(argv);
  return cliRunner(prepared.argv);
};

export const runCli = (argv: ReadonlyArray<string> = process.argv): Effect.Effect<void, unknown, never> =>
  Effect.gen(function* () {
    const prepared = prepareArgv(argv);

    if (prepared.readApiKeyFromStdin) {
      yield* Effect.try({
        try: () => {
          loadApiKeyFromStdin();
        },
        catch: (error) =>
          error instanceof Error
            ? error
            : new Error("Failed to read API key from stdin"),
      });
    }

    return yield* Effect.scoped(
      cliRunner(prepared.argv).pipe(
        Effect.provide(createRuntimeLayer(prepared.argv))
      )
    );
  }) as Effect.Effect<void, unknown, never>;

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
        "Set PATTERN_API_KEY, or use --api-key-stdin, or configure EP_API_KEY_FILE / ~/.config/ep-cli/config.json.",
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
