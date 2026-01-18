/**
 * Display service tests
 */

import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { Logger } from "../../logger/index.js";
import { TUIService } from "../../tui/service.js";
import { Display } from "../service.js";

describe("Display Service", () => {
	// Helper to create a test program that calls all display methods
	const runAllDisplayMethods = (display: any) =>
		Effect.gen(function* () {
			yield* display.showSuccess("Success");
			yield* display.showError("Error");
			yield* display.showInfo("Info");
			yield* display.showWarning("Warning");
			yield* display.showPanel("Content", "Title");
			yield* display.showTable([{ id: 1, name: "Test" }], { 
				columns: [
					{ key: "id", header: "ID" },
					{ key: "name", header: "Name" }
				] 
			});
			yield* display.showHighlight("Highlight");
			yield* display.showSeparator();
		});

	describe("Console Fallback (No TUI)", () => {
		it("should cover all basic logging methods", async () => {
			const mockTUIService = Layer.succeed(TUIService, {
				load: () => Effect.succeed(null),
				isAvailable: () => Effect.succeed(false),
				clearCache: () => Effect.void,
			});

			const layers = Display.Default.pipe(
				Layer.provide(Logger.Default),
				Layer.provide(mockTUIService)
			);

			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* runAllDisplayMethods(display);
			});

			await Effect.runPromise(program.pipe(Effect.provide(layers)) as any);
		});
	});

	describe("TUI Path (With TUI)", () => {
		it("should call TUI methods when available", async () => {
			const mockTUI = {
				displaySuccess: vi.fn().mockResolvedValue(undefined),
				displayError: vi.fn().mockResolvedValue(undefined),
				displayInfo: vi.fn().mockResolvedValue(undefined),
				displayWarning: vi.fn().mockResolvedValue(undefined),
				displayPanel: vi.fn().mockResolvedValue(undefined),
				displayTable: vi.fn().mockResolvedValue(undefined),
				displayHighlight: vi.fn().mockResolvedValue(undefined),
			};

			const mockTUIService = Layer.succeed(TUIService, {
				load: () => Effect.succeed(mockTUI as any),
				isAvailable: () => Effect.succeed(true),
				clearCache: () => Effect.void,
			});

			const layers = Display.Default.pipe(
				Layer.provide(Logger.Default),
				Layer.provide(mockTUIService)
			);

			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* runAllDisplayMethods(display);
			});

			await Effect.runPromise(program.pipe(Effect.provide(layers)) as any);

			expect(mockTUI.displaySuccess).toHaveBeenCalledWith("Success");
			expect(mockTUI.displayError).toHaveBeenCalledWith("Error");
			expect(mockTUI.displayInfo).toHaveBeenCalledWith("Info");
			expect(mockTUI.displayWarning).toHaveBeenCalledWith("Warning");
			expect(mockTUI.displayPanel).toHaveBeenCalled();
			expect(mockTUI.displayTable).toHaveBeenCalled();
			expect(mockTUI.displayHighlight).toHaveBeenCalledWith("Highlight");
		});
	});

	describe("Error Handling", () => {
		it("should handle TUI load failures", async () => {
			const mockTUIService = Layer.succeed(TUIService, {
				load: () => Effect.fail(new Error("Load failed") as any),
				isAvailable: () => Effect.succeed(false),
				clearCache: () => Effect.void,
			});

			const layers = Display.Default.pipe(
				Layer.provide(Logger.Default),
				Layer.provide(mockTUIService)
			);

			const program = Effect.gen(function* () {
				const display = yield* Display;
				const result = yield* Effect.flip(display.showSuccess("Fail"));
				expect(result._tag).toBe("DisplayError");
			});

			await Effect.runPromise(program.pipe(Effect.provide(layers)) as any);
		});
	});
});
