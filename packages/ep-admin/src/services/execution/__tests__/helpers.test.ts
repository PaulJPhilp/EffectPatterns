/**
 * Execution service helper tests
 */

import { Effect } from "effect";
import * as Console from "effect/Console";
import { spawn, type ChildProcess } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTUISpinner, spawnEffect, withSpinner } from "../helpers.js";

vi.mock("node:child_process", () => ({
	spawn: vi.fn(),
}));

// Mock the effect/Console module
vi.mock("effect/Console", async () => {
    return {
        log: vi.fn(() => Effect.void),
        error: vi.fn(() => Effect.void),
        warn: vi.fn(() => Effect.void),
    };
});

describe("Execution Helpers", () => {
	let mockChildProcess: Partial<ChildProcess>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockChildProcess = {
			stdout: { on: vi.fn() } as any,
			stderr: { on: vi.fn() } as any,
			on: vi.fn(),
		};
	});

	describe("spawnEffect", () => {
		it("should succeed when script exits with code 0", async () => {
			let exitHandler: ((code?: number) => void) | undefined;
			mockChildProcess = {
				stdout: { on: vi.fn() } as any,
				stderr: { on: vi.fn() } as any,
				on: vi.fn((event: string, callback: (code?: number | Error) => void) => {
					if (event === "exit") {
						exitHandler = callback as (code?: number) => void;
						// Fire callback asynchronously
						setTimeout(() => {
							if (exitHandler) exitHandler(0);
						}, 0);
					}
					return mockChildProcess as any;
				}),
			};
			(spawn as any).mockReturnValue(mockChildProcess as ChildProcess);

			const result = await Effect.runPromise(spawnEffect("script.ts"));

			expect(result).toBeUndefined();
			expect(spawn).toHaveBeenCalled();
		});

		it("should fail when script exits with non-zero code", async () => {
			mockChildProcess = {
				stdout: {
					on: vi.fn((event: string, callback: (data: Buffer) => void) => {
						if (event === "data") {
							setTimeout(() => callback(Buffer.from("output")), 0);
						}
					}),
				} as any,
				stderr: { on: vi.fn() } as any,
				on: vi.fn((event: string, callback: (code?: number) => void) => {
					if (event === "exit") {
						setTimeout(() => callback(1), 0);
					}
					return mockChildProcess as any;
				}),
			};
			(spawn as any).mockReturnValue(mockChildProcess as ChildProcess);

			await expect(
				Effect.runPromise(spawnEffect("script.ts"))
			).rejects.toThrow();
		});

		it("should capture output in non-verbose mode", async () => {
			let dataHandler: ((data: Buffer) => void) | undefined;
			let exitHandler: ((code?: number) => void) | undefined;
			mockChildProcess = {
				stdout: {
					on: vi.fn((event: string, callback: (data: Buffer) => void) => {
						if (event === "data") {
							dataHandler = callback;
							setTimeout(() => {
								if (dataHandler) dataHandler(Buffer.from("output"));
							}, 0);
						}
					}),
				} as any,
				stderr: { on: vi.fn() } as any,
				on: vi.fn((event: string, callback: (code?: number) => void) => {
					if (event === "exit") {
						exitHandler = callback;
						setTimeout(() => {
							if (exitHandler) exitHandler(1);
						}, 10);
					}
					return mockChildProcess as any;
				}),
			};
			(spawn as any).mockReturnValue(mockChildProcess as ChildProcess);

			await expect(
				Effect.runPromise(spawnEffect("script.ts", { verbose: false }))
			).rejects.toThrow();
			expect(spawn).toHaveBeenCalled();
		});

		it("should use inherit stdio in verbose mode", async () => {
			let exitHandler: ((code?: number) => void) | undefined;
			mockChildProcess = {
				on: vi.fn((event: string, callback: (code?: number) => void) => {
					if (event === "exit") {
						exitHandler = callback;
						setTimeout(() => {
							if (exitHandler) exitHandler(0);
						}, 0);
					}
					return mockChildProcess as any;
				}),
			};
			(spawn as any).mockReturnValue(mockChildProcess as ChildProcess);

			await Effect.runPromise(spawnEffect("script.ts", { verbose: true }));

			expect(spawn).toHaveBeenCalledWith("bun", ["run", "script.ts"], {
				stdio: "inherit",
				shell: true,
				timeout: undefined,
			});
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

			await expect(
				Effect.runPromise(spawnEffect("script.ts"))
			).rejects.toThrow();
		});
	});

	describe("withSpinner", () => {
		it("should wrap effect with spinner messages", async () => {
			const result = await Effect.runPromise(
				withSpinner("Test task", Effect.succeed("result"))
			);

			expect(result).toBe("result");
			expect(Console.log).toHaveBeenCalledTimes(2);
			const calls = vi.mocked(Console.log).mock.calls;
			expect(calls[0]?.[0]).toContain("Test task...");
			expect(calls[1]?.[0]).toContain("Test task completed");
		});

		it("should propagate effect errors", async () => {
			await expect(
				Effect.runPromise(
					withSpinner("Test task", Effect.fail(new Error("Failed")))
				)
			).rejects.toThrow("Failed");
		});
	});

	describe("getTUISpinner", () => {
		it("should return TUI spinner info", () => {
			const result = getTUISpinner();
			expect(result).toHaveProperty("spinnerEffectTUI");
			expect(result).toHaveProperty("InkService");
		});
	});
});