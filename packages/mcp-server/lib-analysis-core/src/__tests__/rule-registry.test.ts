import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { RuleRegistryService } from "../services/rule-registry";

describe("RuleRegistryService", () => {
	it("lists governed rules", async () => {
		const rules = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		expect(rules.length).toBeGreaterThan(0);
		expect(rules.some((r) => r.id === "async-await")).toBe(true);
	});

	it("lists available fixes", async () => {
		const fixes = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listFixes();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		expect(fixes.length).toBeGreaterThan(0);
		expect(fixes.some((f) => f.id === "replace-node-fs")).toBe(true);
	});

	it("filters rules when config disables a rule", async () => {
		const rules = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules({
					rules: { "async-await": "off" },
				});
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		expect(rules.some((r) => r.id === "async-await")).toBe(false);
		expect(rules.some((r) => r.id === "node-fs")).toBe(true);
	});

	it("applies severity override from config", async () => {
		const rules = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules({
					rules: { "node-fs": ["error", { severity: "high" }] },
				});
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const nodeFs = rules.find((r) => r.id === "node-fs");
		expect(nodeFs).toBeDefined();
		expect(nodeFs?.severity).toBe("high");
	});

	it("returns all rules when config is empty", async () => {
		const allRules = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const rulesWithEmptyConfig = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules({});
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		expect(rulesWithEmptyConfig.length).toBe(allRules.length);
	});

	it("includes new anti-pattern rules", async () => {
		const rules = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		// Check for new Effect-specific correctness rules
		expect(rules.some((r) => r.id === "effect-run-promise-boundary")).toBe(true);
		expect(rules.some((r) => r.id === "throw-in-effect-pipeline")).toBe(true);
		expect(rules.some((r) => r.id === "swallow-failures-without-logging")).toBe(true);

		// Check for new concurrency rules
		expect(rules.some((r) => r.id === "fire-and-forget-fork")).toBe(true);
		expect(rules.some((r) => r.id === "unbounded-parallelism")).toBe(true);
		expect(rules.some((r) => r.id === "blocking-calls-in-effect")).toBe(true);

		// Check for new resource safety rules
		expect(rules.some((r) => r.id === "manual-resource-lifecycle")).toBe(true);
		expect(rules.some((r) => r.id === "leaking-scopes")).toBe(true);

		// Check for new platform boundary rules
		expect(rules.some((r) => r.id === "node-platform-in-shared-code")).toBe(true);

		// Check for new TypeScript hygiene rules
		expect(rules.some((r) => r.id === "any-type-usage")).toBe(true);
		expect(rules.some((r) => r.id === "non-null-assertions")).toBe(true);

		// Check for agent-friendly packaging rules
		expect(rules.some((r) => r.id === "duplicate-pattern-ids")).toBe(true);

		// Check for Top 10 Effect Correctness Anti-Patterns
		expect(rules.some((r) => r.id === "run-effect-outside-boundary")).toBe(true);
		expect(rules.some((r) => r.id === "yield-instead-of-yield-star")).toBe(true);
		expect(rules.some((r) => r.id === "throw-inside-effect-logic")).toBe(true);
		expect(rules.some((r) => r.id === "async-callbacks-in-effect-combinators")).toBe(true);
		expect(rules.some((r) => r.id === "or-die-outside-boundaries")).toBe(true);
		expect(rules.some((r) => r.id === "swallowing-errors-in-catchall")).toBe(true);
		expect(rules.some((r) => r.id === "effect-ignore-on-failable-effects")).toBe(true);
		expect(rules.some((r) => r.id === "try-catch-inside-effect-logic")).toBe(true);
		expect(rules.some((r) => r.id === "promise-apis-inside-effect-logic")).toBe(true);
		expect(rules.some((r) => r.id === "public-apis-returning-generic-error")).toBe(true);

		// Check for design smell detectors
		expect(rules.some((r) => r.id === "large-switch-statement")).toBe(true);

		// Check for error modeling anti-patterns
		expect(rules.some((r) => r.id === "error-as-public-type")).toBe(true);
		expect(rules.some((r) => r.id === "mixed-error-shapes")).toBe(true);
		expect(rules.some((r) => r.id === "convert-errors-to-strings-early")).toBe(true);
		expect(rules.some((r) => r.id === "catch-and-rethrow-generic")).toBe(true);
		expect(rules.some((r) => r.id === "catching-errors-too-early")).toBe(true);
		expect(rules.some((r) => r.id === "expected-states-as-errors")).toBe(true);
		expect(rules.some((r) => r.id === "exceptions-for-domain-errors")).toBe(true);
		expect(rules.some((r) => r.id === "error-tags-without-payloads")).toBe(true);
		expect(rules.some((r) => r.id === "overusing-unknown-error-channel")).toBe(true);
		expect(rules.some((r) => r.id === "logging-instead-of-modeling-errors")).toBe(true);

		// Check for domain modeling anti-patterns
		expect(rules.some((r) => r.id === "primitives-for-domain-concepts")).toBe(true);
		expect(rules.some((r) => r.id === "boolean-flags-controlling-behavior")).toBe(true);
		expect(rules.some((r) => r.id === "magic-string-domains")).toBe(true);
		expect(rules.some((r) => r.id === "objects-as-implicit-state-machines")).toBe(true);
		expect(rules.some((r) => r.id === "domain-logic-in-conditionals")).toBe(true);
		expect(rules.some((r) => r.id === "adhoc-error-semantics-in-domain")).toBe(true);
		expect(rules.some((r) => r.id === "overloaded-config-objects")).toBe(true);
		expect(rules.some((r) => r.id === "domain-ids-as-raw-strings")).toBe(true);
		expect(rules.some((r) => r.id === "time-as-number-or-date")).toBe(true);
		expect(rules.some((r) => r.id === "domain-meaning-from-file-structure")).toBe(true);

		// Check for concurrency anti-patterns
		expect(rules.some((r) => r.id === "unbounded-parallelism-effect-all")).toBe(true);
		expect(rules.some((r) => r.id === "fire-and-forget-forks")).toBe(true);
		expect(rules.some((r) => r.id === "forking-inside-loops")).toBe(true);
		expect(rules.some((r) => r.id === "racing-without-handling-losers")).toBe(true);
		expect(rules.some((r) => r.id === "blocking-calls-in-effect-logic")).toBe(true);
		expect(rules.some((r) => r.id === "promise-concurrency-in-effect")).toBe(true);
		expect(rules.some((r) => r.id === "ignoring-fiber-failures")).toBe(true);
		expect(rules.some((r) => r.id === "retrying-concurrently-without-limits")).toBe(true);
		expect(rules.some((r) => r.id === "shared-mutable-state-across-fibers")).toBe(true);
		expect(rules.some((r) => r.id === "timeouts-without-cancellation-awareness")).toBe(true);

		// Check for scope anti-patterns
		expect(rules.some((r) => r.id === "resources-without-acquire-release")).toBe(true);
		expect(rules.some((r) => r.id === "returning-resources-instead-of-effects")).toBe(true);
		expect(rules.some((r) => r.id === "creating-scopes-without-binding")).toBe(true);
		expect(rules.some((r) => r.id === "long-lived-resources-in-short-scopes")).toBe(true);
		expect(rules.some((r) => r.id === "global-singletons-instead-of-layers")).toBe(true);
		expect(rules.some((r) => r.id === "closing-resources-manually")).toBe(true);
		expect(rules.some((r) => r.id === "effect-run-with-open-resources")).toBe(true);
		expect(rules.some((r) => r.id === "nested-resource-acquisition")).toBe(true);
		expect(rules.some((r) => r.id === "using-scope-global-for-convenience")).toBe(true);
		expect(rules.some((r) => r.id === "forgetting-to-provide-layers")).toBe(true);
	});

	it("includes new fix definitions", async () => {
		const fixes = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listFixes();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		// Check for new fix definitions
		expect(fixes.some((f) => f.id === "add-concurrency-limit")).toBe(true);
		expect(fixes.some((f) => f.id === "add-fiber-supervision")).toBe(true);
		expect(fixes.some((f) => f.id === "replace-blocking-calls")).toBe(true);
		expect(fixes.some((f) => f.id === "use-acquire-release")).toBe(true);
		expect(fixes.some((f) => f.id === "replace-any-with-types")).toBe(true);

		// Check for Top 10 Effect Correctness Anti-Pattern fixes
		expect(fixes.some((f) => f.id === "replace-yield-with-yield-star")).toBe(true);
		expect(fixes.some((f) => f.id === "replace-throw-with-effect-fail")).toBe(true);
		expect(fixes.some((f) => f.id === "replace-async-callbacks-with-effect")).toBe(true);
		expect(fixes.some((f) => f.id === "remove-or-die-outside-boundaries")).toBe(true);
		expect(fixes.some((f) => f.id === "add-logging-to-catchall")).toBe(true);
		expect(fixes.some((f) => f.id === "replace-effect-ignore")).toBe(true);
		expect(fixes.some((f) => f.id === "replace-try-catch-with-effect-try")).toBe(true);
		expect(fixes.some((f) => f.id === "replace-promise-apis-with-effect")).toBe(true);
		expect(fixes.some((f) => f.id === "replace-generic-error-with-tagged")).toBe(true);

		// Check for design smell fixes
		expect(fixes.some((f) => f.id === "refactor-switch-to-tagged-union")).toBe(true);

		// Check for error modeling fixes
		expect(fixes.some((f) => f.id === "replace-error-with-tagged-type")).toBe(true);
		expect(fixes.some((f) => f.id === "normalize-error-shapes")).toBe(true);
		expect(fixes.some((f) => f.id === "preserve-error-structure")).toBe(true);
		expect(fixes.some((f) => f.id === "wrap-error-with-context")).toBe(true);
		expect(fixes.some((f) => f.id === "propagate-errors-upward")).toBe(true);
		expect(fixes.some((f) => f.id === "model-expected-states-as-data")).toBe(true);
		expect(fixes.some((f) => f.id === "use-effect-fail-for-domain-errors")).toBe(true);
		expect(fixes.some((f) => f.id === "add-error-payload-fields")).toBe(true);
		expect(fixes.some((f) => f.id === "narrow-unknown-error-type")).toBe(true);
		expect(fixes.some((f) => f.id === "structure-error-propagation")).toBe(true);

		// Check for domain modeling fixes
		expect(fixes.some((f) => f.id === "introduce-branded-types")).toBe(true);
		expect(fixes.some((f) => f.id === "replace-boolean-with-tagged-union")).toBe(true);
		expect(fixes.some((f) => f.id === "replace-magic-strings-with-union")).toBe(true);
		expect(fixes.some((f) => f.id === "model-explicit-state-machine")).toBe(true);
		expect(fixes.some((f) => f.id === "extract-domain-predicates")).toBe(true);
		expect(fixes.some((f) => f.id === "use-domain-specific-errors")).toBe(true);
		expect(fixes.some((f) => f.id === "structure-config-schema")).toBe(true);
		expect(fixes.some((f) => f.id === "introduce-branded-ids")).toBe(true);
		expect(fixes.some((f) => f.id === "use-duration-abstraction")).toBe(true);
		expect(fixes.some((f) => f.id === "encode-domain-in-types")).toBe(true);

		// Check for concurrency fixes
		expect(fixes.some((f) => f.id === "add-concurrency-limit-to-effect-all")).toBe(true);
		expect(fixes.some((f) => f.id === "add-fiber-supervision-or-join")).toBe(true);
		expect(fixes.some((f) => f.id === "replace-loop-fork-with-foreach")).toBe(true);
		expect(fixes.some((f) => f.id === "handle-race-interruption")).toBe(true);
		expect(fixes.some((f) => f.id === "offload-blocking-work")).toBe(true);
		expect(fixes.some((f) => f.id === "replace-promise-all-with-effect-all")).toBe(true);
		expect(fixes.some((f) => f.id === "observe-fiber-results")).toBe(true);
		expect(fixes.some((f) => f.id === "add-retry-coordination")).toBe(true);
		expect(fixes.some((f) => f.id === "use-ref-for-shared-state")).toBe(true);
		expect(fixes.some((f) => f.id === "ensure-cancellation-awareness")).toBe(true);

		// Check for scope fixes
		expect(fixes.some((f) => f.id === "wrap-with-acquire-release")).toBe(true);
		expect(fixes.some((f) => f.id === "return-scoped-effect")).toBe(true);
		expect(fixes.some((f) => f.id === "bind-scope-to-lifetime")).toBe(true);
		expect(fixes.some((f) => f.id === "move-resource-to-app-layer")).toBe(true);
		expect(fixes.some((f) => f.id === "convert-singleton-to-layer")).toBe(true);
		expect(fixes.some((f) => f.id === "remove-manual-close")).toBe(true);
		expect(fixes.some((f) => f.id === "scope-resources-before-run")).toBe(true);
		expect(fixes.some((f) => f.id === "flatten-resource-acquisition")).toBe(true);
		expect(fixes.some((f) => f.id === "use-explicit-scope")).toBe(true);
		expect(fixes.some((f) => f.id === "add-layer-provision")).toBe(true);
	});

	it("uses new rule categories", async () => {
		const rules = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const categories = new Set(rules.map((r) => r.category));

		// Check for new categories
		expect(categories.has("concurrency")).toBe(true);
		expect(categories.has("platform")).toBe(true);
		expect(categories.has("types")).toBe(true);

		// Original categories should still exist
		expect(categories.has("async")).toBe(true);
		expect(categories.has("errors")).toBe(true);
		expect(categories.has("style")).toBe(true);
	});
});
