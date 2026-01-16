import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { AnalysisService } from "../../services/analysis-service";
import { RuleRegistryService } from "../../services/rule-registry";

const run = (filename: string, source: string) =>
	Effect.runPromise(
		Effect.gen(function* () {
			const analysisService = yield* AnalysisService;
			return yield* analysisService.analyzeFile(filename, source);
		}).pipe(Effect.provide(AnalysisService.Default))
	);

describe("End-to-End Confidence Tests", () => {
	it("lists rules and analyzes a file", async () => {
		const rules = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		expect(rules.length).toBeGreaterThan(0);

		const report = await run(
			"a.ts",
			"import { readFile } from \"node:fs/promises\";\n"
		);

		expect(report.filename).toBe("a.ts");
		expect(report.findings.length).toBeGreaterThan(0);
	});
});
