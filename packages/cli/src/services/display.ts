/**
 * Adaptive display service layer for effect-cli-tui
 *
 * Automatically detects if TUI services are available and uses them,
 * falling back to console output when TUI is not available.
 * This allows both ep (user CLI) and ep-admin (with TUI) to use the same API.
 */

import { Effect } from "effect";
import { Console } from "effect";

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

/**
 * Display a success message
 * Uses TUI if available, console fallback otherwise
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
    // Fallback to console
    yield* Console.log(`✓ ${message}`);
  });

/**
 * Display an error message
 * Uses TUI if available, console fallback otherwise
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
    // Fallback to console
    yield* Console.error(`✖ ${message}`);
  });

/**
 * Display an info message
 * Uses TUI if available, console fallback otherwise
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
    // Fallback to console
    yield* Console.log(`ℹ ${message}`);
  });

/**
 * Display a warning message
 * Uses TUI if available, console fallback otherwise
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
    // Fallback to console
    yield* Console.log(`⚠ ${message}`);
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
