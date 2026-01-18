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

describe("Regression Snapshot Tests", () => {
	it("snapshot: findings ruleIds are stable for a known input", async () => {
		const source = "import { readFile } from \"node:fs/promises\";\n";
		const report = await run("a.ts", source);

		const snapshot = report.findings.map((f) => f.ruleId).sort();
		expect(snapshot).toMatchSnapshot();
	});
});
