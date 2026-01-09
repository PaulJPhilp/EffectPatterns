/**
 * Display service implementation
 */

import { Console, Effect, Option as Opt } from "effect";
import { TUILoader } from "../tui-loader.js";
import type { DisplayService } from "./api.js";
import { ICONS } from "./helpers.js";
import type { PanelOptions, TableOptions } from "./types.js";

/**
 * Display service using Effect.Service pattern
 */
export class Display extends Effect.Service<Display>()("Display", {
	accessors: true,
	effect: Effect.gen(function* () {
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

				// Fallback to console
				yield* Console.log(`${ICONS.success} ${message}`);
			}) as Effect.Effect<void, unknown>;

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

				// Fallback to console
				yield* Console.error(`${ICONS.error} ${message}`);
			}) as Effect.Effect<void, unknown>;

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

				// Fallback to console
				yield* Console.log(`${ICONS.info} ${message}`);
			}) as Effect.Effect<void, unknown>;

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

				// Fallback to console
				yield* Console.log(`${ICONS.warning} ${message}`);
			}) as Effect.Effect<void, unknown>;

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
			}) as Effect.Effect<void, unknown>;

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

				// Fallback to console
				console.table(data);
			}) as Effect.Effect<void, unknown>;

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
				yield* Console.log(`\n${ICONS.highlight} ${message}\n`);
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
