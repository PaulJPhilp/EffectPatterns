import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import type { RuleDefinition, FixDefinition } from "../../services/rule-registry";
import { RuleRegistryService } from "../../services/rule-registry";

describe("Rule Registry Integrity Tests", () => {
	it("every rule ID has a definition with required fields", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		// Each rule must have all required fields
		for (const rule of rules as RuleDefinition[]) {
			expect(rule.id).toBeDefined();
			expect(rule.id).toBeTruthy();
			expect(typeof rule.id).toBe("string");

			expect(rule.title).toBeDefined();
			expect(rule.title).toBeTruthy();
			expect(typeof rule.title).toBe("string");

			expect(rule.message).toBeDefined();
			expect(rule.message).toBeTruthy();
			expect(typeof rule.message).toBe("string");

			expect(rule.severity).toBeDefined();
			expect(["low", "medium", "high"]).toContain(rule.severity);

			expect(rule.defaultLevel).toBeDefined();
			expect(["off", "warn", "error"]).toContain(rule.defaultLevel);

			expect(rule.category).toBeDefined();
			expect([
				"async",
				"errors",
				"validation",
				"resources",
				"dependency-injection",
				"style",
				"concurrency",
				"platform",
				"types",
			]).toContain(rule.category);

			expect(Array.isArray(rule.fixIds)).toBe(true);
		}
	});

	it("no duplicate rule IDs exist", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const ruleIds = rules.map((r: RuleDefinition) => r.id);
		const uniqueIds = new Set(ruleIds);

		expect(ruleIds.length).toBe(uniqueIds.size);
	});

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

		// Every fixId in every rule must exist in the fixes list
		for (const rule of rules as RuleDefinition[]) {
			for (const fixId of rule.fixIds) {
				expect(fixIds.has(fixId)).toBe(true);
			}
		}
	});

	it("no duplicate fix IDs exist", async () => {
		const fixes = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listFixes();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const fixIds = fixes.map((f: FixDefinition) => f.id);
		const uniqueIds = new Set(fixIds);

		expect(fixIds.length).toBe(uniqueIds.size);
	});

	it("every fix has required fields", async () => {
		const fixes = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listFixes();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		for (const fix of fixes as FixDefinition[]) {
			expect(fix.id).toBeDefined();
			expect(fix.id).toBeTruthy();
			expect(typeof fix.id).toBe("string");

			expect(fix.title).toBeDefined();
			expect(fix.title).toBeTruthy();
			expect(typeof fix.title).toBe("string");

			expect(fix.description).toBeDefined();
			expect(fix.description).toBeTruthy();
			expect(typeof fix.description).toBe("string");

			expect(["safe", "review", "risky"]).toContain(fix.safety);
			expect(["codemod", "assisted", "manual"]).toContain(fix.kind);
		}
	});

	it("all rule severities are valid", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const validSeverities = ["low", "medium", "high"];

		for (const rule of rules as RuleDefinition[]) {
			expect(validSeverities).toContain(rule.severity);
		}
	});

	it("all rule categories are valid", async () => {
		const rules = await Effect.runPromise(Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		const validCategories = [
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

		for (const rule of rules as RuleDefinition[]) {
			expect(validCategories).toContain(rule.category);
		}
	});
});
