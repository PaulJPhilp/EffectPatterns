/**
 * Adaptive display service layer for effect-cli-tui
 *
 * Automatically detects if TUI services are available and uses them,
 * falling back to console output when TUI is not available.
 * This allows both ep (user CLI) and ep-admin (with TUI) to use the same API.
 *
 * Integrates with the Logger service for consistent output formatting.
 */

import { Console, Effect, Option as Opt } from "effect";
import {
  Logger,
  type LoggerConfig,
  defaultLoggerConfig,
} from "./logger.js";

// Import TUI services - these will only be used if available
let DisplayService: any = null;
let displaySuccessTUI: any = null;
let displayErrorTUI: any = null;
let displayInfoTUI: any = null;
let displayWarningTUI: any = null;
let displayPanelTUI: any = null;
let displayTableTUI: any = null;
let displayHighlightTUI: any = null;

// Lazy load TUI imports to avoid issues when TUI not available
try {
  const tuiModule = require("effect-cli-tui");
  DisplayService = tuiModule.DisplayService;
  displaySuccessTUI = tuiModule.displaySuccess;
  displayErrorTUI = tuiModule.displayError;
  displayInfoTUI = tuiModule.displayInfo;
  displayWarningTUI = tuiModule.displayWarning;
  displayPanelTUI = tuiModule.displayPanel;
  displayTableTUI = tuiModule.displayTable;
  displayHighlightTUI = tuiModule.displayHighlight;
} catch {
  // TUI not available, will use console fallback
}

// =============================================================================
// ANSI Color Helpers (respects Logger config)
// =============================================================================

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
} as const;

/**
 * Get current logger config, with fallback to defaults
 */
const getLoggerConfig = (): Effect.Effect<LoggerConfig> =>
  Effect.gen(function* () {
    const maybeLogger = yield* Effect.serviceOption(Logger);
    if (Opt.isSome(maybeLogger)) {
      return yield* maybeLogger.value.getConfig();
    }
    return defaultLoggerConfig;
  });

/**
 * Apply color if enabled in config
 */
const colorize = (
  text: string,
  color: keyof typeof COLORS,
  config: LoggerConfig
): string => {
  if (!config.useColors) return text;
  return `${COLORS[color]}${text}${COLORS.reset}`;
};

/**
 * Display a success message
 * Uses TUI if available, console fallback otherwise
 * Respects Logger config for colors
 */
export const showSuccess = (message: string) =>
  Effect.gen(function* () {
    if (DisplayService) {
      const maybeDisplay = yield* Effect.serviceOption(DisplayService);
      if (maybeDisplay._tag === "Some" && displaySuccessTUI) {
        yield* displaySuccessTUI(message);
        return;
      }
    }
    // Fallback to console with color support
    const config = yield* getLoggerConfig();
    const icon = colorize("✓", "green", config);
    yield* Console.log(`${icon} ${message}`);
  });

/**
 * Display an error message
 * Uses TUI if available, console fallback otherwise
 * Respects Logger config for colors
 */
export const showError = (message: string) =>
  Effect.gen(function* () {
    if (DisplayService) {
      const maybeDisplay = yield* Effect.serviceOption(DisplayService);
      if (maybeDisplay._tag === "Some" && displayErrorTUI) {
        yield* displayErrorTUI(message);
        return;
      }
    }
    // Fallback to console with color support
    const config = yield* getLoggerConfig();
    const icon = colorize("✖", "red", config);
    yield* Console.error(`${icon} ${message}`);
  });

/**
 * Display an info message
 * Uses TUI if available, console fallback otherwise
 * Respects Logger config for colors
 */
export const showInfo = (message: string) =>
  Effect.gen(function* () {
    if (DisplayService) {
      const maybeDisplay = yield* Effect.serviceOption(DisplayService);
      if (maybeDisplay._tag === "Some" && displayInfoTUI) {
        yield* displayInfoTUI(message);
        return;
      }
    }
    // Fallback to console with color support
    const config = yield* getLoggerConfig();
    const icon = colorize("ℹ", "blue", config);
    yield* Console.log(`${icon} ${message}`);
  });

/**
 * Display a warning message
 * Uses TUI if available, console fallback otherwise
 * Respects Logger config for colors
 */
export const showWarning = (message: string) =>
  Effect.gen(function* () {
    if (DisplayService) {
      const maybeDisplay = yield* Effect.serviceOption(DisplayService);
      if (maybeDisplay._tag === "Some" && displayWarningTUI) {
        yield* displayWarningTUI(message);
        return;
      }
    }
    // Fallback to console with color support
    const config = yield* getLoggerConfig();
    const icon = colorize("⚠", "yellow", config);
    yield* Console.log(`${icon} ${message}`);
  });

export interface PanelOptions {
  type?: "info" | "success" | "error" | "warning";
}

/**
 * Display content in a styled panel/box
 * Uses TUI if available, console fallback otherwise
 */
export const showPanel = (
  content: string,
  title: string,
  options?: PanelOptions
) =>
  Effect.gen(function* () {
    if (DisplayService) {
      const maybeDisplay = yield* Effect.serviceOption(DisplayService);
      if (maybeDisplay._tag === "Some" && displayPanelTUI) {
        yield* displayPanelTUI(content, title, {
          type: options?.type || "info",
        });
        return;
      }
    }
    // Fallback to console
    const border = "─".repeat(60);
    yield* Console.log(`\n${border}`);
    yield* Console.log(title);
    yield* Console.log(border);
    yield* Console.log(content);
    yield* Console.log(`${border}\n`);
  });

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  width?: number;
  align?: "left" | "center" | "right";
  formatter?: (value: any) => string;
}

export interface TableOptions<T> {
  columns: TableColumn<T>[];
  bordered?: boolean;
  head?: { bold?: boolean; color?: string };
}

/**
 * Display data in a formatted table
 * Uses TUI if available, console fallback otherwise
 */
export const showTable = <T extends Record<string, any>>(
  data: T[],
  options: TableOptions<T>
) =>
  Effect.gen(function* () {
    if (DisplayService) {
      const maybeDisplay = yield* Effect.serviceOption(DisplayService);
      if (maybeDisplay._tag === "Some" && displayTableTUI) {
        yield* displayTableTUI(data, {
          columns: options.columns.map((col) => ({
            key: String(col.key),
            header: col.header,
            width: col.width,
            align: col.align,
            formatter: col.formatter,
          })),
          bordered: options.bordered,
          head: options.head,
        });
      } else {
        // Fallback to console
        console.table(data);
      }
    } else {
      // Fallback to console
      console.table(data);
    }
  });

/**
 * Display highlighted/emphasized text
 * Uses TUI if available, console fallback otherwise
 */
export const showHighlight = (message: string) =>
  Effect.gen(function* () {
    if (DisplayService) {
      const maybeDisplay = yield* Effect.serviceOption(DisplayService);
      if (maybeDisplay._tag === "Some" && displayHighlightTUI) {
        yield* displayHighlightTUI(message);
      } else {
        // Fallback to console
        yield* Console.log(`\n📌 ${message}\n`);
      }
    } else {
      // Fallback to console
      yield* Console.log(`\n📌 ${message}\n`);
    }
  });

/**
 * Display a separator line
 */
export const showSeparator = () =>
  Effect.gen(function* () {
    yield* Console.log("─".repeat(60));
  });
