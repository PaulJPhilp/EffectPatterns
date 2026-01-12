/**
 * Display service tests
 */

import { Console, Context, Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { Logger, defaultLoggerConfig } from "../../logger/index.js";
import { TUIService } from "../../tui/service.js";
import { Display } from "../service.js";

// --- Test Configuration ---

const makeTestTUIService = (tuiModule: any | null) =>
	Layer.succeed(
		TUIService,
		TUIService.of({
			load: () => Effect.succeed(tuiModule),
			isAvailable: () => Effect.suspend(() => Effect.succeed(tuiModule !== null)),
			clearCache: () => Effect.suspend(() => Effect.void),
		})
	);

const makeLoggerLayer = (useColors: boolean = true) =>
	Layer.succeed(
		Logger,
		Logger.of({
			config: { ...defaultLoggerConfig, useColors },
			debug: () => Effect.void,
			info: () => Effect.void,
			warn: () => Effect.void,
			error: () => Effect.void,
			success: () => Effect.void,
			shouldLog: () => true,
			updateConfig: () => Effect.void,
			getConfig: () =>
				Effect.succeed({
					...defaultLoggerConfig,
					useColors,
					outputFormat: "text",
				}),
		} as any)
	);

// TestConsole tag for accessing captured logs
class TestConsole extends Context.Tag("TestConsole")<
	TestConsole,
	{ logs: Effect.Effect<string[]> }
>() { }

const runTest = <A, E>(
	program: Effect.Effect<A, E, any>,
	tuiModule: any | null,
	useColors: boolean = true
) => {
	const logs: string[] = [];

	// Create a mock Console service
	const mockConsole = {
		log: (msg: any) => Effect.sync(() => { logs.push(String(msg)); }),
		error: (msg: any) => Effect.sync(() => { logs.push(String(msg)); }),
		warn: (msg: any) => Effect.sync(() => { logs.push(String(msg)); }),
	} as any;

	const testConsoleService = {
		logs: Effect.sync(() => [...logs])
	};

	const displayLayer = Display.Default.pipe(
		Layer.provide(makeTestTUIService(tuiModule)),
		Layer.provide(makeLoggerLayer(useColors))
	);

	return Effect.runPromise(
		program.pipe(
			Effect.provide(displayLayer),
			Effect.provide(Console.setConsole(mockConsole)),
			Effect.provideService(TestConsole, testConsoleService)
		) as Effect.Effect<A, E, never>
	);
};

describe("Display Service", () => {
	describe("Console Fallback (No TUI)", () => {
		it("should show success message via console", () =>
			runTest(Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showSuccess("Success message");

				const tc = yield* TestConsole;
				const output = yield* tc.logs;

				expect(output.length).toBeGreaterThan(0);
				expect(output[0]).toContain("Success message");
			}), null, true));

		it("should show error message via console", () =>
			runTest(Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showError("Error message");

				const tc = yield* TestConsole;
				const output = yield* tc.logs;

				expect(output.length).toBeGreaterThan(0);
				expect(output[0]).toContain("Error message");
			}), null, true));

		it("should respect no-color config", () =>
			runTest(Effect.gen(function* () {
				const display = yield* Display;
				yield* display.showSuccess("Plain message");

				const tc = yield* TestConsole;
				const output = yield* tc.logs;

				expect(output[0]).toContain("Plain message");
			}), null, false));
	});

	describe("TUI Integration", () => {
		// Define a proper Tag class for the mock service
		class MockDisplayTag extends Context.Tag("MockDisplayTag")<
			MockDisplayTag,
			unknown
		>() { }

		it("should use TUI service when available", () => {
			const displaySuccessSpy = vi.fn().mockImplementation(() => Effect.void);

			const mockTUI = {
				DisplayService: MockDisplayTag,
				displaySuccess: displaySuccessSpy,
			};

			// Note: to verify TUI called, logs might be empty, that's fine.
			// We just need to check spy.
			return runTest(
				Effect.gen(function* () {
					const display = yield* Display;
					yield* display.showSuccess("TUI Message");

					expect(displaySuccessSpy).toHaveBeenCalledWith("TUI Message");
				}).pipe(Effect.provideService(MockDisplayTag, {})),
				mockTUI,
				true
			);
		});

		it("should fallback if TUI service tag is not in context", () => {
			const displaySuccessSpy = vi.fn().mockReturnValue(Effect.void);
			const mockTUI = {
				DisplayService: MockDisplayTag,
				displaySuccess: displaySuccessSpy,
			};

			return runTest(
				Effect.gen(function* () {
					const display = yield* Display;
					yield* display.showSuccess("Fallback Message");

					expect(displaySuccessSpy).not.toHaveBeenCalled();

					const tc = yield* TestConsole;
					const output = yield* tc.logs;
					expect(output[0]).toContain("Fallback Message");
				}),
				mockTUI,
				true
			);
		});
	});
});
