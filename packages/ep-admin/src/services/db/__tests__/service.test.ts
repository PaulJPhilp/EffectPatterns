import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import { runFullTestSuite, runQuickTest, verifySchema } from "../service.js";

// Mock @effect-patterns/toolkit to avoid real DB calls
vi.mock("@effect-patterns/toolkit", () => ({
	createDatabase: vi.fn().mockReturnValue({
		db: {
			execute: vi.fn().mockImplementation((query: string) => {
				if (query.includes("SELECT 1")) {
					return Promise.resolve([{ test: 1 }]);
				}
				if (query.includes("EXISTS")) {
					return Promise.resolve([{ exists: true }]);
				}
				return Promise.resolve([]);
			}),
		},
		close: vi.fn().mockResolvedValue(undefined),
	}),
	createApplicationPatternRepository: vi.fn().mockReturnValue({
		findAll: vi.fn().mockResolvedValue([]),
		findBySlug: vi.fn().mockResolvedValue({ slug: "test" }),
	}),
	createEffectPatternRepository: vi.fn().mockReturnValue({
		findAll: vi.fn().mockResolvedValue([]),
		search: vi.fn().mockResolvedValue([]),
		countBySkillLevel: vi.fn().mockResolvedValue({ beginner: 0, intermediate: 0, advanced: 0 }),
		findBySlug: vi.fn().mockResolvedValue({ slug: "test" }),
	}),
	createJobRepository: vi.fn().mockReturnValue({
		findAll: vi.fn().mockResolvedValue([]),
	}),
}));

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
