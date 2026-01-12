/**
 * ep-cli TUI Adapter for Display Service
 * 
 * This adapter provides the ep-cli specific TUI implementation
 * for the shared Display Service.
 */

import type { TUIAdapter, TUIDisplayMethods } from "@effect-patterns/ep-shared-services/display";
import { Effect } from "effect";
import { LiveTUILoader, TUILoader } from "./tui-loader.js";

/**
 * ep-cli specific TUI adapter implementation
 */
export const EpCliTUIAdapter: TUIAdapter = {
	load: () =>
		Effect.gen(function* () {
			const tuiLoader = yield* TUILoader;
			const tuiModule = yield* tuiLoader.load();

			if (!tuiModule) {
				return null;
			}

			// Extract display methods from the TUI module
			const displayMethods: TUIDisplayMethods = {
				displaySuccess: tuiModule.displaySuccess,
				displayError: tuiModule.displayError,
				displayInfo: tuiModule.displayInfo,
				displayWarning: tuiModule.displayWarning,
				displayPanel: tuiModule.displayPanel,
				displayTable: tuiModule.displayTable,
				displayHighlight: tuiModule.displayHighlight,
			};

			return displayMethods;
		}).pipe(
			Effect.provide(LiveTUILoader),
			Effect.catchAll(() => Effect.succeed(null))
		),
};
