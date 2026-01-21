import { describe, it, expect } from "vitest";
import { ConfidenceCalculatorService } from "../api";
import { Effect, Layer } from "effect";
import type { Finding, RuleDefinition } from "../../../tools/schemas";
import { MCPConfigService } from "../../config";
import { MCPLoggerService } from "../../logger";

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
			range: {
				startLine: 5,
				endLine: 5,
				startChar: 10,
				endChar: 20,
			},
			message: "Test finding",
			ruleId: "test-rule",
			severity: "error",
		};

		const rule: RuleDefinition = {
			id: "test-rule",
			name: "Test Rule",
			category: "errors",
			message: "Test error pattern",
			enabled: true,
			severity: "error",
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
				range: {
					startLine: 1,
					endLine: 1,
					startChar: 0,
					endChar: 10,
				},
				message: "Test",
				ruleId: "test",
				severity: "warning" as const,
			},
			sourceCode: "const x = 1;",
			rule: {
				id: "test",
				name: "Test",
				category: "style",
				message: "Test rule",
				enabled: true,
				severity: "warning" as const,
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
