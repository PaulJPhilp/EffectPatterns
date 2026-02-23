import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PatternApiService } from "../../pattern-api/api.js";
import { PatternApi } from "../../pattern-api/index.js";
import type { InstalledRule } from "../api.js";
import { Install } from "../service.js";

const runInstall = <A>(
	effect: Effect.Effect<A, unknown, Install>,
	patternApiService: PatternApiService
) =>
	Effect.runPromise(
		effect.pipe(
			Effect.provide(Install.Default),
			Effect.provide(NodeFileSystem.layer),
			Effect.provide(Layer.succeed(PatternApi, patternApiService as any))
		)
	);

describe("Install Service", () => {
	const originalCwd = process.cwd();
	let tmpDir = "";

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ep-cli-install-"));
		process.chdir(tmpDir);
		process.env.EP_INSTALLED_STATE_FILE = path.join(tmpDir, ".ep-installed.test.json");
	});

	afterEach(async () => {
		delete process.env.EP_INSTALLED_STATE_FILE;
		process.chdir(originalCwd);
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it("searchRules maps API patterns to rules and filters by use case", async () => {
		const searchCalls: unknown[] = [];

		const rules = await runInstall(
			Install.searchRules({ skillLevel: "beginner", useCase: "resilience" }),
			{
				search: (params) => {
					searchCalls.push(params);
					return Effect.succeed([
						{
							id: "retry-failed-operations",
							title: "Retry failed operations",
							description: "Retry transient failures.",
							category: "error-handling",
							difficulty: "beginner",
							tags: ["retry"],
							useCases: ["resilience"],
						},
						{
							id: "layer-caching",
							title: "Layer caching",
							description: "Cache at layer boundary.",
							category: "concurrency",
							difficulty: "advanced",
							tags: ["cache"],
							useCases: ["performance"],
						},
					]);
				},
				getById: () => Effect.succeed(null),
			}
		);

		expect(searchCalls[0]).toEqual({
			query: undefined,
			difficulty: "beginner",
		});
		expect(rules).toEqual([
			{
				id: "retry-failed-operations",
				title: "Retry failed operations",
				description: "Retry transient failures.",
				skillLevel: "beginner",
				useCase: ["resilience"],
				content: "Retry transient failures.",
			},
		]);
	});

	it("fetchRule returns mapped rule and fails when missing", async () => {
		let getByIdCallCount = 0;

		const getById = () => {
			getByIdCallCount++;
			if (getByIdCallCount === 1) {
				return Effect.succeed({
					id: "retry-failed-operations",
					title: "Retry failed operations",
					description: "Retry transient failures.",
					category: "error-handling",
					difficulty: "intermediate",
					tags: ["retry"],
					useCases: ["resilience"],
				});
			}
			return Effect.succeed(null);
		};

		const api: PatternApiService = {
			search: () => Effect.succeed([]),
			getById,
		};

		const rule = await runInstall(
			Install.fetchRule("retry-failed-operations"),
			api
		);

		expect(rule.id).toBe("retry-failed-operations");
		expect(rule.skillLevel).toBe("intermediate");

		await expect(
			runInstall(Install.fetchRule("missing-rule"), api)
		).rejects.toThrow("Rule with id missing-rule not found");
	});

	it("saves and loads installed rules from local state file", async () => {
		const api: PatternApiService = {
			search: () => Effect.succeed([]),
			getById: () => Effect.succeed(null),
		};

		const installedRules: InstalledRule[] = [
			{
				id: "retry-failed-operations",
				title: "Retry failed operations",
				description: "Retry transient failures.",
				skillLevel: "beginner",
				useCase: ["resilience"],
				content: "Retry transient failures.",
				installedAt: "2026-02-11T00:00:00.000Z",
				tool: "cursor",
				version: "1.0.0",
			},
		];

		await runInstall(Install.saveInstalledRules(installedRules), api);

		const loaded = await runInstall(Install.loadInstalledRules(), api);

		expect(loaded).toEqual(installedRules);
	});
});
