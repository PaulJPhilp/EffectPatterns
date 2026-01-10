/**
 * Execution service tests
 */

import { Console, Effect, Layer } from "effect";
import { spawn, type ChildProcess } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Logger } from "../../logger/index.js";
import { ExecutionError } from "../errors.js";
import * as helpers from "../helpers.js";
import { Execution } from "../service.js";

// Mock the effect Console module
vi.mock("effect", async (importOriginal) => {
    const actual = await importOriginal<typeof import("effect")>();
    return {
        ...actual,
        Console: {
            ...actual.Console,
            log: vi.fn(() => Effect.void),
            error: vi.fn(() => Effect.void),
            warn: vi.fn(() => Effect.void),
        }
    };
});

// Mock child_process spawn
vi.mock("node:child_process", () => ({
	spawn: vi.fn(),
}));

describe("Execution Service", () => {
	let mockChildProcess: Partial<ChildProcess>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(helpers, "spawnEffect").mockReturnValue(Effect.void as any);
		vi.spyOn(helpers, "getTUISpinner").mockReturnValue({
			spinnerEffectTUI: null,
			InkService: null,
		});
		mockChildProcess = {
			stdout: { on: vi.fn() } as any,
			stderr: { on: vi.fn() } as any,
			on: vi.fn((event: string, callback: (code?: number) => void) => {
				if (event === "exit") {
					setTimeout(() => callback(0), 0);
				}
				return mockChildProcess as any;
			}),
		};
		(spawn as any).mockReturnValue(mockChildProcess as ChildProcess);
		(helpers.getTUISpinner as any).mockReturnValue({
			spinnerEffectTUI: null,
			InkService: null,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Service Methods", () => {
		it("should provide all execution methods", () =>
			Effect.gen(function* () {
				const execution = yield* Execution;

				expect(execution.executeScriptWithTUI).toBeDefined();
				expect(execution.executeScriptCapture).toBeDefined();
				expect(execution.executeScriptStream).toBeDefined();
				expect(execution.withSpinner).toBeDefined();
			}).pipe(
				Effect.provide(Layer.merge(Execution.Default, Logger.Default)),
				Effect.runPromise
			));
	});

	describe("executeScriptWithTUI", () => {
		it("should execute script successfully with console fallback", async () => {
			(helpers.spawnEffect as any).mockReturnValue(Effect.succeed(void 0));
			

			const program = Effect.gen(function* () {
				const execution = yield* Execution;
				return yield* execution.executeScriptWithTUI(
					"script.ts",
					"Test task",
					{ verbose: false }
				);
			});

			await  Effect.runPromise(program.pipe(Effect.provide(Layer.merge(Execution.Default, Logger.Default))));

			expect(Console.log).toHaveBeenCalled();
			expect(helpers.spawnEffect).toHaveBeenCalledWith("script.ts", {
				verbose: false,
			});
		});

		it("should not show spinner in verbose mode", async () => {
			(helpers.spawnEffect as any).mockReturnValue(Effect.succeed(void 0));
			

			const program = Effect.gen(function* () {
				const execution = yield* Execution;
				return yield* execution.executeScriptWithTUI(
					"script.ts",
					"Test task",
					{ verbose: true }
				);
			});

			await  Effect.runPromise(program.pipe(Effect.provide(Layer.merge(Execution.Default, Logger.Default))));

			expect(Console.log).not.toHaveBeenCalled();
		});

		it("should handle execution errors", async () => {
			const error = ExecutionError.make("Script failed", "error output");
			(helpers.spawnEffect as any).mockReturnValue(Effect.fail(error));

			const program = Effect.gen(function* () {
				const execution = yield* Execution;
				return yield* execution.executeScriptWithTUI(
					"script.ts",
					"Test task"
				);
			});

			await expect(
				 Effect.runPromise(program.pipe(Effect.provide(Layer.merge(Execution.Default, Logger.Default))))
			).rejects.toThrow();
		});

		it("should enhance error with script output", async () => {
			const error = ExecutionError.make("Script failed", "error output");
			(helpers.spawnEffect as any).mockReturnValue(Effect.fail(error));

			const program = Effect.gen(function* () {
				const execution = yield* Execution;
				return yield* execution.executeScriptWithTUI(
					"script.ts",
					"Test task"
				);
			});

			await expect(
				 Effect.runPromise(program.pipe(Effect.provide(Layer.merge(Execution.Default, Logger.Default))))
			).rejects.toThrow();
		});
	});

	describe("executeScriptCapture", () => {
		it("should capture script output on success", async () => {
			mockChildProcess = {
				stdout: {
					on: vi.fn((event: string, callback: (data: Buffer) => void) => {
						if (event === "data") {
							setTimeout(() => callback(Buffer.from("output\n")), 0);
						}
					}),
				} as any,
				stderr: { on: vi.fn() } as any,
				on: vi.fn((event: string, callback: (code?: number) => void) => {
					if (event === "exit") {
						setTimeout(() => callback(0), 10);
					}
					return mockChildProcess as any;
				}),
			};
			(spawn as any).mockReturnValue(mockChildProcess as ChildProcess);

			const program = Effect.gen(function* () {
				const execution = yield* Execution;
				return yield* execution.executeScriptCapture("script.ts");
			});

			const result = await  Effect.runPromise(
				program.pipe(Effect.provide(Layer.merge(Execution.Default, Logger.Default)))
			);

			expect(result).toContain("output");
		});

		it("should handle non-zero exit code", async () => {
			mockChildProcess = {
				stdout: { on: vi.fn() } as any,
				stderr: {
					on: vi.fn((event: string, callback: (data: Buffer) => void) => {
						if (event === "data") {
							setTimeout(() => callback(Buffer.from("error\n")), 0);
						}
					}),
				} as any,
				on: vi.fn((event: string, callback: (code?: number) => void) => {
					if (event === "exit") {
						setTimeout(() => callback(1), 10);
					}
					return mockChildProcess as any;
				}),
			};
			(spawn as any).mockReturnValue(mockChildProcess as ChildProcess);

			const program = Effect.gen(function* () {
				const execution = yield* Execution;
				return yield* execution.executeScriptCapture("script.ts");
			});

			await expect(
				 Effect.runPromise(program.pipe(Effect.provide(Layer.merge(Execution.Default, Logger.Default))))
			).rejects.toThrow();
		});

		it("should handle spawn errors", async () => {
			mockChildProcess = {
				stdout: { on: vi.fn() } as any,
				stderr: { on: vi.fn() } as any,
				on: vi.fn((event: string, callback: (error?: Error) => void) => {
					if (event === "error") {
						setTimeout(() => callback(new Error("Spawn failed")), 0);
					}
					return mockChildProcess as any;
				}),
			};
			(spawn as any).mockReturnValue(mockChildProcess as ChildProcess);

			const program = Effect.gen(function* () {
				const execution = yield* Execution;
				return yield* execution.executeScriptCapture("script.ts");
			});

			await expect(
				 Effect.runPromise(program.pipe(Effect.provide(Layer.merge(Execution.Default, Logger.Default))))
			).rejects.toThrow();
		});
	});

	describe("executeScriptStream", () => {
		it("should execute script with streaming output", async () => {
			mockChildProcess = {
				on: vi.fn((event: string, callback: (code?: number) => void) => {
					if (event === "exit") {
						setTimeout(() => callback(0), 0);
					}
					return mockChildProcess as any;
				}),
			};
			(spawn as any).mockReturnValue(mockChildProcess as ChildProcess);

			const program = Effect.gen(function* () {
				const execution = yield* Execution;
				return yield* execution.executeScriptStream("script.ts");
			});

			await  Effect.runPromise(program.pipe(Effect.provide(Layer.merge(Execution.Default, Logger.Default))));

			expect(spawn).toHaveBeenCalledWith("bun", ["run", "script.ts"], {
				stdio: "inherit",
				shell: true,
				timeout: undefined,
			});
		});

		it("should handle non-zero exit code", async () => {
			mockChildProcess = {
				on: vi.fn((event: string, callback: (code?: number) => void) => {
					if (event === "exit") {
						setTimeout(() => callback(1), 0);
					}
					return mockChildProcess as any;
				}),
			};
			(spawn as any).mockReturnValue(mockChildProcess as ChildProcess);

			const program = Effect.gen(function* () {
				const execution = yield* Execution;
				return yield* execution.executeScriptStream("script.ts");
			});

			await expect(
				 Effect.runPromise(program.pipe(Effect.provide(Layer.merge(Execution.Default, Logger.Default))))
			).rejects.toThrow();
		});

		it("should handle spawn errors", async () => {
			mockChildProcess = {
				on: vi.fn((event: string, callback: (error?: Error) => void) => {
					if (event === "error") {
						setTimeout(() => callback(new Error("Spawn failed")), 0);
					}
					return mockChildProcess as any;
				}),
			};
			(spawn as any).mockReturnValue(mockChildProcess as ChildProcess);

			const program = Effect.gen(function* () {
				const execution = yield* Execution;
				return yield* execution.executeScriptStream("script.ts");
			});

			await expect(
				 Effect.runPromise(program.pipe(Effect.provide(Layer.merge(Execution.Default, Logger.Default))))
			).rejects.toThrow();
		});
	});

	describe("withSpinner", () => {
		it("should wrap effect with spinner messages", async () => {
			

			const program = Effect.gen(function* () {
				const execution = yield* Execution;
				const result = yield* execution.withSpinner(
					"Test task",
					Effect.succeed("test result")
				);
				return result;
			});

			const result = await  Effect.runPromise(
				program.pipe(Effect.provide(Layer.merge(Execution.Default, Logger.Default)))
			);

			expect(result).toBe("test result");
			expect(Console.log).toHaveBeenCalledTimes(2);
			const calls = (Console.log as any).mock.calls;
			expect(calls[0]?.[0]).toContain("Test task...");
			expect(calls[1]?.[0]).toContain("Test task completed");
		});

		it("should propagate effect errors", async () => {
			const program = Effect.gen(function* () {
				const execution = yield* Execution;
				return yield* execution.withSpinner(
					"Test task",
					Effect.fail(new Error("Task failed"))
				);
			});

			await expect(
				Effect.runPromise(program.pipe(Effect.provide(Layer.merge(Execution.Default, Logger.Default))))
			).rejects.toThrow("Task failed");
		});
	});
});
