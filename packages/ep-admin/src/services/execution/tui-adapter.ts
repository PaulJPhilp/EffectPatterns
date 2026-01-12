/**
 * ep-admin TUI Adapter for Execution Service
 * 
 * This adapter provides the ep-admin specific TUI implementation
 * for the shared Execution Service.
 */

import type { ExecutionTUIAdapter, ExecutionTUISpinnerMethods } from "@effect-patterns/ep-shared-services/execution";
import { TUIService } from "@effect-patterns/ep-shared-services/tui";
import { Effect } from "effect";

/**
 * ep-admin specific TUI adapter implementation
 */
export const EpAdminExecutionTUIAdapter: ExecutionTUIAdapter = {
	load: () =>
		Effect.gen(function* () {
			const tuiService = yield* TUIService;
			const tuiModule = yield* tuiService.load();

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
			Effect.provide(TUIService.Default),
			Effect.catchAll(() => Effect.succeed(null))
		),
};
