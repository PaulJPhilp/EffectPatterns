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
	DBStats,
	DBTestResult,
	DBTestSummary,
	TableStatus,
} from "./types.js";

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
	Effect.tryPromise({
		try: async () => {
			const { db, close } = createDatabase();

			try {
				// Test connection
				let connected = false;
				try {
					await db.execute("SELECT 1");
					connected = true;
				} catch {
					connected = false;
				}

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
				const tables: TableStatus[] = [];
				for (const table of REQUIRED_TABLES) {
					try {
						const result = await db.execute(
							`SELECT EXISTS (
								SELECT FROM information_schema.tables 
								WHERE table_schema = 'public' 
								AND table_name = '${table}'
							)`,
						);
						const rows = result as unknown as Array<{ exists: boolean }>;
						const exists = rows[0]?.exists;
						tables.push({ name: table, exists: !!exists });
					} catch {
						tables.push({ name: table, exists: false });
					}
				}

				const tablesExist = tables.every((t) => t.exists);

				// Get stats
				const apRepo = createApplicationPatternRepository(db);
				const epRepo = createEffectPatternRepository(db);
				const jobRepo = createJobRepository(db);

				let stats: DBStats = {
					applicationPatterns: 0,
					effectPatterns: 0,
					jobs: 0,
					tables: REQUIRED_TABLES,
				};

				try {
					const aps = await apRepo.findAll();
					const eps = await epRepo.findAll();
					const jobs = await jobRepo.findAll();

					stats = {
						applicationPatterns: aps.length,
						effectPatterns: eps.length,
						jobs: jobs.length,
						tables: REQUIRED_TABLES,
					};
				} catch {
					// Stats unavailable
				}

				// Test search
				let searchWorks = false;
				try {
					await epRepo.search({ query: "effect", limit: 5 });
					searchWorks = true;
				} catch {
					searchWorks = false;
				}

				// Test repositories
				let repositoriesWork = false;
				try {
					const aps = await apRepo.findAll();
					if (aps.length > 0) {
						await apRepo.findBySlug(aps[0].slug);
						repositoriesWork = true;
					} else {
						repositoriesWork = true; // No data to test with
					}
				} catch {
					repositoriesWork = false;
				}

				return {
					connected,
					tablesExist,
					tables,
					stats,
					searchWorks,
					repositoriesWork,
				};
			} finally {
				await close();
			}
		},
		catch: (error) => new Error(`Database test failed: ${error}`),
	});

// --- FULL TEST SUITE ---

export const runFullTestSuite = (): Effect.Effect<DBTestSummary, Error> =>
	Effect.tryPromise({
		try: async () => {
			const results: DBTestResult[] = [];
			const { db, close } = createDatabase();

			const runTest = async (
				name: string,
				fn: () => Promise<void>,
			): Promise<void> => {
				const start = Date.now();
				try {
					await fn();
					results.push({
						name,
						passed: true,
						duration: Date.now() - start,
					});
				} catch (error) {
					results.push({
						name,
						passed: false,
						error: error instanceof Error ? error.message : String(error),
						duration: Date.now() - start,
					});
				}
			};

			try {
				// Test 1: Database Connection
				await runTest("Database Connection", async () => {
					const result = await db.execute("SELECT 1 as test");
					const rows = result as unknown as Array<{ test: number }>;
					if (!rows[0]?.test) {
						throw new Error("Connection failed");
					}
				});

				// Test 2: Schema Tables Exist
				await runTest("Schema Tables Exist", async () => {
					for (const table of REQUIRED_TABLES) {
						const result = await db.execute(
							`SELECT EXISTS (
								SELECT FROM information_schema.tables 
								WHERE table_schema = 'public' 
								AND table_name = '${table}'
							)`,
						);
						const existRows = result as unknown as Array<{ exists: boolean }>;
						if (!existRows[0]?.exists) {
							throw new Error(`Table ${table} does not exist`);
						}
					}
				});

				// Test 3: Application Patterns Repository
				await runTest("Application Patterns Repository", async () => {
					const repo = createApplicationPatternRepository(db);
					const all = await repo.findAll();
					if (!Array.isArray(all)) {
						throw new Error("findAll should return an array");
					}
				});

				// Test 4: Effect Patterns Repository
				await runTest("Effect Patterns Repository", async () => {
					const repo = createEffectPatternRepository(db);
					const all = await repo.findAll();
					if (!Array.isArray(all)) {
						throw new Error("findAll should return an array");
					}
				});

				// Test 5: Search Functionality
				await runTest("Pattern Search", async () => {
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
				await runTest("Jobs Repository", async () => {
					const repo = createJobRepository(db);
					const all = await repo.findAll();
					if (!Array.isArray(all)) {
						throw new Error("findAll should return an array");
					}
				});

				// Test 7: Count by Skill Level
				await runTest("Count Patterns by Skill Level", async () => {
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
				await runTest("Find Pattern by Slug", async () => {
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
				await close();
			}
		},
		catch: (error) => new Error(`Test suite failed: ${error}`),
	});

// --- SCHEMA VERIFICATION ---

export const verifySchema = (): Effect.Effect<
	{ valid: boolean; missingTables: string[] },
	Error
> =>
	Effect.tryPromise({
		try: async () => {
			const { db, close } = createDatabase();

			try {
				const missingTables: string[] = [];

				for (const table of REQUIRED_TABLES) {
					const result = await db.execute(
						`SELECT EXISTS (
							SELECT FROM information_schema.tables 
							WHERE table_schema = 'public' 
							AND table_name = '${table}'
						)`,
					);
					const schemaRows = result as unknown as Array<{ exists: boolean }>;
					if (!schemaRows[0]?.exists) {
						missingTables.push(table);
					}
				}

				return {
					valid: missingTables.length === 0,
					missingTables,
				};
			} finally {
				await close();
			}
		},
		catch: (error) => new Error(`Schema verification failed: ${error}`),
	});
