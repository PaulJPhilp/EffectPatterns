import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { RuleRegistryService } from "./rule-registry";

describe("RuleRegistryService", () => {
	it("lists rules", async () => {
		const result = await Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listRules();
		}).pipe(Effect.provide(RuleRegistryService.Default), Effect.runPromise);

		expect(result.length).toBeGreaterThan(0);
		expect(result.map((r) => r.id)).toContain("async-await");
		expect(result.map((r) => r.id)).toContain("node-fs");
	});

	it("lists fixes", async () => {
		const result = await Effect.gen(function* () {
			const registry = yield* RuleRegistryService;
			return yield* registry.listFixes();
		}).pipe(Effect.provide(RuleRegistryService.Default), Effect.runPromise);

		expect(result.length).toBeGreaterThan(0);
		expect(result.map((f) => f.id)).toContain("replace-node-fs");
	});
});
