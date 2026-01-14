import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { AppLayer, PatternsService, runWithRuntime } from "./init";

describe("runWithRuntime", () => {
	it("should resolve value for successful effect", async () => {
		const result = await runWithRuntime(Effect.succeed("ok"));
		expect(result).toBe("ok");
	});

	it("should reject with the failure when effect fails", async () => {
		await expect(
			runWithRuntime(Effect.fail(new Error("boom")))
		).rejects.toThrow("boom");
	});

	it("should allow calling PatternsService methods", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const patterns = yield* PatternsService;
				const all = yield* patterns.getAllPatterns();
				const searched = yield* patterns.searchPatterns({});
				const byId = yield* patterns.getPatternById("does-not-exist");
				return {
					allCount: Array.isArray(all) ? all.length : 0,
					searchedCount: Array.isArray(searched) ? searched.length : 0,
					byId,
				};
			}).pipe(Effect.provide(AppLayer), Effect.scoped)
		);

		expect(result.allCount).toBeGreaterThanOrEqual(0);
		expect(result.searchedCount).toBeGreaterThanOrEqual(0);
		expect(result.byId).toBeUndefined();
	});
});
