import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { RefactoringEngineService } from "../services/refactoring-engine";

describe("RefactoringEngineService", () => {
	it("replaces node:fs imports", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "replace-node-fs",
					files: [
						{
							filename: "a.ts",
							source: "import { readFile } from \"node:fs/promises\";\n",
						},
					],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.applied).toBe(false);
		expect(output.changes).toHaveLength(1);
		expect(output.changes[0].after).toContain("@effect/platform");
	});

	it("wraps Effect.map callback when passed a function reference", async () => {
		const source = [
			"import { Effect } from \"effect\";\n",
			"const myFn = (n: number) => n + 1;\n",
			"const program = Effect.succeed(1).pipe(Effect.map(myFn));\n",
		].join("");

		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const engine = yield* RefactoringEngineService;
				return yield* engine.apply({
					refactoringId: "wrap-effect-map-callback",
					files: [{ filename: "a.ts", source }],
					preview: true,
				});
			}).pipe(Effect.provide(RefactoringEngineService.Default))
		);

		expect(output.applied).toBe(false);
		expect(output.changes).toHaveLength(1);
		expect(output.changes[0].after).toMatch(
			/Effect\.map\(\(?x\)?\s*=>\s*myFn\(x\)\)/
		);
	});
});
