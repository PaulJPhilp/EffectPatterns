import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { CodeAnalyzerService } from "../services/code-analyzer";

describe("Scope Anti-Patterns Detection", () => {
	it("detects manual resource closing", async () => {
		const violatingCode = `
import { Effect } from "effect";

const badExample = Effect.gen(function* () {
	const conn = yield* Effect.sync(() => createConnection());
	const result = yield* Effect.sync(() => conn.query("SELECT * FROM users"));
	yield* Effect.sync(() => conn.close()); // Manual close
	return result;
});
		`;

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source: violatingCode,
					filename: "test.ts",
					analysisType: "all",
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		// Should detect the manual close anti-pattern
		expect(result.findings.some((f: any) =>
			f.ruleId === "closing-resources-manually"
		)).toBe(true);

		// Verify the finding has the expected properties
		const finding = result.findings.find((f: any) => f.ruleId === "closing-resources-manually");
		expect(finding).toBeDefined();
		expect(finding?.severity).toBe("medium");
		expect(finding?.title).toContain("Closing");
	});

	it("detects global singleton pattern", async () => {
		const violatingCode = `
import { Effect } from "effect";

const httpClient = new HttpClient({ baseURL: "https://api.example.com" });

export const fetchUser = (id: string) => 
	Effect.tryPromise(() => httpClient.get(\`/users/\${id}\`));
		`;

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source: violatingCode,
					filename: "test.ts",
					analysisType: "all",
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		// Should detect the global singleton anti-pattern
		expect(result.findings.some((f: any) =>
			f.ruleId === "global-singletons-instead-of-layers"
		)).toBe(true);

		const finding = result.findings.find((f: any) => f.ruleId === "global-singletons-instead-of-layers");
		expect(finding).toBeDefined();
		expect(finding?.severity).toBe("medium");
	});

	it("detects Effect.succeed wrapping resources", async () => {
		const violatingCode = `
import { Effect } from "effect";

const getConnection = () => Effect.gen(function* () {
	const conn = yield* Effect.sync(() => createConnection());
	return Effect.succeed(conn); // Returns raw resource
});
		`;

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source: violatingCode,
					filename: "test.ts",
					analysisType: "all",
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		// Should detect the Effect.succeed wrapping resource anti-pattern
		expect(result.findings.some((f: any) =>
			f.ruleId === "returning-resources-instead-of-effects"
		)).toBe(true);

		const finding = result.findings.find((f: any) => f.ruleId === "returning-resources-instead-of-effects");
		expect(finding).toBeDefined();
		expect(finding?.severity).toBe("high");
	});

	it("detects Scope.global usage", async () => {
		const violatingCode = `
import { Effect } from "effect";

const badExample = Effect.gen(function* () {
	const scope = Scope.global(); // Convenience usage
	// ... some logic
});
		`;

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source: violatingCode,
					filename: "test.ts",
					analysisType: "all",
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		// Should detect the Scope.global anti-pattern
		expect(result.findings.some((f: any) =>
			f.ruleId === "using-scope-global-for-convenience"
		)).toBe(true);

		const finding = result.findings.find((f: any) => f.ruleId === "using-scope-global-for-convenience");
		expect(finding).toBeDefined();
		expect(finding?.severity).toBe("medium");
	});

	it("does not detect anti-patterns in good code", async () => {
		const goodCode = `
import { Effect } from "effect";

class HttpClientService extends Effect.Service<HttpClientService>()(
	"HttpClientService",
	{
		scoped: Effect.gen(function* () {
			const client = yield* Effect.acquireRelease(
				Effect.sync(() => new HttpClient({ baseURL: "https://api.example.com" })),
				(client) => Effect.sync(() => client.close())
			);
			return {
				get: (path: string) => Effect.tryPromise(() => client.get(path))
			};
		})
	}
) {}

export const fetchUser = (id: string) => Effect.gen(function* () {
	const http = yield* HttpClientService;
	return yield* http.get(\`/users/\${id}\`);
});
		`;

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source: goodCode,
					filename: "test.ts",
					analysisType: "all",
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		// Should not detect scope anti-patterns in good code
		const scopeAntiPatterns = [
			"closing-resources-manually",
			"global-singletons-instead-of-layers",
			"returning-resources-instead-of-effects",
			"using-scope-global-for-convenience",
			"effect-run-with-open-resources",
			"nested-resource-acquisition",
		];

		scopeAntiPatterns.forEach((ruleId) => {
			expect(result.findings.some((f: any) => f.ruleId === ruleId)).toBe(false);
		});
	});

	it("detects multiple scope anti-patterns in complex code", async () => {
		const complexCode = `
import { Effect } from "effect";

const httpClient = new HttpClient({ baseURL: "https://api.example.com" });

const getConnection = () => Effect.gen(function* () {
	const conn = yield* Effect.sync(() => createConnection());
	return Effect.succeed(conn);
});

const badExample = Effect.gen(function* () {
	const scope = Scope.global();
	const conn = yield* getConnection();
	yield* Effect.sync(() => conn.close());
	return yield* Effect.runPromise(
		Effect.sync(() => httpClient.get("/users"))
	);
});
		`;

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const analyzer = yield* CodeAnalyzerService;
				return yield* analyzer.analyze({
					source: complexCode,
					filename: "test.ts",
					analysisType: "all",
				});
			}).pipe(Effect.provide(CodeAnalyzerService.Default))
		);

		// Should detect multiple anti-patterns
		const detectedPatterns = result.findings.map((f: any) => f.ruleId);

		expect(detectedPatterns).toContain("global-singletons-instead-of-layers");
		expect(detectedPatterns).toContain("returning-resources-instead-of-effects");
		expect(detectedPatterns).toContain("closing-resources-manually");
		expect(detectedPatterns).toContain("using-scope-global-for-convenience");

		// Should have at least 4 findings
		const scopeFindings = result.findings.filter((f: any) =>
			[
				"closing-resources-manually",
				"global-singletons-instead-of-layers",
				"returning-resources-instead-of-effects",
				"using-scope-global-for-convenience",
				"effect-run-with-open-resources",
				"nested-resource-acquisition"
			].includes(f.ruleId)
		);

		expect(scopeFindings.length).toBeGreaterThanOrEqual(4);
	});
});
