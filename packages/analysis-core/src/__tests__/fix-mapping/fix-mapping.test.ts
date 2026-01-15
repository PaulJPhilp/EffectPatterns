import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import type { RuleDefinition, FixDefinition } from "../../services/rule-registry";
import { RuleRegistryService } from "../../services/rule-registry";

describe("Fix Mapping Tests", () => {
	it("every rule with fix references valid fix IDs", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const fixes = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listFixes();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const fixIds = new Set(fixes.map((f: FixDefinition) => f.id));

		// Check every rule's fixIds
		for (const rule of rules as RuleDefinition[]) {
			for (const fixId of rule.fixIds) {
				expect(fixIds.has(fixId)).toBe(true);
			}
		}
	});

	it("fix descriptions are non-empty", async () => {
		const fixes = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listFixes();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		for (const fix of fixes as FixDefinition[]) {
			expect(fix.description.trim().length).toBeGreaterThan(0);
			expect(fix.title.trim().length).toBeGreaterThan(0);
		}
	});

	it("fix categories roughly match rule categories", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const fixes = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listFixes();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		// Create mapping of fix IDs to the categories of rules that reference them
		const fixToCategories = new Map<string, Set<string>>();

		for (const rule of rules as RuleDefinition[]) {
			for (const fixId of rule.fixIds) {
				if (!fixToCategories.has(fixId)) {
					fixToCategories.set(fixId, new Set());
				}
				fixToCategories.get(fixId)!.add(rule.category);
			}
		}

		// Most fixes should be referenced by rules in similar categories
		for (const [fixId, categories] of fixToCategories.entries()) {
			const fix = fixes.find((f: FixDefinition) => f.id === fixId);
			expect(fix).toBeDefined();

			// If a fix is referenced by multiple categories, they should be related
			if (categories.size > 1) {
				// Allow some cross-category fixes, but they should be logical
				const categoryArray = Array.from(categories);

				// Common cross-category relationships that make sense
				const allowedCrossCategoryPairs = [
					["style", "types"],
					["style", "async"],
					["errors", "async"],
					["errors", "validation"],
					["resources", "platform"],
					["concurrency", "resources"],
				];

				const isAllowedCrossCategory = allowedCrossCategoryPairs.some(
					([cat1, cat2]) =>
						categoryArray.includes(cat1) && categoryArray.includes(cat2)
				);

				// If not an allowed cross-category pair, there should be a good reason
				if (!isAllowedCrossCategory && categories.size > 2) {
					// This is a warning - the fix might be too generic
					console.warn(`Fix ${fixId} referenced by many categories: ${Array.from(categories).join(", ")}`);
				}
			}
		}
	});

	it("critical rules have associated fixes", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		// High severity rules should generally have fixes
		const highSeverityRules = rules.filter((r: RuleDefinition) => r.severity === "high");
		const highSeverityRulesWithFixes = highSeverityRules.filter((r: RuleDefinition) => r.fixIds.length > 0);

		// At least 80% of high severity rules should have fixes
		const ratio = highSeverityRulesWithFixes.length / highSeverityRules.length;
		expect(ratio).toBeGreaterThanOrEqual(0.8);

		// Critical safety rules should definitely have fixes
		const criticalRuleIds = [
			"fire-and-forget-fork",
			"manual-resource-lifecycle",
			"throw-in-effect-code",
			"async-await",
			"missing-validation",
		];

		for (const ruleId of criticalRuleIds) {
			const rule = rules.find((r: RuleDefinition) => r.id === ruleId);
			expect(rule).toBeDefined();
			expect(rule!.fixIds.length).toBeGreaterThan(0);
		}
	});

	it("fix IDs follow consistent naming pattern", async () => {
		const fixes = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listFixes();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		for (const fix of fixes as FixDefinition[]) {
			// Fix IDs should be kebab-case
			expect(fix.id).toMatch(/^[a-z][a-z0-9-]*$/);
			expect(fix.id).not.toContain(" ");
			expect(fix.id).not.toContain("_");
			expect(fix.id).not.toContain("..");

			// Should start with a letter
			expect(fix.id[0]).toMatch(/[a-z]/);

			// Should be reasonable length
			expect(fix.id.length).toBeGreaterThanOrEqual(5);
			expect(fix.id.length).toBeLessThanOrEqual(50);
		}
	});

	it("fix titles are descriptive and action-oriented", async () => {
		const fixes = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listFixes();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		for (const fix of fixes as FixDefinition[]) {
			// Titles should be descriptive
			expect(fix.title.length).toBeGreaterThanOrEqual(10);
			expect(fix.title.length).toBeLessThanOrEqual(100);

			// Should be action-oriented (start with verb, include "add", "replace", "use", etc.)
			const actionWords = [
				"add",
				"replace",
				"use",
				"remove",
				"convert",
				"wrap",
				"extract",
				"introduce",
				"model",
				"structure",
				"normalize",
				"preserve",
				"handle",
				"ensure",
				"offload",
				"return",
				"bind",
				"move",
				"flatten",
				"scope",
				"provide",
			];

			const hasActionWord = actionWords.some((word) =>
				fix.title.toLowerCase().includes(word)
			);
			expect(hasActionWord).toBe(true);
		}
	});

	it("orphaned fixes do not exist", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const fixes = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listFixes();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		// All fixes should be referenced by at least one rule
		const referencedFixIds = new Set<string>();
		for (const rule of rules as RuleDefinition[]) {
			for (const fixId of rule.fixIds) {
				referencedFixIds.add(fixId);
			}
		}

		for (const fix of fixes as FixDefinition[]) {
			expect(referencedFixIds.has(fix.id)).toBe(true);
		}
	});

	it("fix descriptions provide useful guidance", async () => {
		const fixes = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listFixes();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		for (const fix of fixes as FixDefinition[]) {
			// Descriptions should be substantive
			expect(fix.description.length).toBeGreaterThanOrEqual(20);
			expect(fix.description.length).toBeLessThanOrEqual(300);

			// Should explain what the fix does
			const explanatoryWords = [
				"converts",
				"replaces",
				"adds",
				"removes",
				"wraps",
				"ensures",
				"uses",
				"moves",
				"flattens",
				"binds",
				"provides",
				"structures",
				"normalizes",
				"preserves",
				"handles",
				"extracts",
				"introduces",
				"models",
				"offloads",
				"returns",
				"scopes",
			];

			const hasExplanatoryWord = explanatoryWords.some((word) =>
				fix.description.toLowerCase().includes(word)
			);
			expect(hasExplanatoryWord).toBe(true);

			// Should not be just a repeat of the title
			expect(fix.description.toLowerCase()).not.toBe(fix.title.toLowerCase());
		}
	});

	it("fix mappings are logically consistent", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const fixes = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listFixes();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		// Check specific rule-fix mappings for logical consistency
		const expectedMappings = [
			{
				ruleId: "async-await",
				expectedFixIds: [], // This rule might not have automated fixes
			},
			{
				ruleId: "node-fs",
				expectedFixIds: ["replace-node-fs"],
			},
			{
				ruleId: "context-tag-anti-pattern",
				expectedFixIds: ["replace-context-tag"],
			},
			{
				ruleId: "promise-all-in-effect",
				expectedFixIds: ["replace-promise-all"],
			},
			{
				ruleId: "fire-and-forget-fork",
				expectedFixIds: ["add-fiber-supervision"],
			},
			{
				ruleId: "manual-resource-lifecycle",
				expectedFixIds: ["use-acquire-release"],
			},
		];

		for (const { ruleId, expectedFixIds } of expectedMappings) {
			const rule = rules.find((r: RuleDefinition) => r.id === ruleId);
			expect(rule).toBeDefined();

			if (expectedFixIds.length > 0) {
				for (const expectedFixId of expectedFixIds) {
					expect(rule!.fixIds).toContain(expectedFixId);
				}
			}
		}
	});
});
