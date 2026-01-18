import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { AnalysisService } from "../../services/analysis-service";

const run = (filename: string, source: string) =>
	Effect.runPromise(
		Effect.gen(function* () {
			const analysisService = yield* AnalysisService;
			return yield* analysisService.analyzeFile(filename, source);
		}).pipe(Effect.provide(AnalysisService.Default))
	);

describe("MCP Output Contract", () => {
	it("analysis report has stable required fields", async () => {
		const report = await run(
			"a.ts",
			"import { readFile } from \"node:fs/promises\";\n"
		);

		expect(typeof report.filename).toBe("string");
		expect(typeof report.analyzedAt).toBe("string");
		expect(Array.isArray(report.findings)).toBe(true);
		expect(Array.isArray(report.suggestions)).toBe(true);
	});

	it("each finding has stable required fields", async () => {
		const report = await run(
			"a.ts",
			"import { readFile } from \"node:fs/promises\";\n"
		);

		for (const finding of report.findings) {
			expect(typeof finding.id).toBe("string");
			expect(typeof finding.ruleId).toBe("string");
			expect(typeof finding.title).toBe("string");
			expect(typeof finding.message).toBe("string");
			expect(["low", "medium", "high"]).toContain(finding.severity);
			expect(Array.isArray(finding.refactoringIds)).toBe(true);
		}
	});
});
