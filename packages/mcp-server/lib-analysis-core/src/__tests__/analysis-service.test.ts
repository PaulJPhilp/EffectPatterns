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
		const source = "import fs from \"node:fs\";\n";
		const changes = await Effect.runPromise(
			Effect.gen(function* () {
				const analysis = yield* AnalysisService;
				return yield* analysis.applyRefactorings(
					["replace-node-fs"],
					[{ filename: "a.ts", source }]
				);
			}).pipe(Effect.provide(AnalysisService.Default))
		);

		expect(changes).toHaveLength(1);
		expect(changes[0].after).toContain("@effect/platform");
	});

	it("analyzeConsistency detects cross-file issues", async () => {
		const files = [
			{ filename: "a.ts", source: "import fs from \"node:fs\";" },
			{ filename: "b.ts", source: "import { FileSystem } from \"@effect/platform\";" },
		];

		const issues = await Effect.runPromise(
			Effect.gen(function* () {
				const analysis = yield* AnalysisService;
				return yield* analysis.analyzeConsistency(files);
			}).pipe(Effect.provide(AnalysisService.Default))
		);

		expect(issues).toHaveLength(1);
		expect(issues[0].id).toBe("mixed-fs");
	});

	it("generateFix returns empty for unknown rule", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analysis = yield* AnalysisService;
				return yield* analysis.generateFix({
					ruleId: "unknown-rule" as any,
					filename: "a.ts",
					source: "const x = 1;",
				});
			}).pipe(Effect.provide(AnalysisService.Default))
		);

		expect(result.changes).toHaveLength(0);
	});
});
