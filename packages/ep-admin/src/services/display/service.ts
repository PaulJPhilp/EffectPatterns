/**
 * Display service implementation
 */

import { Console, Effect } from "effect";
import { Logger } from "../logger/index.js";
import { TUIService } from "../tui/service.js";
import type { DisplayService, DisplayServiceError } from "./api.js";
import { DisplayError } from "./errors.js";
import {
	colorizeWithConfig,
} from "./helpers.js";
import type { PanelOptions, TableOptions } from "./types.js";

/**
 * Display service using Effect.Service pattern
 */
export const Display = Effect.Service<DisplayService>()("Display", {
	accessors: true,
	effect: Effect.gen(function* () {
		const logger = yield* Logger;
		const loggerConfig = yield* logger.getConfig();
		const tuiService = yield* TUIService;

		const showSuccess: DisplayService["showSuccess"] = (message: string) =>
			Effect.gen(function* () {
				const tui = yield* tuiService.load();

				if (tui?.displaySuccess) {
					yield* tui.displaySuccess(message);
					return;
				}

				// Fallback to console with color support
				const icon = colorizeWithConfig("✓", "GREEN", loggerConfig);
				yield* Console.log(`${icon} ${message}`);
			}).pipe(
				Effect.mapError((error) => DisplayError.make(`Failed to show success message: ${message}`, error))
			) as Effect.Effect<void, DisplayServiceError>;

		const showError: DisplayService["showError"] = (message: string) =>
			Effect.gen(function* () {
				const tui = yield* tuiService.load();

				if (tui?.displayError) {
					yield* tui.displayError(message);
					return;
				}

				// Fallback to console with color support
				const icon = colorizeWithConfig("✖", "RED", loggerConfig);
				yield* Console.error(`${icon} ${message}`);
			}).pipe(
				Effect.mapError((error) => DisplayError.make(`Failed to show error message: ${message}`, error))
			) as Effect.Effect<void, DisplayServiceError>;

		const showInfo: DisplayService["showInfo"] = (message: string) =>
			Effect.gen(function* () {
				const tui = yield* tuiService.load();

				if (tui?.displayInfo) {
					yield* tui.displayInfo(message);
					return;
				}

				// Fallback to console with color support
				const icon = colorizeWithConfig("ℹ", "BLUE", loggerConfig);
				yield* Console.log(`${icon} ${message}`);
			}).pipe(
				Effect.mapError((error) => DisplayError.make(`Failed to show info message: ${message}`, error))
			) as Effect.Effect<void, DisplayServiceError>;

		const showWarning: DisplayService["showWarning"] = (message: string) =>
			Effect.gen(function* () {
				const tui = yield* tuiService.load();

				if (tui?.displayWarning) {
					yield* tui.displayWarning(message);
					return;
				}

				// Fallback to console with color support
				const icon = colorizeWithConfig("⚠", "YELLOW", loggerConfig);
				yield* Console.log(`${icon} ${message}`);
			}).pipe(
				Effect.mapError((error) => DisplayError.make(`Failed to show warning message: ${message}`, error))
			) as Effect.Effect<void, DisplayServiceError>;

		const showPanel: DisplayService["showPanel"] = (
			content: string,
			title: string,
			options?: PanelOptions
		) =>
			Effect.gen(function* () {
				const tui = yield* tuiService.load();

				if (tui?.displayPanel) {
					yield* tui.displayPanel(content, title, {
						type: options?.type || "info",
					});
					return;
				}

				// Fallback to console
				const border = "─".repeat(60);
				yield* Console.log(`\n${border}`);
				yield* Console.log(title);
				yield* Console.log(border);
				yield* Console.log(content);
				yield* Console.log(`${border}\n`);
			}).pipe(
				Effect.mapError((error) => DisplayError.make(`Failed to show panel: ${title}`, error))
			) as Effect.Effect<void, DisplayServiceError>;

		const showTable: DisplayService["showTable"] = <
			T extends Record<string, unknown>,
		>(
			data: T[],
			options: TableOptions<T>
		) =>
			Effect.gen(function* () {
				const tui = yield* tuiService.load();

				if (tui?.displayTable) {
					yield* tui.displayTable(data, {
						columns: options.columns.map((col: any) => ({
							key: String(col.key),
							header: col.header,
							width: col.width,
							align: col.align,
						})),
						bordered: options.bordered,
					} as any);
					return;
				}

				// Fallback to console table
				const headers = options.columns
					.map((col) => col.header)
					.join(" | ");
				const rows = data.map((row) =>
					options.columns
						.map((col) => String(row[col.key] ?? ""))
						.join(" | ")
				);

				yield* Console.log(headers);
				yield* Console.log("─".repeat(headers.length));
				rows.forEach((row) => Console.log(row));
			}).pipe(
				Effect.mapError((error) => DisplayError.make(`Failed to show table`, error))
			) as Effect.Effect<void, DisplayServiceError>;

		const showHighlight: DisplayService["showHighlight"] = (message: string) =>
			Effect.gen(function* () {
				const tui = yield* tuiService.load();

				if (tui?.displayHighlight) {
					yield* tui.displayHighlight(message);
					return;
				}

				// Fallback to console
				yield* Console.log(`🔹 ${message}`);
			}).pipe(
				Effect.mapError((error) => DisplayError.make(`Failed to show highlight: ${message}`, error))
			) as Effect.Effect<void, DisplayServiceError>;

		const showSeparator: DisplayService["showSeparator"] = () =>
			Effect.gen(function* () {
				// Always use console fallback for separators since TUI doesn't have this method
				yield* Console.log("─".repeat(80));
			}).pipe(
				Effect.mapError((error) => DisplayError.make(`Failed to show separator`, error))
			) as Effect.Effect<void, DisplayServiceError>;

		return {
			showSuccess,
			showError,
			showInfo,
			showWarning,
			showPanel,
			showTable,
			showHighlight,
			showSeparator,
		};
	}),
});
