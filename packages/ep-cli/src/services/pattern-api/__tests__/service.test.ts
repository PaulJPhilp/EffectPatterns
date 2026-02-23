import { Effect } from "effect";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startFixtureServer, type FixtureServer } from "../../../test/fixture-server.js";
import { PatternApi } from "../service.js";

const SEARCH_FIXTURE = {
	count: 1,
	patterns: [
		{
			id: "retry-failed-operations",
			title: "Retry failed operations",
			description: "Description",
			category: "error-handling",
			difficulty: "beginner",
			tags: ["retry"],
			examples: [],
			useCases: ["resilience"],
			relatedPatterns: [],
		},
	],
};

const EMPTY_SEARCH = { count: 0, patterns: [] };

let server: FixtureServer;

const runPatternApi = <A>(effect: Effect.Effect<A, Error, PatternApi>) =>
	Effect.runPromise(effect.pipe(Effect.provide(PatternApi.Default)));

describe("PatternApi Service", () => {
	beforeAll(async () => {
		server = await startFixtureServer([
			{ path: "/api/patterns/retry-failed-operations", status: 200, body: { pattern: SEARCH_FIXTURE.patterns[0] } },
			{ path: "/api/patterns/missing-pattern", status: 404, body: "not found" },
			{ path: "/api/patterns", status: 200, body: SEARCH_FIXTURE },
		]);
	});

	afterAll(async () => {
		await server.close();
	});

	beforeEach(() => {
		delete process.env.PATTERN_API_KEY;
		delete process.env.EP_API_KEY_FILE;
		delete process.env.EP_CONFIG_FILE;
		delete process.env.XDG_CONFIG_HOME;
		delete process.env.EFFECT_PATTERNS_API_URL;
		delete process.env.EP_API_TIMEOUT_MS;
		server.requests.length = 0;
	});

	it("searches patterns through HTTP API with query params and auth header", async () => {
		process.env.EFFECT_PATTERNS_API_URL = server.url;
		process.env.PATTERN_API_KEY = "test-key";

		const results = await runPatternApi(
			Effect.gen(function* () {
				const api = yield* PatternApi;
				return yield* api.search({
					query: "retry",
					category: "error-handling",
					difficulty: "beginner",
					limit: 5,
				});
			})
		);

		expect(results).toHaveLength(1);
		expect(results[0]?.id).toBe("retry-failed-operations");

		// Verify the request was actually made with correct params
		expect(server.requests).toHaveLength(1);
		const req = server.requests[0]!;
		expect(req.url).toBe("/api/patterns?q=retry&category=error-handling&difficulty=beginner&limit=5");
		expect(req.headers["x-api-key"]).toBe("test-key");
		expect(req.headers.accept).toBe("application/json");
	});

	it("returns null for missing patterns", async () => {
		process.env.EFFECT_PATTERNS_API_URL = server.url;

		const result = await runPatternApi(
			Effect.gen(function* () {
				const api = yield* PatternApi;
				return yield* api.getById("missing-pattern");
			})
		);

		expect(result).toBeNull();
	});

	it("maps unauthorized responses to PATTERN_API_KEY guidance", async () => {
		// Start a separate server that always returns 401
		const authServer = await startFixtureServer([
			{ path: "/api/patterns", status: 401, body: "unauthorized" },
		]);

		try {
			process.env.EFFECT_PATTERNS_API_URL = authServer.url;

			await expect(
				runPatternApi(
					Effect.gen(function* () {
						const api = yield* PatternApi;
						return yield* api.search({ query: "retry" });
					})
				)
			).rejects.toThrow(/PATTERN_API_KEY/);
		} finally {
			await authServer.close();
		}
	});

	it("reads api key from EP_API_KEY_FILE when PATTERN_API_KEY is not set", async () => {
		process.env.EFFECT_PATTERNS_API_URL = server.url;
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ep-cli-api-key-file-"));
		const keyFile = path.join(tmpDir, "api-key.txt");
		await fs.writeFile(keyFile, "file-key\n", "utf8");
		process.env.EP_API_KEY_FILE = keyFile;

		await runPatternApi(
			Effect.gen(function* () {
				const api = yield* PatternApi;
				return yield* api.search({ query: "retry" });
			})
		);

		expect(server.requests).toHaveLength(1);
		expect(server.requests[0]!.headers["x-api-key"]).toBe("file-key");

		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it("prefers PATTERN_API_KEY over file-based key sources", async () => {
		process.env.EFFECT_PATTERNS_API_URL = server.url;
		process.env.PATTERN_API_KEY = "env-key";

		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ep-cli-api-key-precedence-"));
		const keyFile = path.join(tmpDir, "api-key.txt");
		await fs.writeFile(keyFile, "file-key\n", "utf8");
		process.env.EP_API_KEY_FILE = keyFile;

		await runPatternApi(
			Effect.gen(function* () {
				const api = yield* PatternApi;
				return yield* api.search({ query: "retry" });
			})
		);

		expect(server.requests).toHaveLength(1);
		expect(server.requests[0]!.headers["x-api-key"]).toBe("env-key");

		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it("reads api key from default XDG config when available", async () => {
		process.env.EFFECT_PATTERNS_API_URL = server.url;

		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ep-cli-api-key-config-"));
		const configHome = path.join(tmpDir, "config-home");
		const configDir = path.join(configHome, "ep-cli");
		await fs.mkdir(configDir, { recursive: true });
		await fs.writeFile(
			path.join(configDir, "config.json"),
			JSON.stringify({ apiKey: "config-key" }),
			"utf8"
		);
		process.env.XDG_CONFIG_HOME = configHome;

		await runPatternApi(
			Effect.gen(function* () {
				const api = yield* PatternApi;
				return yield* api.search({ query: "retry" });
			})
		);

		expect(server.requests).toHaveLength(1);
		expect(server.requests[0]!.headers["x-api-key"]).toBe("config-key");

		await fs.rm(tmpDir, { recursive: true, force: true });
	});
});
