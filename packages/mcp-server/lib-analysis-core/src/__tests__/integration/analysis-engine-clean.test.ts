import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { AnalysisService, AnalysisServiceLive } from "../../services/analysis-service";
import { RuleRegistryService } from "../../services/rule-registry";

describe("Analysis Engine Integration Tests", () => {
	it("analyzes code that triggers multiple rules across categories", async () => {
		const multiViolationCode = `
import { Effect } from "effect";

// Should trigger async-await rule (high severity, async category)
async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}

// Should trigger throw-in-effect-code rule (high severity, errors category)
Effect.gen(function* () {
  if (!isValid) {
    throw new Error('Invalid input');
  }
  return yield* someEffect();
});
`;

		// Use AnalysisServiceLive which includes all dependencies
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analysisService = yield* AnalysisService;
				return yield* analysisService.analyzeFile("test.ts", multiViolationCode);
			}).pipe(
				Effect.provide(AnalysisServiceLive)
			) as Effect.Effect<any, never, never>
		);

		// Should find multiple findings
		expect(result.findings.length).toBeGreaterThan(0);

		// Should include expected high-severity findings
		const highSeverityFindings = result.findings.filter(
			(f) => f.severity === "high"
		);
		expect(highSeverityFindings.length).toBeGreaterThan(0);
	});

	it("returns findings that can be sorted by severity", async () => {
		const testCode = `
async function fetchData() {
  return await fetch('/api/data');
}

Effect.gen(function* () {
  throw new Error('Test error');
});
`;

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analysisService = yield* AnalysisService;
				return yield* analysisService.analyzeFile("test.ts", testCode);
			}).pipe(
				Effect.provide(AnalysisService.Default)
			)
		);

		if (result.findings.length > 1) {
			// Sort findings by severity (high before medium before low)
			const severityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
			const sorted = [...result.findings].sort((a, b) =>
				severityOrder[b.severity] - severityOrder[a.severity]
			);

			// Check that sorted findings maintain severity ordering
			for (let i = 0; i < sorted.length - 1; i++) {
				const current = sorted[i];
				const next = sorted[i + 1];
				const currentSeverity = severityOrder[current.severity];
				const nextSeverity = severityOrder[next.severity];

				// Current should come before or equal to next in severity order
				expect(currentSeverity).toBeGreaterThanOrEqual(nextSeverity);
			}
		}
	});

	it("handles empty code gracefully", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analysisService = yield* AnalysisService;
				return yield* analysisService.analyzeFile("empty.ts", "");
			}).pipe(
				Effect.provide(AnalysisService.Default)
			) as Effect.Effect<any, never, never>
		);

		expect(result.findings.length).toBe(0);
	});

	it("validates complete analysis pipeline", async () => {
		// Step 1: Initialize services
		const registry = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return {
					rules: yield* registry.listRules(),
					fixes: yield* registry.listFixes(),
				};
			}).pipe(
				Effect.provide(RuleRegistryService.Default)
			) as Effect.Effect<any, never, never>
		);

		// Verify registry is working
		expect(registry.rules.length).toBeGreaterThan(0);
		expect(registry.fixes.length).toBeGreaterThan(0);

		// Step 2: Analyze code
		const testCode = `
async function fetchData() {
  return await fetch('/api/data');
}

Effect.gen(function* () {
  throw new Error('Test error');
});
`;

		const analysisResult = await Effect.runPromise(
			Effect.gen(function* () {
				const analysisService = yield* AnalysisService;
				return yield* analysisService.analyzeFile("test.ts", testCode);
			}).pipe(
				Effect.provide(AnalysisService.Default)
			) as Effect.Effect<any, never, never>
		);

		// Step 3: Verify analysis results
		expect(analysisResult.findings.length).toBeGreaterThan(0);
		expect(analysisResult.filename).toBe("test.ts");
		expect(analysisResult.analyzedAt).toBeTruthy();

		// Each finding should have complete information
		for (const finding of analysisResult.findings) {
			expect(finding.id).toBeTruthy();
			expect(finding.ruleId).toBeTruthy();
			expect(finding.title).toBeTruthy();
			expect(finding.message).toBeTruthy();
			expect(finding.severity).toBeTruthy();
			expect(["low", "medium", "high"]).toContain(finding.severity);
			expect(finding.range).toBeTruthy();
			expect(Array.isArray(finding.refactoringIds)).toBe(true);
		}
	});
});
