/**
 * Database Service Tests
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { runFullTestSuite, runQuickTest, verifySchema } from "../service.js";

describe("Database Service", () => {
	it("should run quick test", async () => {
		const program = runQuickTest();
		const result = await Effect.runPromise(program);

		// Basic structure validation
		expect(typeof result.connected).toBe("boolean");
		expect(typeof result.tablesExist).toBe("boolean");
		expect(Array.isArray(result.tables)).toBe(true);
		expect(typeof result.stats).toBe("object");
		expect(typeof result.searchWorks).toBe("boolean");
		expect(typeof result.repositoriesWork).toBe("boolean");
	});

	it("should run full test suite", async () => {
		const program = runFullTestSuite();
		const result = await Effect.runPromise(program);

		// Basic structure validation
		expect(typeof result.total).toBe("number");
		expect(typeof result.passed).toBe("number");
		expect(typeof result.failed).toBe("number");
		expect(typeof result.totalDuration).toBe("number");
		expect(Array.isArray(result.results)).toBe(true);
	});

	it("should verify schema", async () => {
		const program = verifySchema();
		const result = await Effect.runPromise(program);

		// Basic structure validation
		expect(typeof result.valid).toBe("boolean");
		expect(Array.isArray(result.missingTables)).toBe(true);
	});
});
