/**
 * UI Output Helpers
 * Pure utility functions for displaying output with Effect chaining
 */

import { Effect } from "effect";

/**
 * Display output with proper Effect chaining
 * Mimics TUIHandler.display() from effect-cli-tui
 */
export function displayOutput(
  message: string,
  type: "info" | "success" | "error" = "info"
): Effect.Effect<void> {
  return Effect.sync(() => {
    const prefix = type === "success" ? "✓" : type === "error" ? "✗" : "ℹ";
    console.log(`\n${prefix} ${message}`);
  });
}

/**
 * Display multiple lines of output sequentially
 */
export function displayLines(
  lines: string[],
  type: "info" | "success" | "error" = "info"
): Effect.Effect<void> {
  return Effect.gen(function* () {
    for (const line of lines) {
      yield* displayOutput(line, type);
    }
  });
}

/**
 * Display JSON output
 */
export function displayJson(data: unknown): Effect.Effect<void> {
  return displayOutput(JSON.stringify(data, null, 2), "info");
}

/**
 * Display error message
 */
export function displayError(message: string): Effect.Effect<void> {
  return displayOutput(message, "error");
}

/**
 * Display success message
 */
export function displaySuccess(message: string): Effect.Effect<void> {
  return displayOutput(message, "success");
}

