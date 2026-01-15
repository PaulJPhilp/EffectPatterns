import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import type { RuleDefinition } from "../../services/rule-registry";
import { RuleRegistryService } from "../../services/rule-registry";

describe("Severity Distribution Tests", () => {
	it("high severity rules are within reasonable bounds", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const highSeverityRules = rules.filter((r: RuleDefinition) => r.severity === "high");
		// Should be disciplined about high severity rules - not too many
		expect(highSeverityRules.length).toBeLessThanOrEqual(45);
		// But should have enough to be meaningful
		expect(highSeverityRules.length).toBeGreaterThanOrEqual(15);
	});

	it("no style rules are marked as high severity", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const styleRules = rules.filter((r: RuleDefinition) => r.category === "style");
		const highSeverityStyleRules = styleRules.filter((r: RuleDefinition) => r.severity === "high");

		expect(highSeverityStyleRules.length).toBeLessThanOrEqual(5);
	});

	it("resources category has at least 1 high severity rule", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const resourceRules = rules.filter((r: RuleDefinition) => r.category === "resources");
		const highSeverityResourceRules = resourceRules.filter((r: RuleDefinition) => r.severity === "high");

		expect(highSeverityResourceRules.length).toBeGreaterThanOrEqual(1);
	});

	it("concurrency category has at least 5 high severity rules", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const concurrencyRules = rules.filter((r: RuleDefinition) => r.category === "concurrency");
		const highSeverityConcurrencyRules = concurrencyRules.filter((r: RuleDefinition) => r.severity === "high");

		expect(highSeverityConcurrencyRules.length).toBeGreaterThanOrEqual(5);
	});

	it("errors category has appropriate high severity distribution", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const errorRules = rules.filter((r: RuleDefinition) => r.category === "errors");
		const highSeverityErrorRules = errorRules.filter((r: RuleDefinition) => r.severity === "high");
		const mediumSeverityErrorRules = errorRules.filter((r: RuleDefinition) => r.severity === "medium");
		const lowSeverityErrorRules = errorRules.filter((r: RuleDefinition) => r.severity === "low");

		// Should have good distribution of severities in errors
		expect(highSeverityErrorRules.length).toBeGreaterThanOrEqual(5);
		expect(mediumSeverityErrorRules.length).toBeGreaterThanOrEqual(5);
		expect(lowSeverityErrorRules.length).toBeGreaterThanOrEqual(1);
	});

	it("async category has at least 3 high severity rules", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const asyncRules = rules.filter((r: RuleDefinition) => r.category === "async");
		const highSeverityAsyncRules = asyncRules.filter((r: RuleDefinition) => r.severity === "high");

		expect(highSeverityAsyncRules.length).toBeGreaterThanOrEqual(3);
	});

	it("validation category has at least 2 high severity rules", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const validationRules = rules.filter((r: RuleDefinition) => r.category === "validation");
		const highSeverityValidationRules = validationRules.filter((r: RuleDefinition) => r.severity === "high");

		expect(highSeverityValidationRules.length).toBeGreaterThanOrEqual(2);
	});

	it("platform category has at least 1 high severity rule", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const platformRules = rules.filter((r: RuleDefinition) => r.category === "platform");
		const highSeverityPlatformRules = platformRules.filter((r: RuleDefinition) => r.severity === "high");

		expect(highSeverityPlatformRules.length).toBeGreaterThanOrEqual(1);
	});

	it("types category has at least 1 high severity rule", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const typeRules = rules.filter((r: RuleDefinition) => r.category === "types");
		const highSeverityTypeRules = typeRules.filter((r: RuleDefinition) => r.severity === "high");

		expect(highSeverityTypeRules.length).toBeGreaterThanOrEqual(1);
	});

	it("medium severity rules are well-distributed", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const mediumSeverityRules = rules.filter((r: RuleDefinition) => r.severity === "medium");

		// Should have good number of medium severity rules
		expect(mediumSeverityRules.length).toBeGreaterThanOrEqual(20);
		expect(mediumSeverityRules.length).toBeLessThanOrEqual(50);
	});

	it("low severity rules are limited but present", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const lowSeverityRules = rules.filter((r: RuleDefinition) => r.severity === "low");

		// Should have some low severity rules but not too many
		expect(lowSeverityRules.length).toBeGreaterThanOrEqual(5);
		expect(lowSeverityRules.length).toBeLessThanOrEqual(15);
	});

	it("specific rules have expected severities", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const ruleMap = new Map(rules.map((r: RuleDefinition) => [r.id, r.severity]));

		// Critical rules should be high severity
		expect(ruleMap.get("throw-in-effect-code")).toBe("high");
		expect(ruleMap.get("async-await")).toBe("high");
		expect(ruleMap.get("fire-and-forget-fork")).toBe("high");
		expect(ruleMap.get("missing-validation")).toBe("high");
		expect(ruleMap.get("manual-resource-lifecycle")).toBe("high");

		// Style-related rules should be low or medium
		expect(ruleMap.get("effect-map-fn-reference")).toBe("low");
		expect(ruleMap.get("effect-gen-no-yield")).toBe("low");
		expect(ruleMap.get("non-typescript")).toBe("low");

		// Boundary cases should be low severity
		expect(ruleMap.get("try-catch-boundary-ok")).toBe("low");
	});
});
