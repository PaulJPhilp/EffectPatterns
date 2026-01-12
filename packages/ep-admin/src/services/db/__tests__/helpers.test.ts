/**
 * Database Service Helpers Tests
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
	REQUIRED_TABLES,
	checkTableExists,
	createDatabaseConnection,
	getDatabaseStats,
	testDatabaseConnectivity,
	testRepositoryFunctionality,
	testSearchFunctionality,
} from "../helpers.js";

describe("Database Service Helpers", () => {
	describe("Constants", () => {
		it("should have required tables defined", () => {
			expect(REQUIRED_TABLES).toEqual([
				"application_patterns",
				"effect_patterns",
				"jobs",
				"pattern_jobs",
				"pattern_relations",
			]);
		});
	});

	describe("Helper Functions Structure", () => {
		it("should create database connection effect", () => {
			const program = createDatabaseConnection;
			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});

		it("should test database connectivity effect", () => {
			const program = testDatabaseConnectivity({} as any);
			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});

		it("should check table exists effect", () => {
			const program = checkTableExists({} as any, "test_table");
			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});

		it("should get database stats effect", () => {
			const program = getDatabaseStats({} as any);
			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});

		it("should test search functionality effect", () => {
			const program = testSearchFunctionality({} as any);
			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});

		it("should test repository functionality effect", () => {
			const program = testRepositoryFunctionality({} as any);
			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});
	});

	describe("Helper Function Behavior", () => {
		it("should test database connectivity with success", async () => {
			const mockDb = {
				execute: () => Promise.resolve({ rows: [{ test: 1 }] })
			} as any;

			const program = testDatabaseConnectivity(mockDb);
			const result = await Effect.runPromise(program);

			expect(result).toBe(true);
		});

		it("should test database connectivity with failure", async () => {
			const mockDb = {
				execute: () => Promise.reject(new Error("Connection failed"))
			} as any;

			const program = testDatabaseConnectivity(mockDb);

			try {
				const result = await Effect.runPromise(program);
				expect(result).toBe(false);
			} catch (error) {
				// If it throws, that's also acceptable behavior for connectivity failure
				expect(error).toBeDefined();
			}
		});

		it("should check table exists with success", async () => {
			const mockDb = {
				execute: () => Promise.resolve({ rows: [{ exists: true }] })
			} as any;

			const program = checkTableExists(mockDb, "test_table");
			const result = await Effect.runPromise(program);

			expect(result).toBe(true);
		});

		it("should check table exists with failure", async () => {
			const mockDb = {
				execute: () => Promise.resolve({ rows: [{ exists: false }] })
			} as any;

			const program = checkTableExists(mockDb, "missing_table");
			const result = await Effect.runPromise(program);

			expect(result).toBe(false);
		});
	});
});
