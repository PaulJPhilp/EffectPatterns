import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// File Paths
// =============================================================================

export const PROJECT_ROOT = path.join(__dirname, "../../../");

export const PATHS = {
  PROJECT_ROOT,
  SKILLS_DIR: ".claude-plugin/plugins/effect-patterns/skills",
} as const;

// =============================================================================
// CLI Metadata
// =============================================================================

export const CLI = {
  NAME: "ep",
  VERSION: "0.2.0",
  DESCRIPTION: "A CLI for Effect Patterns Hub",
  RUNNER_NAME: "EffectPatterns CLI",
} as const;

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
] as const;

// =============================================================================
// Display Constants
// =============================================================================

export const DISPLAY = {
  SEPARATOR_CHAR: "━",
  SEPARATOR_LENGTH: 60,
} as const;

// =============================================================================
// ANSI Color Codes
// =============================================================================

export const ANSI_COLORS = {
  RESET: "\x1b[0m",
  BRIGHT: "\x1b[1m",
  DIM: "\x1b[2m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  MAGENTA: "\x1b[35m",
  CYAN: "\x1b[36m",
  WHITE: "\x1b[37m",
  GRAY: "\x1b[90m",
} as const;

export const LOG_LEVEL_COLORS = {
  debug: ANSI_COLORS.GRAY,
  info: ANSI_COLORS.BLUE,
  warn: ANSI_COLORS.YELLOW,
  error: ANSI_COLORS.RED,
  success: ANSI_COLORS.GREEN,
  silent: "",
} as const;
