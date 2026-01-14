import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { ConsistencyAnalyzerService } from "../services/consistency-analyzer";

describe("ConsistencyAnalyzerService", () => {
	it("detects mixed filesystem abstractions", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* ConsistencyAnalyzerService;
				return yield* analyzer.analyze({
					files: [
						{
							filename: "a.ts",
							source: "import { readFile } from \"node:fs/promises\";\n",
						},
						{
							filename: "b.ts",
							source: "import { FileSystem } from \"@effect/platform\";\n",
						},
					],
				});
			}).pipe(Effect.provide(ConsistencyAnalyzerService.Default))
		);

		expect(output.issues.some((i) => i.id === "mixed-fs")).toBe(true);
	});

	it("detects mixed validation approaches", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* ConsistencyAnalyzerService;
				return yield* analyzer.analyze({
					files: [
						{
							filename: "a.ts",
							source: "const x = Effect.filterOrFail(1, () => new Error());\n",
						},
						{ filename: "b.ts", source: "const y = 1;\n" },
					],
				});
			}).pipe(Effect.provide(ConsistencyAnalyzerService.Default))
		);

		expect(output.issues.some((i) => i.id === "mixed-validation"))
			.toBe(true);
	});
});
