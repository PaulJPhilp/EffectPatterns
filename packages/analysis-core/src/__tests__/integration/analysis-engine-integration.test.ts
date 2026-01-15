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

describe("Analysis Engine Integration Tests", () => {
	it("analyzes a file and produces findings", async () => {
		const source = "import { readFile } from \"node:fs/promises\";\n";
		const report = await run("a.ts", source);
		expect(report.filename).toBe("a.ts");
		expect(report.findings.length).toBeGreaterThan(0);
	});

	it("handles empty source", async () => {
		const report = await run("empty.ts", "");
		expect(report.findings.length).toBe(0);
	});
});
