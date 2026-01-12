/**
 * Execution service tests - NO MOCKS
 */

import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Logger } from "../../logger/index.js";
import { TUIService } from "../../tui/service.js";
import { Execution } from "../service.js";

describe("Execution Service", () => {
	describe("Service Methods", () => {
		it("should provide all execution methods", () =>
			Effect.gen(function* () {
				const execution = yield* Execution;

				expect(execution.executeScriptWithTUI).toBeDefined();
				expect(execution.executeScriptCapture).toBeDefined();
				expect(execution.executeScriptStream).toBeDefined();
				expect(execution.withSpinner).toBeDefined();
			}).pipe(
				Effect.provide(
					Layer.mergeAll(
						Execution.Default,
						Logger.Default,
						TUIService.Default
					)
				),
				Effect.runPromise
			));
	});

	describe("withSpinner", () => {
		it("should wrap effect and return result", () =>
			Effect.gen(function* () {
				const execution = yield* Execution;
				const result = yield* execution.withSpinner(
					"Test task",
					Effect.succeed("test result")
				);
				expect(result).toBe("test result");
			}).pipe(
				Effect.provide(
					Layer.mergeAll(
						Execution.Default,
						Logger.Default,
						TUIService.Default
					)
				),
				Effect.runPromise
			));

		it("should propagate effect errors", async () => {
			const program = Effect.gen(function* () {
				const execution = yield* Execution;
				return yield* execution.withSpinner(
					"Test task",
					Effect.fail(new Error("Task failed"))
				);
			});

			await expect(
				Effect.runPromise(
					program.pipe(
						Effect.provide(
							Layer.mergeAll(
								Execution.Default,
								Logger.Default,
								TUIService.Default
							)
						)
					)
				)
			).rejects.toThrow("Task failed");
		});
	});
});
