/**
 * Database Service
 *
 * Provides database testing and verification functionality:
 * - Quick connectivity tests
 * - Full test suite
 * - Schema verification
 */

import {
	createApplicationPatternRepository,
	createDatabase,
	createEffectPatternRepository,
	createJobRepository,
} from "@effect-patterns/toolkit";
import { Effect } from "effect";
import type {
	DBQuickTestResult,
	DBTestResult,
	DBTestSummary
} from "./types.js";

// Type guard for database query results  
interface QueryResult extends Array<unknown> { }

interface ExistsQueryResult {
	exists: boolean;
}

interface TestQueryResult {
	test: number;
}

const isQueryResult = (result: unknown): result is unknown[] => {
	return Array.isArray(result);
};

const isExistsQueryResult = (rows: unknown[]): rows is ExistsQueryResult[] => {
	return Array.isArray(rows) && rows.length > 0 && typeof rows[0] === "object" && rows[0] !== null && "exists" in rows[0];
};

const isTestQueryResult = (rows: unknown[]): rows is TestQueryResult[] => {
	return Array.isArray(rows) && rows.length > 0 && typeof rows[0] === "object" && rows[0] !== null && "test" in rows[0];
};

// --- CONSTANTS ---

const REQUIRED_TABLES = [
	"application_patterns",
	"effect_patterns",
	"jobs",
	"pattern_jobs",
	"pattern_relations",
];

// --- QUICK TEST ---

export const runQuickTest = (): Effect.Effect<DBQuickTestResult, Error> =>
	Effect.gen(function* () {
		const { db, close } = createDatabase();

		// Test connection
		const connected = yield* Effect.tryPromise({
			try: () => db.execute("SELECT 1"),
			catch: () => new Error("Connection failed"),
		}).pipe(
			Effect.map(() => true),
			Effect.catchAll(() => Effect.succeed(false))
		);

		if (!connected) {
			return {
				connected: false,
				tablesExist: false,
				tables: [],
				stats: {
					applicationPatterns: 0,
					effectPatterns: 0,
					jobs: 0,
					tables: [],
				},
				searchWorks: false,
				repositoriesWork: false,
			};
		}

		// Check tables
		const tables = yield* Effect.forEach(REQUIRED_TABLES, (table) =>
			Effect.tryPromise({
				try: () => db.execute(
					`SELECT EXISTS (
						SELECT FROM information_schema.tables 
						WHERE table_schema = 'public' 
						AND table_name = '${table}'
					)`,
				),
				catch: () => new Error(`Failed to check table ${table}`),
			}).pipe(
				Effect.map((result) => {
					if (!isQueryResult(result) || !isExistsQueryResult(result)) {
						return { name: table, exists: false };
					}
					const exists = result[0]?.exists;
					return { name: table, exists: !!exists };
				}),
				Effect.catchAll(() => Effect.succeed({ name: table, exists: false }))
			)
		);

		const tablesExist = tables.every((t) => t.exists);

		// Get stats
		const apRepo = createApplicationPatternRepository(db);
		const epRepo = createEffectPatternRepository(db);
		const jobRepo = createJobRepository(db);

		const stats = yield* Effect.all([
			Effect.tryPromise({
				try: () => apRepo.findAll(),
				catch: () => [],
			}),
			Effect.tryPromise({
				try: () => epRepo.findAll(),
				catch: () => [],
			}),
			Effect.tryPromise({
				try: () => jobRepo.findAll(),
				catch: () => [],
			}),
		]).pipe(
			Effect.map(([aps, eps, jobs]) => ({
				applicationPatterns: aps.length,
				effectPatterns: eps.length,
				jobs: jobs.length,
				tables: REQUIRED_TABLES,
			}))
		);

		// Test search
		const searchWorks = yield* Effect.tryPromise({
			try: () => epRepo.search({ query: "effect", limit: 5 }),
			catch: () => new Error("Search failed"),
		}).pipe(
			Effect.map(() => true),
			Effect.catchAll(() => Effect.succeed(false))
		);

		// Test repositories
		const repositoriesWork = yield* Effect.tryPromise({
			try: async () => {
				const aps = await apRepo.findAll();
				if (aps.length > 0) {
					await apRepo.findBySlug(aps[0].slug);
					return true;
				} else {
					return true; // No data to test with
				}
			},
			catch: () => false,
		});

		return {
			connected,
			tablesExist,
			tables,
			stats,
			searchWorks,
			repositoriesWork,
		};
	}).pipe(
		Effect.catchAll((error) => Effect.fail(new Error(`Database test failed: ${error}`)))
	);

// --- FULL TEST SUITE ---

export const runFullTestSuite = (): Effect.Effect<DBTestSummary, Error> =>
	Effect.gen(function* () {
		const results: DBTestResult[] = [];
		const { db, close } = createDatabase();

		const runTest = (
			name: string,
			fn: () => Promise<void>,
		): Effect.Effect<void, Error> =>
			Effect.gen(function* () {
				const start = Date.now();
				yield* Effect.tryPromise({
					try: () => fn(),
					catch: (error) => {
						results.push({
							name,
							passed: false,
							error: error instanceof Error ? error.message : String(error),
							duration: Date.now() - start,
						});
						throw error;
					},
				});
				results.push({
					name,
					passed: true,
					duration: Date.now() - start,
				});
			}).pipe(
				Effect.catchAll(() => Effect.succeed(undefined))
			);

		try {
			// Test 1: Database Connection
			yield* runTest("Database Connection", async () => {
				const result = await db.execute("SELECT 1 as test");
				if (!isQueryResult(result) || !isTestQueryResult(result)) {
					throw new Error("Connection failed");
				}
			});

			// Test 2: Schema Tables Exist
			yield* runTest("Schema Tables Exist", async () => {
				for (const table of REQUIRED_TABLES) {
					const result = await db.execute(
						`SELECT EXISTS (
							SELECT FROM information_schema.tables 
							WHERE table_schema = 'public' 
							AND table_name = '${table}'
						)`,
					);
					if (!isQueryResult(result) || !isExistsQueryResult(result)) {
						throw new Error(`Table ${table} does not exist`);
					}
					if (!result[0]?.exists) {
						throw new Error(`Table ${table} does not exist`);
					}
				}
			});

			// Test 3: Application Patterns Repository
			yield* runTest("Application Patterns Repository", async () => {
				const repo = createApplicationPatternRepository(db);
				const all = await repo.findAll();
				if (!Array.isArray(all)) {
					throw new Error("findAll should return an array");
				}
			});

			// Test 4: Effect Patterns Repository
			yield* runTest("Effect Patterns Repository", async () => {
				const repo = createEffectPatternRepository(db);
				const all = await repo.findAll();
				if (!Array.isArray(all)) {
					throw new Error("findAll should return an array");
				}
			});

			// Test 5: Search Functionality
			yield* runTest("Pattern Search", async () => {
				const repo = createEffectPatternRepository(db);
				const searchResults = await repo.search({
					query: "effect",
					limit: 10,
				});
				if (!Array.isArray(searchResults)) {
					throw new Error("search should return an array");
				}
			});

			// Test 6: Jobs Repository
			yield* runTest("Jobs Repository", async () => {
				const repo = createJobRepository(db);
				const all = await repo.findAll();
				if (!Array.isArray(all)) {
					throw new Error("findAll should return an array");
				}
			});

			// Test 7: Count by Skill Level
			yield* runTest("Count Patterns by Skill Level", async () => {
				const repo = createEffectPatternRepository(db);
				const counts = await repo.countBySkillLevel();
				if (
					typeof counts.beginner !== "number" ||
					typeof counts.intermediate !== "number" ||
					typeof counts.advanced !== "number"
				) {
					throw new Error("Invalid skill level counts");
				}
			});

			// Test 8: Find by Slug
			yield* runTest("Find Pattern by Slug", async () => {
				const repo = createEffectPatternRepository(db);
				const all = await repo.findAll(1);
				if (all.length > 0) {
					const pattern = await repo.findBySlug(all[0].slug);
					if (!pattern || pattern.slug !== all[0].slug) {
						throw new Error("findBySlug failed");
					}
				}
			});

			const passed = results.filter((r) => r.passed).length;
			const failed = results.filter((r) => !r.passed).length;
			const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

			return {
				total: results.length,
				passed,
				failed,
				totalDuration,
				results,
			};
		} finally {
			yield* Effect.tryPromise({
				try: () => close(),
				catch: (error) => console.error('Failed to close database:', error),
			});
		}
	}).pipe(
		Effect.catchAll((error) => Effect.fail(new Error(`Test suite failed: ${error}`)))
	);

// --- SCHEMA VERIFICATION ---

export const verifySchema = (): Effect.Effect<
	{ valid: boolean; missingTables: string[] },
	Error
> =>
	Effect.gen(function* () {
		const { db, close } = createDatabase();

		const tableResults = yield* Effect.forEach(REQUIRED_TABLES, (table) =>
			Effect.tryPromise({
				try: () => db.execute(
					`SELECT EXISTS (
						SELECT FROM information_schema.tables 
						WHERE table_schema = 'public' 
						AND table_name = '${table}'
					)`,
				),
				catch: () => new Error(`Failed to check table ${table}`),
			}).pipe(
				Effect.map((result) => {
					if (!isQueryResult(result) || !isExistsQueryResult(result)) {
						return { table, exists: false };
					}
					return { table, exists: !!result[0]?.exists };
				})
			)
		);

		const missingTables = tableResults
			.filter(({ exists }) => !exists)
			.map(({ table }) => table);

		return {
			valid: missingTables.length === 0,
			missingTables,
		};
	}).pipe(
		Effect.catchAll((error) => Effect.fail(new Error(`Schema verification failed: ${error}`)))
	);
