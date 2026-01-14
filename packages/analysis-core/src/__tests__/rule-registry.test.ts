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
});
