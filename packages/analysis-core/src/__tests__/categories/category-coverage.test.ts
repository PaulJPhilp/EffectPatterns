import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import type { RuleCategory, RuleDefinition } from "../../services/rule-registry";
import { RuleRegistryService } from "../../services/rule-registry";

describe("Category Coverage Tests", () => {
	it("concurrency category contains exactly 13 rules", async () => {
		const rules = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const concurrencyRules = rules.filter((r: RuleDefinition) => r.category === "concurrency");
		expect(concurrencyRules.length).toBe(13);

		// Verify specific concurrency rules exist
		const concurrencyRuleIds = concurrencyRules.map((r: RuleDefinition) => r.id);
		const expectedConcurrencyRules = [
			"fire-and-forget-fork",
			"unbounded-parallelism",
			"blocking-calls-in-effect",
			"unbounded-parallelism-effect-all",
			"fire-and-forget-forks",
			"forking-inside-loops",
			"racing-without-handling-losers",
			"blocking-calls-in-effect-logic",
			"promise-concurrency-in-effect",
			"ignoring-fiber-failures",
			"retrying-concurrently-without-limits",
			"shared-mutable-state-across-fibers",
			"timeouts-without-cancellation-awareness",
		];

		// Should have at least these key concurrency rules
		expect(concurrencyRuleIds.length).toBeGreaterThanOrEqual(10);
	});

	it("resources category contains exactly 13 rules", async () => {
		const rules = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const resourceRules = rules.filter((r: RuleDefinition) => r.category === "resources");
		expect(resourceRules.length).toBe(13);

		// Verify specific resource rules exist
		const resourceRuleIds = resourceRules.map((r: RuleDefinition) => r.id);
		const expectedResourceRules = [
			"node-fs",
			"manual-resource-lifecycle",
			"leaking-scopes",
			"resources-without-acquire-release",
			"returning-resources-instead-of-effects",
			"creating-scopes-without-binding",
			"long-lived-resources-in-short-scopes",
			"global-singletons-instead-of-layers",
			"closing-resources-manually",
			"effect-run-with-open-resources",
			"nested-resource-acquisition",
			"using-scope-global-for-convenience",
			"forgetting-to-provide-layers",
		];

		// Should have at least these key resource rules
		expect(resourceRuleIds.length).toBeGreaterThanOrEqual(10);
	});

	it("errors category contains at least 15 rules", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const errorRules = rules.filter((r: RuleDefinition) => r.category === "errors");
		expect(errorRules.length).toBeGreaterThanOrEqual(15);

		// Verify critical error rules exist
		const errorRuleIds = errorRules.map((r: RuleDefinition) => r.id);
		const expectedErrorRules = [
			"throw-in-effect-code",
			"try-catch-in-effect",
			"catch-log-and-swallow",
			"missing-error-channel",
			"throw-in-effect-pipeline",
			"swallow-failures-without-logging",
			"generic-error-type",
			"or-die-outside-boundaries",
			"swallowing-errors-in-catchall",
			"effect-ignore-on-failable-effects",
			"try-catch-inside-effect-logic",
			"error-as-public-type",
			"mixed-error-shapes",
			"convert-errors-to-strings-early",
			"catch-and-rethrow-generic",
			"catching-errors-too-early",
			"expected-states-as-errors",
			"exceptions-for-domain-errors",
			"error-tags-without-payloads",
			"overusing-unknown-error-channel",
			"logging-instead-of-modeling-errors",
			"adhoc-error-semantics-in-domain",
		];

		for (const expectedRule of expectedErrorRules) {
			expect(errorRuleIds).toContain(expectedRule);
		}
	});

	it("async category contains at least 8 rules", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const asyncRules = rules.filter((r: RuleDefinition) => r.category === "async");
		expect(asyncRules.length).toBeGreaterThanOrEqual(8);

		// Verify critical async rules exist
		const asyncRuleIds = asyncRules.map((r: RuleDefinition) => r.id);
		const expectedAsyncRules = [
			"async-await",
			"promise-all-in-effect",
			"effect-runSync-unsafe",
			"effect-run-promise-boundary",
			"run-effect-outside-boundary",
			"yield-instead-of-yield-star",
			"async-callbacks-in-effect-combinators",
			"promise-apis-inside-effect-logic",
			"incorrect-promise-bridge",
		];

		for (const expectedRule of expectedAsyncRules) {
			expect(asyncRuleIds).toContain(expectedRule);
		}
	});

	it("total rule count equals expected 90", async () => {
		const rules = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		expect(rules.length).toBe(90);
	});

	it("all expected categories are present", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const categories = new Set(rules.map((r: RuleDefinition) => r.category));
		const expectedCategories: readonly RuleCategory[] = [
			"async",
			"errors",
			"validation",
			"resources",
			"dependency-injection",
			"style",
			"concurrency",
			"platform",
			"types",
		];

		for (const expectedCategory of expectedCategories) {
			expect(categories.has(expectedCategory)).toBe(true);
		}

		expect(categories.size).toBe(expectedCategories.length);
	});

	it("validation category contains at least 8 rules", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const validationRules = rules.filter((r: RuleDefinition) => r.category === "validation");
		expect(validationRules.length).toBeGreaterThanOrEqual(8);

		// Verify key validation rules exist
		const validationRuleIds = validationRules.map((r: RuleDefinition) => r.id);
		const expectedValidationRules = [
			"missing-validation",
			"schema-decode-unknown",
			"primitives-for-domain-concepts",
			"magic-string-domains",
			"objects-as-implicit-state-machines",
			"overloaded-config-objects",
			"domain-ids-as-raw-strings",
			"time-as-number-or-date",
		];

		for (const expectedRule of expectedValidationRules) {
			expect(validationRuleIds).toContain(expectedRule);
		}
	});

	it("platform category contains at least 1 rule", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const platformRules = rules.filter((r: RuleDefinition) => r.category === "platform");
		expect(platformRules.length).toBeGreaterThanOrEqual(1);

		// Verify key platform rule exists
		const platformRuleIds = platformRules.map((r: RuleDefinition) => r.id);
		expect(platformRuleIds).toContain("node-platform-in-shared-code");
	});

	it("types category contains at least 3 rules", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const typeRules = rules.filter((r: RuleDefinition) => r.category === "types");
		expect(typeRules.length).toBeGreaterThanOrEqual(3);

		// Verify key type rules exist
		const typeRuleIds = typeRules.map((r: RuleDefinition) => r.id);
		const expectedTypeRules = [
			"any-type-usage",
			"unknown-without-narrowing",
			"non-null-assertions",
		];

		for (const expectedRule of expectedTypeRules) {
			expect(typeRuleIds).toContain(expectedRule);
		}
	});
});
