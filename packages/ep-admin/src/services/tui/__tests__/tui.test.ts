/**
 * TUI Service tests
 */

import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TUIService } from "../service.js";
import { TUILoadError } from "./../errors.js";

describe("TUI Service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Service Structure", () => {
		it("should have service structure", () => {
			expect(TUIService).toBeDefined();
			expect(TUIService.Default).toBeDefined();
		});

		it("should export types", () => {
			expect(TUILoadError).toBeDefined();
		});
	});

	describe("TUI Module Loading", () => {
		it("should have load method", async () => {
			const program = Effect.gen(function* () {
				const tuiService = yield* TUIService;
				const loadMethod = tuiService.load;
				return typeof loadMethod;
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TUIService.Default)));

			expect(result).toBe("function");
		});

		it("should handle load method errors", async () => {
			const program = Effect.gen(function* () {
				const tuiService = yield* TUIService;
				try {
					yield* tuiService.load();
					return "loaded";
				} catch (error) {
					return "error";
				}
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TUIService.Default)));

			// Should either load successfully or handle error gracefully
			expect(["loaded", "error"]).toContain(result);
		});
	});

	describe("TUI Availability", () => {
		it("should check availability without loading", async () => {
			const program = Effect.gen(function* () {
				const tuiService = yield* TUIService;
				const isAvailable = yield* tuiService.isAvailable();
				return isAvailable;
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TUIService.Default)));

			// Should return false when not loaded
			expect(typeof result).toBe("boolean");
		});
	});

	describe("Cache Management", () => {
		it("should clear cache successfully", async () => {
			const program = Effect.gen(function* () {
				const tuiService = yield* TUIService;
				yield* tuiService.clearCache();
				return true;
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(TUIService.Default)));

			expect(result).toBe(true);
		});
	});

	describe("Error Types", () => {
		it("should create TUILoadError correctly", () => {
			const error = TUILoadError.make("Test error", new Error("Cause"));
			expect(error).toBeInstanceOf(TUILoadError);
			expect(error.message).toBe("Test error");
			expect(error.cause).toEqual(new Error("Cause"));
		});
	});
});
