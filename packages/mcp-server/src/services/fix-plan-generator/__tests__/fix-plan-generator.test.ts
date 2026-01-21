import { describe, it, expect } from "vitest";
import { FixPlanGeneratorService } from "../api";
import { Effect, Layer } from "effect";
import type { Finding, RuleDefinition, FixDefinition } from "../../../tools/schemas";
import { MCPConfigService } from "../../config";
import { MCPLoggerService } from "../../logger";

const TestLayer = Layer.provideMerge(
	FixPlanGeneratorService.Default,
	Layer.provideMerge(
		MCPLoggerService.Default,
		MCPConfigService.Default
	)
);

describe("FixPlanGeneratorService", () => {
	it("should generate a fix plan for an error category rule", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* FixPlanGeneratorService;

		const finding: Finding = {
			id: "test-1",
			range: {
				startLine: 1,
				endLine: 1,
				startChar: 0,
				endChar: 10,
			},
			message: "Generic error found",
			ruleId: "errors/avoid-generic-error",
			severity: "high",
		};

		const rule: RuleDefinition = {
			id: "errors/avoid-generic-error",
			title: "Avoid generic error",
			category: "errors",
			message: "Use domain-specific error types",
			enabled: true,
			severity: "high",
			fixIds: [],
		};

		const allFixes: FixDefinition[] = [];

		const res = yield* service.generate(finding, rule, allFixes);
		return res;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toHaveProperty("steps");
		expect(result).toHaveProperty("changes");
		expect(result).toHaveProperty("risks");
		expect(result.steps.length).toBeGreaterThan(0);
	});

	it("should handle generateFromInput", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* FixPlanGeneratorService;

		const input = {
			finding: {
				id: "test-2",
				range: {
					startLine: 5,
					endLine: 5,
					startChar: 0,
					endChar: 20,
				},
				message: "Validation issue",
				ruleId: "validation/missing-schema",
				severity: "medium" as const,
			},
			rule: {
				id: "validation/missing-schema",
				title: "Missing schema",
				category: "validation" as const,
				message: "Add validation schema",
				enabled: true,
				severity: "medium" as const,
				fixIds: [],
			},
			allFixes: [] as FixDefinition[],
		};

		const res = yield* service.generateFromInput(input);
		return res;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toHaveProperty("steps");
		expect(result).toHaveProperty("changes");
		expect(result).toHaveProperty("risks");
	});

	it("should generate fix plans for various error categories", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* FixPlanGeneratorService;

				const finding: Finding = {
					id: "test-4",
					range: {
						startLine: 10,
						endLine: 10,
						startChar: 0,
						endChar: 5,
					},
					message: "Style issue found",
					ruleId: "style/naming",
					severity: "low",
				};

				const rule: RuleDefinition = {
					id: "style/naming",
					title: "Naming convention",
					category: "style",
					message: "Use camelCase for variable names",
					enabled: true,
					severity: "low",
					fixIds: [],
				};

				const response = yield* service.generate(finding, rule, []);
				return response;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.steps).toBeDefined();
		expect(Array.isArray(result.steps)).toBe(true);
	});

	it("should include risks in fix plan", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* FixPlanGeneratorService;

				const finding: Finding = {
					id: "test-5",
					range: {
						startLine: 15,
						endLine: 15,
						startChar: 0,
						endChar: 10,
					},
					message: "Breaking change warning",
					ruleId: "performance/optimization",
					severity: "medium",
				};

				const rule: RuleDefinition = {
					id: "performance/optimization",
					title: "Performance optimization",
					category: "performance",
					message: "Consider performance implications",
					enabled: true,
					severity: "medium",
					fixIds: [],
				};

				const response = yield* service.generate(finding, rule, []);
				return response;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.risks).toBeDefined();
		expect(Array.isArray(result.risks)).toBe(true);
	});
});
