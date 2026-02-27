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
import { PatternNotFoundError } from "./errors.js";

// Commands
import { installCommand } from "./commands/install-commands.js";
import { loginCommand } from "./commands/login-command.js";
import { listCommand, searchCommand, showCommand } from "./commands/pattern-repo-commands.js";
import { skillsCommand } from "./commands/skills-commands.js";

// Services
import { NodeContext } from "@effect/platform-node";
import { Display } from "./services/display/index.js";
import { TUILoader } from "./services/display/tui-loader.js";
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
/** @internal Exported for testing */
export const mapCliLogLevel = (value: string): "debug" | "info" | "warn" | "error" | "silent" | undefined => {
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

/** @internal Exported for testing */
export const resolveLoggerConfig = (argv: ReadonlyArray<string> = process.argv) => {
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
    loginCommand,
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
    TUILoader.Default
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

const ROOT_COMMANDS = ["search", "list", "show", "install", "skills", "login"] as const;
const NESTED_COMMANDS: Record<string, readonly string[]> = {
  install: ["add", "list"],
  skills: ["list", "preview", "validate", "stats"],
};

const normalizeArgsForSuggestion = (argv: ReadonlyArray<string>): string[] =>
  argv.slice(2).filter((token) => token.length > 0 && !token.startsWith("-"));

/** @internal Exported for testing */
export const levenshtein = (a: string, b: string): number => {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0)
  );

  for (let i = 0; i <= a.length; i++) dp[i]![0] = i;
  for (let j = 0; j <= b.length; j++) dp[0]![j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }

  return dp[a.length]![b.length]!;
};

/** @internal Exported for testing */
export const findClosest = (input: string, candidates: readonly string[]): string | null => {
  if (candidates.length === 0) return null;

  let best: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = levenshtein(input.toLowerCase(), candidate.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  if (!best) return null;
  return bestDistance <= Math.max(2, Math.floor(input.length / 2)) ? best : null;
};

/** @internal Exported for testing */
export const getCommandSuggestion = (argv: ReadonlyArray<string>): string | null => {
  const args = normalizeArgsForSuggestion(argv);
  const first = args[0];
  if (!first) return null;

  if (!ROOT_COMMANDS.includes(first as (typeof ROOT_COMMANDS)[number])) {
    const suggested = findClosest(first, ROOT_COMMANDS);
    return suggested ? `Did you mean: ep ${suggested}` : null;
  }

  const nested = NESTED_COMMANDS[first];
  const second = args[1];
  if (!nested || !second) return null;

  if (!nested.includes(second)) {
    const suggested = findClosest(second, nested);
    return suggested ? `Did you mean: ep ${first} ${suggested}` : null;
  }

  return null;
};

/** @internal Exported for testing */
export const extractErrorMessage = (error: unknown, argv: ReadonlyArray<string>): string | null => {
  if (typeof error === "string") return error;
  const tagged = error as { _tag?: string; patternId?: string } | null;
  if (tagged && typeof tagged === "object" && tagged._tag === "PatternNotFoundError" && typeof tagged.patternId === "string") {
    return [
      `Pattern "${tagged.patternId}" not found.`,
      `Try: ep search "${tagged.patternId}"`,
      `Docs: ${EP_CLI_DOCS_URL}`,
    ].join("\n");
  }
  if (error instanceof Error) {
    const combined = [error.message, error.stack].filter(Boolean).join("\n");

    if (combined.includes("CommandMismatch")) {
      const suggestion = getCommandSuggestion(argv);
      return [
        suggestion ? `${suggestion}` : "Need command help? Run 'ep --help'.",
        `Docs: ${EP_CLI_DOCS_URL}`,
      ].join("\n");
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
        "Run `ep login` to authenticate, or set PATTERN_API_KEY, use --api-key-stdin, or configure EP_API_KEY_FILE.",
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

    if (error instanceof PatternNotFoundError) {
      return [
        `Pattern "${error.patternId}" not found.`,
        `Try: ep search "${error.patternId}"`,
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
    const message = extractErrorMessage(error, process.argv);
    if (message) {
      console.error(message);
    }
    process.exitCode = 1;
  });
}
