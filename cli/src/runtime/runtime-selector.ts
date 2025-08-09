/**
 * @fileoverview Runtime selector for CLI commands
 *
 * This module provides intelligent runtime selection based on command requirements.
 * Commands that don't need AI services use the minimal runtime to avoid startup
 * failures due to missing API keys or AI service issues.
 */

import type { Effect, Exit } from "effect";
import { MinimalRuntime } from "./minimal-runtime.js";
import { ProductionRuntime } from "./production-runtime.js";

/**
 * Commands that only need minimal runtime (no AI services)
 */
const MINIMAL_RUNTIME_COMMANDS = new Set([
  "echo",
  "health",
  "trace",
  "list",
  "config",
  "dry-run",
  "run",
  "test",
]);

/**
 * Commands that require full production runtime (with AI services)
 */
const PRODUCTION_RUNTIME_COMMANDS = new Set([
  "generate",
  "gen",
  "process-prompt", // legacy alias
  "apply-prompt-to-dir",
  "system-prompt",
  "auth",
]);

/**
 * Determines which runtime to use based on the command being executed
 */
export function selectRuntime(args: string[]) {
  // Find the command name in the arguments
  // Skip the first two args (node and script path) and any global flags
  const commandIndex = args.findIndex(
    (arg, index) =>
      index >= 2 &&
      !arg.startsWith("-") &&
      (MINIMAL_RUNTIME_COMMANDS.has(arg) ||
        PRODUCTION_RUNTIME_COMMANDS.has(arg))
  );

  if (commandIndex === -1) {
    // No recognized command found, default to production runtime
    return ProductionRuntime;
  }

  const command = args[commandIndex];

  if (MINIMAL_RUNTIME_COMMANDS.has(command)) {
    return MinimalRuntime;
  }

  return ProductionRuntime;
}

/**
 * Run an effect with the appropriate runtime based on command
 */
export function runWithAppropriateRuntime<A, E>(
  effect: Effect.Effect<A, E>,
  args: string[] = process.argv
): Promise<A> {
  const runtime = selectRuntime(args);
  return runtime.runPromise(effect);
}

/**
 * Run an effect and get exit with the appropriate runtime based on command
 */
export function runExitWithAppropriateRuntime<A, E>(
  effect: Effect.Effect<A, E>,
  args: string[] = process.argv
): Promise<Exit.Exit<A, unknown>> {
  const runtime = selectRuntime(args);
  return runtime.runPromiseExit(effect);
}
