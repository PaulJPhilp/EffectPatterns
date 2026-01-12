/**
 * Display service tests - NO MOCKS
 */

import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Logger } from "../../logger/index.js";
import { TUIService } from "../../tui/service.js";
import { Display } from "../service.js";

describe("Display Service", () => {
	describe("Service Methods", () => {
		it("should provide all display methods", async () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;

				expect(display.showSuccess).toBeDefined();
				expect(display.showError).toBeDefined();
				expect(display.showWarning).toBeDefined();
				expect(display.showInfo).toBeDefined();
				expect(display.showPanel).toBeDefined();
				expect(display.showTable).toBeDefined();
			});

			const layers = Display.Default.pipe(
				Layer.provide(Logger.Default),
				Layer.provide(TUIService.Default)
			);

			await Effect.runPromise(
				program.pipe(Effect.provide(layers)) as Effect.Effect<void>
			);
		});
	});

	describe("Display Operations", () => {
		it("should show success message", async () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showSuccess("Success message");
				// Test passes if no error thrown
			});

			const layers = Display.Default.pipe(
				Layer.provide(Logger.Default),
				Layer.provide(TUIService.Default)
			);

			await Effect.runPromise(
				program.pipe(Effect.provide(layers)) as Effect.Effect<void>
			);
		});

		it("should show error message", async () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showError("Error message");
				// Test passes if no error thrown
			});

			const layers = Display.Default.pipe(
				Layer.provide(Logger.Default),
				Layer.provide(TUIService.Default)
			);

			await Effect.runPromise(
				program.pipe(Effect.provide(layers)) as Effect.Effect<void>
			);
		});

		it("should show warning message", async () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showWarning("Warning message");
				// Test passes if no error thrown
			});

			const layers = Display.Default.pipe(
				Layer.provide(Logger.Default),
				Layer.provide(TUIService.Default)
			);

			await Effect.runPromise(
				program.pipe(Effect.provide(layers)) as Effect.Effect<void>
			);
		});

		it("should show info message", async () => {
			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showInfo("Info message");
				// Test passes if no error thrown
			});

			const layers = Display.Default.pipe(
				Layer.provide(Logger.Default),
				Layer.provide(TUIService.Default)
			);

			await Effect.runPromise(
				program.pipe(Effect.provide(layers)) as Effect.Effect<void>
			);
		});
	});
});
