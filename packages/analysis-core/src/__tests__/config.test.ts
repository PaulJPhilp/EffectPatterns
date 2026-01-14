import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { parseConfigJson } from "../config/loader";
import { resolveConfig, applyConfigToRules } from "../config/service";
import type { RuleDefinition } from "../services/rule-registry";

const mockRules: RuleDefinition[] = [
	{
		id: "rule-1" as any,
		title: "Rule 1",
		message: "Message 1",
		severity: "medium",
		category: "style",
		fixIds: [],
	},
	{
		id: "rule-2" as any,
		title: "Rule 2",
		message: "Message 2",
		severity: "high",
		category: "errors",
		fixIds: [],
	},
];

describe("Config Module", () => {
	describe("loader", () => {
		it("parses valid config JSON", async () => {
			const json = JSON.stringify({
				extends: ["base"],
				ignore: ["**/test.ts"],
				include: ["src/**/*.ts"],
				rules: {
					"rule-1": "error",
					"rule-2": ["warn", { severity: "low" }],
				},
			});

			const result = await Effect.runPromise(parseConfigJson(json));
			expect(result.extends).toEqual(["base"]);
			expect(result.rules?.["rule-1"]).toBe("error");
		});

		it("fails on invalid JSON", async () => {
			const json = "{ invalid }";
			const result = await Effect.runPromiseExit(parseConfigJson(json));
			expect(result._tag).toBe("Failure");
		});

		it("fails if config is not an object", async () => {
			const json = "[]";
			const result = await Effect.runPromiseExit(parseConfigJson(json));
			expect(result._tag).toBe("Failure");
		});

		it("fails if extends is not a string array", async () => {
			const json = JSON.stringify({ extends: [1] });
			const result = await Effect.runPromiseExit(parseConfigJson(json));
			expect(result._tag).toBe("Failure");
		});

		it("fails if rules is not an object", async () => {
			const json = JSON.stringify({ rules: [] });
			const result = await Effect.runPromiseExit(parseConfigJson(json));
			expect(result._tag).toBe("Failure");
		});

		it("fails if rule config is invalid", async () => {
			const json = JSON.stringify({ rules: { "rule-1": 123 } });
			const result = await Effect.runPromiseExit(parseConfigJson(json));
			expect(result._tag).toBe("Failure");
		});
	});

	describe("service", () => {
		it("resolves default config when no config provided", () => {
			const resolved = resolveConfig(mockRules);
			expect(resolved.rules["rule-1" as any].enabled).toBe(true);
			expect(resolved.rules["rule-1" as any].severity).toBe("medium");
		});

		it("resolves rule with 'off' level", () => {
			const resolved = resolveConfig(mockRules, {
				rules: { "rule-1": "off" } as any,
			});
			expect(resolved.rules["rule-1" as any].enabled).toBe(false);
		});

		it("resolves rule with 'warn' level", () => {
			const resolved = resolveConfig(mockRules, {
				rules: { "rule-1": "warn" } as any,
			});
			expect(resolved.rules["rule-1" as any].enabled).toBe(true);
			expect(resolved.rules["rule-1" as any].severity).toBe("medium");
		});

		it("resolves rule with 'error' level", () => {
			const resolved = resolveConfig(mockRules, {
				rules: { "rule-1": "error" } as any,
			});
			expect(resolved.rules["rule-1" as any].enabled).toBe(true);
			expect(resolved.rules["rule-1" as any].severity).toBe("high");
		});

		it("resolves rule with overrides", () => {
			const resolved = resolveConfig(mockRules, {
				rules: { "rule-1": ["error", { severity: "low" }] } as any,
			});
			expect(resolved.rules["rule-1" as any].enabled).toBe(true);
			expect(resolved.rules["rule-1" as any].severity).toBe("low");
		});

		it("applies config to rules", () => {
			const filtered = applyConfigToRules(mockRules, {
				rules: { "rule-1": "off" } as any,
			});
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe("rule-2");
		});
	});
});
