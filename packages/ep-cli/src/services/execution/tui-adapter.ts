/**
 * ep-cli TUI Adapter for Execution Service
 * 
 * This adapter provides the ep-cli specific TUI implementation
 * for the shared Execution Service.
 */

import type { ExecutionTUIAdapter, ExecutionTUISpinnerMethods } from "@effect-patterns/ep-shared-services/execution";
import { Effect } from "effect";
import { LiveTUILoader, TUILoader } from "../display/tui-loader.js";

/**
 * ep-cli specific TUI adapter implementation
 */
export const EpCliExecutionTUIAdapter: ExecutionTUIAdapter = {
	load: () =>
		Effect.gen(function* () {
			const tuiLoader = yield* TUILoader;
			const tuiModule = yield* tuiLoader.load();

			if (!tuiModule) {
				return null;
			}

			// Extract spinner methods from the TUI module
			const spinnerMethods: ExecutionTUISpinnerMethods = {
				spinnerEffect: tuiModule.spinnerEffect,
				InkService: tuiModule.InkService,
			};

			return spinnerMethods;
		}).pipe(
			Effect.provide(LiveTUILoader),
			Effect.catchAll(() => Effect.succeed(null))
		),
};
