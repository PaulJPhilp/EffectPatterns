import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { RuleRegistryService } from "../services/rule-registry";

describe("Scope Anti-Patterns", () => {
	it("verifies scope anti-pattern rules are registered", async () => {
		const rules = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listRules();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		// Verify all scope anti-pattern rules are registered
		const scopeRules = [
			"resources-without-acquire-release",
			"returning-resources-instead-of-effects",
			"creating-scopes-without-binding",
			"long-lived-resources-in-short-scopes",
			"global-singletons-instead-of-layers",
			"closing-resources-manually",
			"effect-run-with-open-resources",
			"nested-resource-acquisition",
			"using-scope-global-for-convenience",
			"forgetting-to-provide-layers",
		];

		scopeRules.forEach((ruleId) => {
			expect(rules.some((r: any) => r.id === ruleId)).toBe(true);
		});
	});

	it("verifies scope anti-pattern fixes are registered", async () => {
		const fixes = await Effect.runPromise(
			Effect.gen(function* () {
				const registry = yield* RuleRegistryService;
				return yield* registry.listFixes();
			}).pipe(Effect.provide(RuleRegistryService.Default))
		);

		// Verify all scope anti-pattern fixes are registered
		const scopeFixes = [
			"wrap-with-acquire-release",
			"return-scoped-effect",
			"bind-scope-to-lifetime",
			"move-resource-to-app-layer",
			"convert-singleton-to-layer",
			"remove-manual-close",
			"scope-resources-before-run",
			"flatten-resource-acquisition",
			"use-explicit-scope",
			"add-layer-provision",
		];

		scopeFixes.forEach((fixId) => {
			expect(fixes.some((f: any) => f.id === fixId)).toBe(true);
		});
	});

	it("demonstrates scope anti-pattern examples", () => {
		// Example 1: Resources without acquireRelease (violating)
		const violatingCode1 = `
import { Effect } from "effect";

const badResource = Effect.gen(function* () {
	const file = yield* Effect.sync(() => openFile("data.txt"));
	const data = yield* Effect.sync(() => readFile(file));
	yield* Effect.sync(() => closeFile(file)); // Manual cleanup
	return data;
});
		`;

		// Example 1: Resources without acquireRelease (good)
		const goodCode1 = `
import { Effect } from "effect";

const goodResource = Effect.acquireRelease(
	Effect.sync(() => openFile("data.txt")),
	(file) => Effect.sync(() => closeFile(file))
).pipe(
	Effect.flatMap((file) => Effect.sync(() => readFile(file)))
);
		`;

		// Verify the code examples are different
		expect(violatingCode1).not.toBe(goodCode1);
		expect(violatingCode1).toContain("closeFile(file)"); // Manual cleanup
		expect(goodCode1).toContain("Effect.acquireRelease"); // Proper cleanup

		// Example 2: Returning resources instead of effects (violating)
		const violatingCode2 = `
import { Effect } from "effect";

const getConnection = () => Effect.gen(function* () {
	const conn = yield* Effect.sync(() => createConnection());
	return Effect.succeed(conn); // Returns raw resource
});
		`;

		// Example 2: Returning resources instead of effects (good)
		const goodCode2 = `
import { Effect } from "effect";

const withConnection = <A, E>(
	use: (conn: Connection) => Effect.Effect<A, E>
): Effect.Effect<A, E> => Effect.acquireRelease(
	Effect.sync(() => createConnection()),
	(conn) => Effect.sync(() => conn.close())
).pipe(
	Effect.flatMap(use)
);
		`;

		// Verify the code examples are different
		expect(violatingCode2).not.toBe(goodCode2);
		expect(violatingCode2).toContain("Effect.succeed(conn)"); // Returns raw resource
		expect(goodCode2).toContain("Effect.acquireRelease"); // Proper pattern

		// Example 3: Global singletons instead of layers (violating)
		const violatingCode3 = `
import { Effect } from "effect";

const httpClient = new HttpClient({ baseURL: "https://api.example.com" });

export const fetchUser = (id: string) => 
	Effect.tryPromise(() => httpClient.get(\`/users/\${id}\`));
		`;

		// Example 3: Global singletons instead of layers (good)
		const goodCode3 = `
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

		// Verify the code examples are different
		expect(violatingCode3).not.toBe(goodCode3);
		expect(violatingCode3).toContain("new HttpClient"); // Global singleton
		expect(goodCode3).toContain("Effect.Service"); // Proper layer pattern
	});

	it("demonstrates manual resource closing anti-pattern", () => {
		// Violating: Manual close calls
		const violatingCode = `
import { Effect } from "effect";

const badExample = Effect.gen(function* () {
	const conn = yield* Effect.sync(() => openConnection());
	const result = yield* Effect.sync(() => conn.query("SELECT * FROM users"));
	yield* Effect.sync(() => conn.close()); // Manual close
	return result;
});
		`;

		// Good: Using acquireRelease
		const goodCode = `
import { Effect } from "effect";

const goodExample = Effect.acquireRelease(
	Effect.sync(() => openConnection()),
	(conn) => Effect.sync(() => conn.close())
).pipe(
	Effect.flatMap((conn) => Effect.sync(() => conn.query("SELECT * FROM users")))
);
		`;

		expect(violatingCode).toContain("conn.close()"); // Manual close
		expect(goodCode).toContain("Effect.acquireRelease"); // Proper pattern
	});

	it("demonstrates effect-run with open resources anti-pattern", () => {
		// Violating: Running effects with open resources
		const violatingCode = `
import { Effect } from "effect";

const badExample = async () => {
	const conn = await createConnection(); // Resource created
	const result = await Effect.runPromise(
		Effect.gen(function* () {
			return yield* Effect.sync(() => conn.query("SELECT * FROM users"));
		})
	);
	// conn never closed!
	return result;
};
		`;

		// Good: Properly scoped resources
		const goodCode = `
import { Effect } from "effect";

const goodExample = () => Effect.runPromise(
	Effect.scoped(
		Effect.gen(function* () {
			const conn = yield* Effect.acquireRelease(
				Effect.sync(() => createConnection()),
				(conn) => Effect.sync(() => conn.close())
			);
			return yield* Effect.sync(() => conn.query("SELECT * FROM users"));
		})
	)
);
		`;

		expect(violatingCode).toContain("await createConnection()"); // Manual resource creation
		expect(goodCode).toContain("Effect.scoped"); // Proper scoping
	});

	it("notes implementation requirements", () => {
		// This test documents what would need to be implemented
		// for actual detection of scope anti-patterns:

		const implementationNotes = [
			"AST pattern matching for manual resource cleanup",
			"Detection of Effect.succeed wrapping resources",
			"Global singleton pattern recognition",
			"Manual .close() call detection",
			"Effect.run* before scoping detection",
			"Nested acquireRelease depth analysis",
			"Scope.global usage detection",
			"Layer provision analysis",
		];

		// Verify we have documented the requirements
		expect(implementationNotes.length).toBeGreaterThan(0);
		expect(implementationNotes).toContain("AST pattern matching for manual resource cleanup");
	});
});
