import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { AnalysisService } from "../services/analysis-service";

describe("AnalysisService", () => {
	it("analyzes a file and returns findings", async () => {
		const source = "import { readFile } from \"node:fs/promises\";\n";

		const report = await Effect.runPromise(
			Effect.gen(function* () {
				const analysis = yield* AnalysisService;
				return yield* analysis.analyzeFile("a.ts", source);
			}).pipe(Effect.provide(AnalysisService.Default))
		);

		expect(report.filename).toBe("a.ts");
		expect(report.findings.some((f) => f.ruleId === "node-fs")).toBe(true);
	});

	it("generates a fix when a rule has fixIds", async () => {
		const source = "import { readFile } from \"node:fs/promises\";\n";

		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const analysis = yield* AnalysisService;
				return yield* analysis.generateFix({
					ruleId: "node-fs",
					filename: "a.ts",
					source,
				});
			}).pipe(Effect.provide(AnalysisService.Default))
		);

		expect(output.applied).toBe(false);
		expect(output.changes).toHaveLength(1);
		expect(output.changes[0].after).toContain("@effect/platform");
	});

	it("generateFix returns empty changes when rule is unknown", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* AnalysisService;
				return yield* service.generateFix({
					ruleId: "does-not-exist" as any,
					filename: "a.ts",
					source: "export const x = 1;\n",
				});
			}).pipe(Effect.provide(AnalysisService.Default))
		);

		expect(output.applied).toBe(false);
		expect(output.changes).toHaveLength(0);
	});

	it("applyRefactorings returns changes for known fix", async () => {
		const output = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* AnalysisService;
				return yield* service.applyRefactorings(
					["replace-node-fs"],
					[
						{
							filename: "a.ts",
							source: "import { readFile } from \"node:fs/promises\";\n",
						},
					]
				);
			}).pipe(Effect.provide(AnalysisService.Default))
		);

		expect(output).toHaveLength(1);
		expect(output[0].after).toContain("@effect/platform");
	});
});
