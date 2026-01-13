import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { RuleRegistryService } from "./rule-registry";

describe("Rule registry API shape", () => {
	it("rules include fixIds array", async () => {
		const rules = await Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default), Effect.runPromise);

		expect(Array.isArray(rules)).toBe(true);
		expect(rules.some((r) => Array.isArray(r.fixIds))).toBe(true);
	});

	it("fixes have id/title/description", async () => {
		const fixes = await Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listFixes();
		}).pipe(Effect.provide(RuleRegistryService.Default), Effect.runPromise);

		expect(fixes.length).toBeGreaterThan(0);
		for (const fix of fixes) {
			expect(typeof fix.id).toBe("string");
			expect(typeof fix.title).toBe("string");
			expect(typeof fix.description).toBe("string");
		}
	});
});
