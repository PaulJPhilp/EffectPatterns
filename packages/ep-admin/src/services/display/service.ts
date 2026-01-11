/**
 * Display service implementation
 */

import { Console, Effect, Option as Opt } from "effect";
import { Logger } from "../logger/index.js";
import type { DisplayService } from "./api.js";
import { DisplayError } from "./errors.js";
import {
	colorizeWithConfig,
} from "./helpers.js";
import type { PanelOptions, TableOptions } from "./types.js";

import { TUILoader } from "./tui-loader.js";

/**
 * Display service using Effect.Service pattern
 */
export class Display extends Effect.Service<Display>()("Display", {
	accessors: true,
	effect: Effect.gen(function* () {
		const logger = yield* Logger;
		const loggerConfig = yield* logger.getConfig();
		const tuiLoader = yield* TUILoader;

		const showSuccess: DisplayService["showSuccess"] = (message: string) =>
			Effect.gen(function* () {
				const tui = yield* tuiLoader.load();

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
				const icon = colorizeWithConfig("✓", "GREEN", loggerConfig);
				yield* Console.log(`${icon} ${message}`);
			}).pipe(
				Effect.catchAll((error) => Effect.fail(
					DisplayError.make(`Failed to show success message: ${message}`, error)
				))
			);

		const showError: DisplayService["showError"] = (message: string) =>
			Effect.gen(function* () {
				const tui = yield* tuiLoader.load();

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
				const icon = colorizeWithConfig("✖", "RED", loggerConfig);
				yield* Console.error(`${icon} ${message}`);
			}).pipe(
				Effect.catchAll((error) => Effect.fail(
					DisplayError.make(`Failed to show error message: ${message}`, error)
				))
			);

		const showInfo: DisplayService["showInfo"] = (message: string) =>
			Effect.gen(function* () {
				const tui = yield* tuiLoader.load();

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
				const icon = colorizeWithConfig("ℹ", "BLUE", loggerConfig);
				yield* Console.log(`${icon} ${message}`);
			}).pipe(
				Effect.catchAll((error) => Effect.fail(
					DisplayError.make(`Failed to show info message: ${message}`, error)
				))
			);

		const showWarning: DisplayService["showWarning"] = (message: string) =>
			Effect.gen(function* () {
				const tui = yield* tuiLoader.load();

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
				const icon = colorizeWithConfig("⚠", "YELLOW", loggerConfig);
				yield* Console.log(`${icon} ${message}`);
			}).pipe(
				Effect.catchAll((error) => Effect.fail(
					DisplayError.make(`Failed to show warning message: ${message}`, error)
				))
			);

		const showPanel: DisplayService["showPanel"] = (
			content: string,
			title: string,
			options?: PanelOptions
		) =>
			Effect.gen(function* () {
				const tui = yield* tuiLoader.load();

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
			}).pipe(
				Effect.catchAll((error) => Effect.fail(
					DisplayError.make(`Failed to show panel: ${title}`, error)
				))
			);

		const showTable: DisplayService["showTable"] = <
			T extends Record<string, unknown>,
		>(
			data: T[],
			options: TableOptions<T>
		) =>
			Effect.gen(function* () {
				const tui = yield* tuiLoader.load();

				if (tui?.DisplayService && tui?.displayTable) {
					const maybeDisplay = yield* Effect.serviceOption(
						tui.DisplayService
					);
					if (Opt.isSome(maybeDisplay)) {
						yield* tui.displayTable(data, {
							columns: options.columns.map((col: any) => ({
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
				Effect.catchAll((error) => Effect.fail(
					DisplayError.make(`Failed to show table`, error)
				))
			);

		const showHighlight: DisplayService["showHighlight"] = (message: string) =>
			Effect.gen(function* () {
				const tui = yield* tuiLoader.load();

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
				yield* Console.log(`� ${message}`);
			}).pipe(
				Effect.catchAll((error) => Effect.fail(
					DisplayError.make(`Failed to show highlight: ${message}`, error)
				))
			);

		const showSeparator: DisplayService["showSeparator"] = () =>
			Effect.gen(function* () {
				const tui = yield* tuiLoader.load();

				if (tui?.DisplayService && tui?.displaySeparator) {
					const maybeDisplay = yield* Effect.serviceOption(
						tui.DisplayService
					);
					if (Opt.isSome(maybeDisplay)) {
						yield* tui.displaySeparator();
						return;
					}
				}

				// Fallback to console
				yield* Console.log("─".repeat(80));
			}).pipe(
				Effect.catchAll((error) => Effect.fail(
					DisplayError.make(`Failed to show separator`, error)
				))
			);

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
}) { }
