/**
 * Display service tests — no behavioral mocks.
 * Uses real no-op TUI implementations with call tracking via arrays.
 */

import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Logger } from "../../logger/index.js";
import { TUIService } from "../../tui/service.js";
import { Display } from "../service.js";

describe("Display Service", () => {
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
					{ key: "name", header: "Name" },
				],
			});
			yield* display.showHighlight("Highlight");
			yield* display.showSeparator();
		});

	describe("Console Fallback (No TUI)", () => {
		it("should cover all basic logging methods", async () => {
			const noTUIService = Layer.succeed(TUIService, {
				load: () => Effect.succeed(null),
				isAvailable: () => Effect.succeed(false),
				clearCache: () => Effect.void,
			});

			const layers = Display.Default.pipe(
				Layer.provide(Logger.Default),
				Layer.provide(noTUIService)
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
			const calls: string[] = [];

			const trackingTUI = {
				displaySuccess: async (msg: string) => { calls.push(`success:${msg}`); },
				displayError: async (msg: string) => { calls.push(`error:${msg}`); },
				displayInfo: async (msg: string) => { calls.push(`info:${msg}`); },
				displayWarning: async (msg: string) => { calls.push(`warning:${msg}`); },
				displayPanel: async (...args: unknown[]) => { calls.push("panel"); },
				displayTable: async (...args: unknown[]) => { calls.push("table"); },
				displayHighlight: async (msg: string) => { calls.push(`highlight:${msg}`); },
			};

			const tuiService = Layer.succeed(TUIService, {
				load: () => Effect.succeed(trackingTUI as any),
				isAvailable: () => Effect.succeed(true),
				clearCache: () => Effect.void,
			});

			const layers = Display.Default.pipe(
				Layer.provide(Logger.Default),
				Layer.provide(tuiService)
			);

			const program = Effect.gen(function* () {
				const display = yield* Display;
				yield* runAllDisplayMethods(display);
			});

			await Effect.runPromise(program.pipe(Effect.provide(layers)) as any);

			expect(calls).toContain("success:Success");
			expect(calls).toContain("error:Error");
			expect(calls).toContain("info:Info");
			expect(calls).toContain("warning:Warning");
			expect(calls).toContain("panel");
			expect(calls).toContain("table");
			expect(calls).toContain("highlight:Highlight");
		});
	});

	describe("Error Handling", () => {
		it("should handle TUI load failures", async () => {
			const failingTUIService = Layer.succeed(TUIService, {
				load: () => Effect.fail(new Error("Load failed") as any),
				isAvailable: () => Effect.succeed(false),
				clearCache: () => Effect.void,
			});

			const layers = Display.Default.pipe(
				Layer.provide(Logger.Default),
				Layer.provide(failingTUIService)
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
