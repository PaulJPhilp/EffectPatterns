import { describe, it, expect } from "vitest";
import { FixPlanGeneratorService } from "../api";
import { Effect, Layer } from "effect";
import type { Finding, RuleDefinition, FixDefinition } from "../../../tools/schemas";
import { MCPConfigService } from "../../config";
import { MCPLoggerService } from "../../logger";
import { generateSteps, generateChanges, generateRisks } from "../helpers";

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

	it("should generate fix plan for async category", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* FixPlanGeneratorService;

				const finding: Finding = {
					id: "test-async",
					range: { startLine: 1, endLine: 1, startChar: 0, endChar: 10 },
					message: "Async/await found",
					ruleId: "async/avoid-async-await",
					severity: "medium",
				};

				const rule: RuleDefinition = {
					id: "async/avoid-async-await",
					title: "Avoid async/await",
					category: "async",
					message: "Use Effect composition",
					enabled: true,
					severity: "medium",
					fixIds: [],
				};

				return yield* service.generate(finding, rule, []);
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.steps.length).toBeGreaterThan(0);
		expect(result.steps.some(s => s.action.includes("Effect"))).toBe(true);
	});

	it("should generate fix plan for dependency-injection category", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* FixPlanGeneratorService;

				const finding: Finding = {
					id: "test-di",
					range: { startLine: 1, endLine: 1, startChar: 0, endChar: 10 },
					message: "Context.Tag found",
					ruleId: "dependency-injection/use-service",
					severity: "medium",
				};

				const rule: RuleDefinition = {
					id: "dependency-injection/use-service",
					title: "Use Effect.Service",
					category: "dependency-injection",
					message: "Migrate to Effect.Service",
					enabled: true,
					severity: "medium",
					fixIds: [],
				};

				return yield* service.generate(finding, rule, []);
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.steps.length).toBeGreaterThan(0);
		expect(result.steps.some(s => s.action.includes("Effect.Service"))).toBe(true);
	});

	it("should generate fix plan for resources category", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* FixPlanGeneratorService;

				const finding: Finding = {
					id: "test-resources",
					range: { startLine: 1, endLine: 1, startChar: 0, endChar: 10 },
					message: "Resource leak found",
					ruleId: "resources/use-acquire-release",
					severity: "high",
				};

				const rule: RuleDefinition = {
					id: "resources/use-acquire-release",
					title: "Use acquireRelease",
					category: "resources",
					message: "Use Effect.acquireRelease",
					enabled: true,
					severity: "high",
					fixIds: [],
				};

				return yield* service.generate(finding, rule, []);
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.steps.length).toBeGreaterThan(0);
		expect(result.steps.some(s => s.action.includes("acquireRelease"))).toBe(true);
	});

	it("should generate steps for errors category with generic rule", () => {
		const finding: Finding = {
			id: "test",
			range: { startLine: 1, endLine: 1, startChar: 0, endChar: 10 },
			message: "Generic error",
			ruleId: "errors/generic-error",
			severity: "high",
		};

		const rule: RuleDefinition = {
			id: "errors/generic-error",
			title: "Generic error",
			category: "errors",
			message: "Use TaggedError",
			enabled: true,
			severity: "high",
			fixIds: [],
		};

		const steps = generateSteps(finding, rule, []);
		expect(steps.length).toBeGreaterThan(0);
		// TaggedError is mentioned in the detail, not the action
		expect(steps.some(s => s.detail.includes("TaggedError"))).toBe(true);
	});

	it("should generate changes for multi-line findings", () => {
		const finding: Finding = {
			id: "test",
			range: { startLine: 1, endLine: 5, startChar: 0, endChar: 10 },
			message: "Multi-line issue",
			ruleId: "test/rule",
			severity: "medium",
		};

		const rule: RuleDefinition = {
			id: "test/rule",
			title: "Test rule",
			category: "other",
			message: "Test message",
			enabled: true,
			severity: "medium",
			fixIds: [],
		};

		const changes = generateChanges(finding, rule, []);
		expect(changes.length).toBeGreaterThan(0);
		expect(changes[0].scope).toContain("Multiple lines");
	});

	it("should generate risks for resources category", () => {
		const rule: RuleDefinition = {
			id: "resources/test",
			title: "Resource rule",
			category: "resources",
			message: "Test",
			enabled: true,
			severity: "high",
			fixIds: [],
		};

		const risks = generateRisks(rule);
		expect(risks.length).toBeGreaterThan(0);
		expect(risks.some(r => r.includes("cleanup"))).toBe(true);
	});

	it("should generate steps with fixes when available", () => {
		const finding: Finding = {
			id: "test",
			range: { startLine: 1, endLine: 1, startChar: 0, endChar: 10 },
			message: "Error",
			ruleId: "errors/non-generic",
			severity: "high",
		};

		const rule: RuleDefinition = {
			id: "errors/non-generic-error",
			title: "Non-generic error",
			category: "errors",
			message: "Fix error",
			enabled: true,
			severity: "high",
			fixIds: [],
		};

		const fixes: FixDefinition[] = [
			{
				id: "fix-1",
				title: "Fix 1",
				description: "Description 1",
				category: "errors",
			},
		];

		const steps = generateSteps(finding, rule, fixes);
		expect(steps.length).toBeGreaterThan(0);
		// Should generate steps for non-generic error category
		expect(steps.length).toBeGreaterThanOrEqual(2);
	});
});
