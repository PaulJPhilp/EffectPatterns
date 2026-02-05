import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import type { Finding, RuleDefinition } from "../../../tools/schemas";
import { MCPConfigService } from "../../config";
import { MCPLoggerService } from "../../logger";
import { ConfidenceCalculatorService } from "../api";

const TestLayer = Layer.provideMerge(
	ConfidenceCalculatorService.Default,
	Layer.provideMerge(
		MCPLoggerService.Default,
		MCPConfigService.Default
	)
);

describe("ConfidenceCalculatorService", () => {
	it("should calculate confidence score for a finding", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* ConfidenceCalculatorService;
		
		const finding: Finding = {
			id: "test-1",
			title: "Test finding",
			range: {
				startLine: 5,
				startCol: 10,
				endLine: 5,
				endCol: 20,
			},
			message: "Test finding",
			ruleId: "async-await",
			severity: "high",
			refactoringIds: [],
		};

		const rule: RuleDefinition = {
			id: "async-await",
			title: "Test Rule",
			category: "async",
			message: "Test error pattern",
			severity: "high",
			fixIds: [],
		};

		const sourceCode = `
function test() {
	if (true) {
		const x = 1;
		const y = x + 1;
	}
}
`;

		const response = yield* service.calculate(finding, sourceCode, rule);

		return response;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.level).toBeDefined();
		expect(result.score).toBeGreaterThanOrEqual(0);
		expect(result.score).toBeLessThanOrEqual(1);
		expect(result.factors).toBeInstanceOf(Array);
	});

	it("should handle calculateFromInput", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* ConfidenceCalculatorService;
		
		const input = {
			finding: {
				id: "test-2",
				title: "Test",
				range: {
					startLine: 1,
					startCol: 0,
					endLine: 1,
					endCol: 10,
				},
				message: "Test",
				ruleId: "async-await" as const,
				severity: "medium" as const,
				refactoringIds: [],
			},
			sourceCode: "const x = 1;",
			rule: {
				id: "async-await" as const,
				title: "Test",
				category: "async" as const,
				message: "Test rule",
				severity: "medium" as const,
				fixIds: [],
			},
		};

		const response = yield* service.calculateFromInput(input);
		return response;
			}).pipe(Effect.provide(TestLayer))
		);
		
		expect(result).toHaveProperty("level");
		expect(result).toHaveProperty("score");
		expect(result).toHaveProperty("factors");
	});
});
