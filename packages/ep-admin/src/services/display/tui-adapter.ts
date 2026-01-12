/**
 * ep-admin TUI Adapter for Display Service
 * 
 * This adapter provides the ep-admin specific TUI implementation
 * for the shared Display Service.
 */

import type { TUIAdapter, TUIDisplayMethods } from "@effect-patterns/ep-shared-services/display";
import { TUIService } from "@effect-patterns/ep-shared-services/tui";
import { Effect } from "effect";

/**
 * ep-admin specific TUI adapter implementation
 */
export const EpAdminTUIAdapter: TUIAdapter = {
	load: () =>
		Effect.gen(function* () {
			const tuiService = yield* TUIService;
			const tuiModule = yield* tuiService.load();

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
			Effect.provide(TUIService.Default),
			Effect.catchAll(() => Effect.succeed(null))
		),
};
