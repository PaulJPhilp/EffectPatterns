/**
 * CLI Constants
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
export const PROJECT_ROOT = path.join(__dirname, "../../../");

/**
 * Basic linting rules for Effect patterns
 */
export const LINT_RULES = [
  {
    name: "effect-use-tap-error",
    description: "Prefer tapError over catchAll for side-effecting error handlers",
    defaultSeverity: "warning",
    canFix: false,
  },
  {
    name: "effect-explicit-concurrency",
    description: "Ensure Effect.all has explicit concurrency specified",
    defaultSeverity: "error",
    canFix: true,
  },
  {
    name: "effect-deprecated-api",
    description: "Usage of deprecated Effect APIs",
    defaultSeverity: "error",
    canFix: true,
  },
  {
    name: "effect-prefer-pipe",
    description: "Use .pipe() instead of deep nesting for complex transformations",
    defaultSeverity: "info",
    canFix: false,
  },
  {
    name: "effect-stream-memory",
    description: "Check for potential memory leaks in long-running streams",
    defaultSeverity: "warning",
    canFix: false,
  },
  {
    name: "effect-error-model",
    description: "Ensure Data.TaggedError is used for custom errors",
    defaultSeverity: "info",
    canFix: false,
  },
];
