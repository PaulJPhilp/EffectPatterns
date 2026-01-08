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
import { colors } from "../utils.js";
import {
  Logger,
  type LoggerConfig
} from "./logger.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TUIModule = any;

// TUI module state - loaded lazily on first use using SynchronizedRef
// Stores: null (not attempted), false (attempted but failed), or the module
let tuiModuleCache: TUIModule | false | null = null;

// Lazy load TUI module - returns Effect that resolves to the module or null
const ensureTUILoaded: Effect.Effect<TUIModule> = Effect.suspend(() => {
  // Already attempted
  if (tuiModuleCache !== null) {
    return Effect.succeed(tuiModuleCache === false ? null : tuiModuleCache);
  }

  // First attempt - try to load TUI
  return Effect.tryPromise({
    try: async () => {
      const mod = await import("effect-cli-tui");
      tuiModuleCache = mod;
      return mod;
    },
    catch: () => {
      tuiModuleCache = false;
      return null;
    }
  }).pipe(
    Effect.catchAll(() => {
      tuiModuleCache = false;
      return Effect.succeed(null);
    })
  );
});

// =============================================================================
// Logger Config Helper
// =============================================================================

/**
 * Get logger config from Logger service
 */
const getLoggerConfig = () =>
  Effect.gen(function* () {
    const logger = yield* Logger;
    const config = yield* logger.getConfig();
    return config;
  });

/**
 * Apply color if enabled in config (respects Logger config)
 */
const colorizeWithConfig = (
  text: string,
  color: keyof typeof colors,
  config: LoggerConfig
): string => {
  if (!config.useColors) return text;
  return `${colors[color]}${text}${colors.reset}`;
};

/**
 * Display a success message
 * Uses TUI if available, console fallback otherwise
 * Respects Logger config for colors
 */
export const showSuccess = (message: string) =>
  Effect.gen(function* () {
    const tui = yield* ensureTUILoaded;

    if (tui?.DisplayService && tui?.displaySuccess) {
      const maybeDisplay = yield* Effect.serviceOption(
        tui.DisplayService
      );
      if (Opt.isSome(maybeDisplay)) {
        yield* tui.displaySuccess(message);
        return;
      }
    }

    // Fallback to console with color support
    const config = yield* getLoggerConfig();
    const icon = colorizeWithConfig("✓", "green", config);
    yield* Console.log(`${icon} ${message}`);
  });

/**
 * Display an error message
 * Uses TUI if available, console fallback otherwise
 * Respects Logger config for colors
 */
export const showError = (message: string) =>
  Effect.gen(function* () {
    const tui = yield* ensureTUILoaded;

    if (tui?.DisplayService && tui?.displayError) {
      const maybeDisplay = yield* Effect.serviceOption(
        tui.DisplayService
      );
      if (Opt.isSome(maybeDisplay)) {
        yield* tui.displayError(message);
        return;
      }
    }

    // Fallback to console with color support
    const config = yield* getLoggerConfig();
    const icon = colorizeWithConfig("✖", "red", config);
    yield* Console.error(`${icon} ${message}`);
  });

/**
 * Display an info message
 * Uses TUI if available, console fallback otherwise
 * Respects Logger config for colors
 */
export const showInfo = (message: string) =>
  Effect.gen(function* () {
    const tui = yield* ensureTUILoaded;

    if (tui?.DisplayService && tui?.displayInfo) {
      const maybeDisplay = yield* Effect.serviceOption(
        tui.DisplayService
      );
      if (Opt.isSome(maybeDisplay)) {
        yield* tui.displayInfo(message);
        return;
      }
    }

    // Fallback to console with color support
    const config = yield* getLoggerConfig();
    const icon = colorizeWithConfig("ℹ", "blue", config);
    yield* Console.log(`${icon} ${message}`);
  });

/**
 * Display a warning message
 * Uses TUI if available, console fallback otherwise
 * Respects Logger config for colors
 */
export const showWarning = (message: string) =>
  Effect.gen(function* () {
    const tui = yield* ensureTUILoaded;

    if (tui?.DisplayService && tui?.displayWarning) {
      const maybeDisplay = yield* Effect.serviceOption(
        tui.DisplayService
      );
      if (Opt.isSome(maybeDisplay)) {
        yield* tui.displayWarning(message);
        return;
      }
    }

    // Fallback to console with color support
    const config = yield* getLoggerConfig();
    const icon = colorizeWithConfig("⚠", "yellow", config);
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
    const tui = yield* ensureTUILoaded;

    if (tui?.DisplayService && tui?.displayPanel) {
      const maybeDisplay = yield* Effect.serviceOption(
        tui.DisplayService
      );
      if (Opt.isSome(maybeDisplay)) {
        yield* tui.displayPanel(content, title, {
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
    const tui = yield* ensureTUILoaded;

    if (tui?.DisplayService && tui?.displayTable) {
      const maybeDisplay = yield* Effect.serviceOption(
        tui.DisplayService
      );
      if (Opt.isSome(maybeDisplay)) {
        yield* tui.displayTable(data, {
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
        return;
      }
    }

    // Fallback to console
    console.table(data);
  });

/**
 * Display highlighted/emphasized text
 * Uses TUI if available, console fallback otherwise
 */
export const showHighlight = (message: string) =>
  Effect.gen(function* () {
    const tui = yield* ensureTUILoaded;

    if (tui?.DisplayService && tui?.displayHighlight) {
      const maybeDisplay = yield* Effect.serviceOption(
        tui.DisplayService
      );
      if (Opt.isSome(maybeDisplay)) {
        yield* tui.displayHighlight(message);
        return;
      }
    }

    // Fallback to console
    yield* Console.log(`\n📌 ${message}\n`);
  });

/**
 * Display a separator line
 */
export const showSeparator = () =>
  Effect.gen(function* () {
    yield* Console.log("─".repeat(60));
  });
