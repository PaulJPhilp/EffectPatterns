import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { parseConfigJson } from "../config/loader";
import { applyConfigToRules, resolveConfig } from "../config/service";
import type { RuleDefinition } from "../services/rule-registry";

const mockRules: RuleDefinition[] = [
	{
		id: "async-await",
		title: "Async/Await Usage",
		message: "Use Effect instead of async/await",
		severity: "medium",
		defaultLevel: "warn",
		category: "async",
		fixIds: [],
	},
	{
		id: "node-fs",
		title: "Node.js File System",
		message: "Use @effect/platform FileSystem instead",
		severity: "high",
		defaultLevel: "error",
		category: "resources",
		fixIds: [],
	},
];

describe("Config Module", () => {
	describe("loader", () => {
		it("parses valid config JSON", async () => {
			const json = JSON.stringify({
				ignore: ["**/test.ts"],
				include: ["src/**/*.ts"],
				rules: {
					"async-await": "error",
					"node-fs": ["warn", { severity: "low" }],
				},
			});

			const result = await Effect.runPromise(parseConfigJson(json));
			expect(result.ignore).toEqual(["**/test.ts"]);
			expect(result.rules?.["async-await"]).toBe("error");
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

		it("fails if ignore is not a string array", async () => {
			const json = JSON.stringify({ ignore: [1] });
			const result = await Effect.runPromiseExit(parseConfigJson(json));
			expect(result._tag).toBe("Failure");
		});

		it("fails if rules is not an object", async () => {
			const json = JSON.stringify({ rules: [] });
			const result = await Effect.runPromiseExit(parseConfigJson(json));
			expect(result._tag).toBe("Failure");
		});

		it("fails if rule config is invalid", async () => {
			const json = JSON.stringify({ rules: { "async-await": 123 } });
			const result = await Effect.runPromiseExit(parseConfigJson(json));
			expect(result._tag).toBe("Failure");
		});
	});

	describe("service", () => {
		it("resolves default config when no config provided", () => {
			const resolved = resolveConfig(mockRules);
			expect(resolved.rules["async-await"].level).toBe("warn");
			expect(resolved.rules["async-await"].severity).toBe("medium");
		});

		it("resolves rule with 'off' level", () => {
			const resolved = resolveConfig(mockRules, {
				rules: { "async-await": "off" },
			});
			expect(resolved.rules["async-await"].level).toBe("off");
		});

		it("resolves rule with 'warn' level", () => {
			const resolved = resolveConfig(mockRules, {
				rules: { "async-await": "warn" },
			});
			expect(resolved.rules["async-await"].level).toBe("warn");
			expect(resolved.rules["async-await"].severity).toBe("medium");
		});

		it("resolves rule with 'error' level", () => {
			const resolved = resolveConfig(mockRules, {
				rules: { "async-await": "error" },
			});
			expect(resolved.rules["async-await"].level).toBe("error");
			expect(resolved.rules["async-await"].severity).toBe("medium");
		});

		it("resolves rule with overrides", () => {
			const resolved = resolveConfig(mockRules, {
				rules: { "async-await": ["error", { severity: "low" }] },
			});
			expect(resolved.rules["async-await"].level).toBe("error");
			expect(resolved.rules["async-await"].severity).toBe("low");
		});

		it("applies config to rules", () => {
			const filtered = applyConfigToRules(mockRules, {
				rules: { "async-await": "off" },
			});
			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe("node-fs");
		});
	});
});
