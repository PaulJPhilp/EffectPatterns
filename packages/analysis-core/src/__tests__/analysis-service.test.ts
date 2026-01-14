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
});
