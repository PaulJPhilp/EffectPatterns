import { Context, Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureConsole } from "../../../test/helpers.js";
import { Logger } from "../../logger/index.js";
import { ICONS } from "../helpers.js";
import { Display } from "../service.js";
import { TUILoader } from "../tui-loader.js";

const makeMockTUILoader = (tuiModule: any | null) =>
	Layer.succeed(TUILoader, TUILoader.of({ load: () => Effect.succeed(tuiModule) }));

describe("Display Service", () => {
	let capture: ReturnType<typeof captureConsole>;

	beforeEach(() => {
		capture = captureConsole();
	});

	afterEach(() => {
		capture.restore();
	});

	const runTest = <A, E>(
		program: Effect.Effect<A, E, Display | Logger>,
		tuiModule: any | null
	) => {
		const displayLayer = Display.Default.pipe(
			Layer.provide(makeMockTUILoader(tuiModule)),
			Layer.provide(Logger.Default)
		);

		return program.pipe(
			Effect.provide(displayLayer),
			Effect.provide(Logger.Default),
			Effect.runPromise
		);
	};

	describe("Console Fallback (No TUI)", () => {
		it("should cover all basic logging methods", async () => {
			await runTest(
				Effect.gen(function* () {
					const d = yield* Display;
					yield* d.showSuccess("s");
					yield* d.showError("e");
					yield* d.showInfo("i");
					yield* d.showWarning("w");
				}),
				null
			);
			expect(capture.logs.some((l) => l.includes(ICONS.success))).toBe(true);
			expect(capture.errors.some((e) => e.includes(ICONS.error))).toBe(true);
			expect(capture.warns.some((w) => w.includes(ICONS.info))).toBe(true);
			expect(capture.warns.some((w) => w.includes(ICONS.warning))).toBe(true);
		});

		it("should cover complex methods", async () => {
			await runTest(
				Effect.gen(function* () {
					const d = yield* Display;
					yield* d.showPanel("c", "t");
					yield* d.showTable([{ a: 1 }], { columns: [{ key: "a", header: "A" }] });
					yield* d.showHighlight("h");
					yield* d.showSeparator();
				}),
				null
			);
			expect(capture.logs.join("\n")).toContain("t");
			expect(capture.logs.some((l) => l.includes(ICONS.highlight))).toBe(true);
			expect(capture.logs.some((l) => l.includes("──"))).toBe(true);
		});
	});

	describe("TUI Integration", () => {
		class MockTag extends Context.Tag("MockTag")<MockTag, {}>() {}

		it("should call TUI methods for all operations", async () => {
			const calls: string[] = [];

			const tuiModule = {
				DisplayService: MockTag,
				displaySuccess: (msg: string) => { calls.push(`success:${msg}`); return Effect.void; },
				displayError: (msg: string) => { calls.push(`error:${msg}`); return Effect.void; },
				displayInfo: (msg: string) => { calls.push(`info:${msg}`); return Effect.void; },
				displayWarning: (msg: string) => { calls.push(`warning:${msg}`); return Effect.void; },
				displayPanel: (..._args: unknown[]) => { calls.push("panel"); return Effect.void; },
				displayTable: (..._args: unknown[]) => { calls.push("table"); return Effect.void; },
				displayHighlight: (msg: string) => { calls.push(`highlight:${msg}`); return Effect.void; },
			};

			await runTest(
				Effect.gen(function* () {
					const d = yield* Display;
					yield* d.showSuccess("s");
					yield* d.showError("e");
					yield* d.showInfo("i");
					yield* d.showWarning("w");
					yield* d.showPanel("c", "t");
					yield* d.showTable([], { columns: [] });
					yield* d.showHighlight("h");
				}).pipe(Effect.provideService(MockTag, {})),
				tuiModule
			);

			expect(calls).toContain("success:s");
			expect(calls).toContain("error:e");
			expect(calls).toContain("info:i");
			expect(calls).toContain("warning:w");
			expect(calls).toContain("panel");
			expect(calls).toContain("table");
			expect(calls).toContain("highlight:h");
		});
	});
});
