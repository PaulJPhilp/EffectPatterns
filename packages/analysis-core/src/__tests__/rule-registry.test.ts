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
});
