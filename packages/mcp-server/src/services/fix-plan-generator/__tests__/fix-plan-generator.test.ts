import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import type { Finding, FixDefinition, RuleDefinition } from "../../../tools/schemas";
import { MCPConfigService } from "../../config";
import { MCPLoggerService } from "../../logger";
import { FixPlanGeneratorService } from "../api";
import { generateChanges, generateRisks, generateSteps } from "../helpers";

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
			title: "Avoid generic error",
			range: {
				startLine: 1,
				startCol: 0,
				endLine: 1,
				endCol: 10,
			},
			message: "Generic error found",
			ruleId: "async-await",
			severity: "high",
			refactoringIds: [],
		};

		const rule: RuleDefinition = {
			id: "async-await",
			title: "Avoid generic error",
			category: "async",
			message: "Use domain-specific error types",
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
				title: "Missing validation",
				range: {
					startLine: 5,
					startCol: 0,
					endLine: 5,
					endCol: 20,
				},
				message: "Validation issue",
				ruleId: "missing-validation" as const,
				severity: "medium" as const,
				refactoringIds: [],
			},
			rule: {
				id: "missing-validation" as const,
				title: "Missing schema",
				category: "validation" as const,
				message: "Add validation schema",
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
					title: "Naming convention",
					range: {
						startLine: 10,
						startCol: 0,
						endLine: 10,
						endCol: 5,
					},
					message: "Style issue found",
					ruleId: "any-type",
					severity: "low",
					refactoringIds: [],
				};

				const rule: RuleDefinition = {
					id: "any-type",
					title: "Naming convention",
					category: "style",
					message: "Use camelCase for variable names",
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
					title: "Performance optimization",
					range: {
						startLine: 15,
						startCol: 0,
						endLine: 15,
						endCol: 10,
					},
					message: "Breaking change warning",
					ruleId: "async-await",
					severity: "medium",
					refactoringIds: [],
				};

				const rule: RuleDefinition = {
					id: "async-await",
					title: "Performance optimization",
					category: "async",
					message: "Consider performance implications",
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
					title: "Async/await found",
					range: { startLine: 1, startCol: 0, endLine: 1, endCol: 10 },
					message: "Async/await found",
					ruleId: "async-await",
					severity: "medium",
					refactoringIds: [],
				};

				const rule: RuleDefinition = {
					id: "async-await",
					title: "Avoid async/await",
					category: "async",
					message: "Use Effect composition",
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
					title: "Context.Tag found",
					range: { startLine: 1, startCol: 0, endLine: 1, endCol: 10 },
					message: "Context.Tag found",
					ruleId: "context-tag-anti-pattern",
					severity: "medium",
					refactoringIds: [],
				};

				const rule: RuleDefinition = {
					id: "context-tag-anti-pattern",
					title: "Use Effect.Service",
					category: "dependency-injection",
					message: "Migrate to Effect.Service",
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
					title: "Resource leak found",
					range: { startLine: 1, startCol: 0, endLine: 1, endCol: 10 },
					message: "Resource leak found",
					ruleId: "node-fs",
					severity: "high",
					refactoringIds: [],
				};

				const rule: RuleDefinition = {
					id: "node-fs",
					title: "Use acquireRelease",
					category: "resources",
					message: "Use Effect.acquireRelease",
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
			title: "Generic error",
			range: { startLine: 1, startCol: 0, endLine: 1, endCol: 10 },
			message: "Generic error",
			ruleId: "generic-throw" as any,
			severity: "high",
			refactoringIds: [],
		};

		const rule: RuleDefinition = {
			id: "generic-throw" as any,
			title: "Generic error",
			category: "errors",
			message: "Use TaggedError",
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
			title: "Multi-line issue",
			range: { startLine: 1, startCol: 0, endLine: 5, endCol: 10 },
			message: "Multi-line issue",
			ruleId: "async-await",
			severity: "medium",
			refactoringIds: [],
		};

		const rule: RuleDefinition = {
			id: "style-issue" as any,
			title: "Test rule",
			category: "other" as any,
			message: "Test message",
			severity: "medium" as const,
			fixIds: [],
		};

		const changes = generateChanges(finding, rule, []);
		expect(changes.length).toBeGreaterThan(0);
		expect(changes[0].scope).toContain("Multiple lines");
	});

	it("should generate risks for resources category", () => {
		const rule: RuleDefinition = {
			id: "node-fs",
			title: "Resource rule",
			category: "resources",
			message: "Test",
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
			title: "Error",
			range: { startLine: 1, startCol: 0, endLine: 1, endCol: 10 },
			message: "Error",
			ruleId: "async-await",
			severity: "high",
			refactoringIds: [],
		};

		const rule: RuleDefinition = {
			id: "async-await",
			title: "Non-generic error",
			category: "async",
			message: "Fix error",
			severity: "high",
			fixIds: [],
		};

		const fixes: FixDefinition[] = [
			{
				id: "replace-node-fs",
				title: "Fix 1",
				description: "Description 1",
			},
		];

		const steps = generateSteps(finding, rule, fixes);
		expect(steps.length).toBeGreaterThan(0);
		// Should generate steps for non-generic error category
		expect(steps.length).toBeGreaterThanOrEqual(2);
	});
});
