/**
 * Display service implementation
 */

import { Console, Effect, Option as Opt } from "effect";
import { Logger } from "../logger/index.js";
import type { DisplayService } from "./api.js";
import {
    colorizeWithConfig,
} from "./helpers.js";
import type { PanelOptions, TableOptions } from "./types.js";

import { TUILoader } from "./tui-loader.js";

/**
 * Helper to call TUI method if available, otherwise use fallback
 */
const withTUIFallback = (
	tuiMethod: string,
	tuiArgs: unknown[],
	fallback: Effect.Effect<void, unknown>
): ((tui: unknown) => Effect.Effect<void, unknown>) => {
	return (tui: unknown) =>
		Effect.gen(function* () {
			const tuiObj = tui as Record<string, unknown>;
			const service = tuiObj.DisplayService as unknown;
			const method = tuiObj[tuiMethod] as unknown;

			if (service && typeof method === "function") {
				// biome-ignore lint/suspicious/noExplicitAny: Dynamic TUI module service tag is untyped
			const maybeDisplay = yield* Effect.serviceOption(service as any);
				if (Opt.isSome(maybeDisplay)) {
					yield* (method as (...args: unknown[]) => Effect.Effect<void, unknown>)(
						...tuiArgs
					);
					return;
				}
			}

			yield* fallback;
		});
};

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
				const icon = colorizeWithConfig("✓", "GREEN", loggerConfig);
				const fallback = Console.log(`${icon} ${message}`);
				yield* (tui ? withTUIFallback("displaySuccess", [message], fallback)(tui) : fallback);
			}) as Effect.Effect<void, unknown>;

		const showError: DisplayService["showError"] = (message: string) =>
			Effect.gen(function* () {
				const tui = yield* tuiLoader.load();
				const icon = colorizeWithConfig("✖", "RED", loggerConfig);
				const fallback = Console.error(`${icon} ${message}`);
				yield* (tui ? withTUIFallback("displayError", [message], fallback)(tui) : fallback);
			}) as Effect.Effect<void, unknown>;

		const showInfo: DisplayService["showInfo"] = (message: string) =>
			Effect.gen(function* () {
				const tui = yield* tuiLoader.load();
				const icon = colorizeWithConfig("ℹ", "BLUE", loggerConfig);
				const fallback = Console.log(`${icon} ${message}`);
				yield* (tui ? withTUIFallback("displayInfo", [message], fallback)(tui) : fallback);
			}) as Effect.Effect<void, unknown>;

		const showWarning: DisplayService["showWarning"] = (message: string) =>
			Effect.gen(function* () {
				const tui = yield* tuiLoader.load();
				const icon = colorizeWithConfig("⚠", "YELLOW", loggerConfig);
				const fallback = Console.log(`${icon} ${message}`);
				yield* (tui ? withTUIFallback("displayWarning", [message], fallback)(tui) : fallback);
			}) as Effect.Effect<void, unknown>;

		const showPanel: DisplayService["showPanel"] = (
			content: string,
			title: string,
			options?: PanelOptions
		) =>
			Effect.gen(function* () {
				const tui = yield* tuiLoader.load();
				const border = "─".repeat(60);
				const fallback = Effect.gen(function* () {
					yield* Console.log(`\n${border}`);
					yield* Console.log(title);
					yield* Console.log(border);
					yield* Console.log(content);
					yield* Console.log(`${border}\n`);
				});
				yield* (tui
					? withTUIFallback(
							"displayPanel",
							[content, title, { type: options?.type || "info" }],
							fallback
					  )(tui)
					: fallback);
			}) as Effect.Effect<void, unknown>;

		const showTable: DisplayService["showTable"] = <
			T extends Record<string, unknown>,
		>(
			data: T[],
			options: TableOptions<T>
		) =>
			Effect.gen(function* () {
				const tui = yield* tuiLoader.load();
				const fallback = Effect.sync(() => console.table(data));
				const tableData = {
					columns: options.columns.map((col) => ({
						key: String(col.key),
						header: col.header,
						width: col.width,
						align: col.align,
						formatter: col.formatter,
					})),
					bordered: options.bordered,
					head: options.head,
				};
				yield* (tui
					? withTUIFallback("displayTable", [data, tableData], fallback)(tui)
					: fallback);
			}) as Effect.Effect<void, unknown>;

		const showHighlight: DisplayService["showHighlight"] = (message: string) =>
			Effect.gen(function* () {
				const tui = yield* tuiLoader.load();
				const fallback = Console.log(`\n📌 ${message}\n`);
				yield* (tui ? withTUIFallback("displayHighlight", [message], fallback)(tui) : fallback);
			}) as Effect.Effect<void, unknown>;

		const showSeparator: DisplayService["showSeparator"] = () =>
			Effect.gen(function* () {
				yield* Console.log("─".repeat(60));
			}) as Effect.Effect<void, unknown>;

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
}) {
	/**
	 * Show a table in the console or TUI
	 * Explicitly defined because Effect.Service accessor generation fails for generics
	 */
	static showTable<T extends Record<string, unknown>>(
		data: T[],
		options: TableOptions<T>
	): Effect.Effect<void, unknown, Display> {
		return Effect.flatMap(Display, (service) => service.showTable(data, options));
	}
}
