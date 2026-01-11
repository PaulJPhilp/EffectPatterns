/**
 * Database Service Helpers
 *
 * Helper functions for database operations
 */

import {
	createApplicationPatternRepository,
	createDatabase,
	createEffectPatternRepository,
	createJobRepository,
} from "@effect-patterns/toolkit";
import { Effect } from "effect";

// --- CONSTANTS ---

export const REQUIRED_TABLES = [
	"application_patterns",
	"effect_patterns",
	"jobs",
	"pattern_jobs",
	"pattern_relations",
] as const;

/**
 * Create database connection with proper error handling
 */
export const createDatabaseConnection = Effect.tryPromise({
	try: async (signal) => {
		const connection = createDatabase();
		return connection;
	},
	catch: (error) => new Error(`Failed to create database connection: ${error}`),
});

/**
 * Test basic database connectivity
 */
export const testDatabaseConnectivity = (db: any) =>
	Effect.tryPromise({
		try: async () => {
			await db.execute("SELECT 1");
			return true;
		},
		catch: () => false,
	});

/**
 * Check if a table exists in the database
 */
export const checkTableExists = (db: any, tableName: string) =>
	Effect.tryPromise({
		try: async () => {
			const result = await db.execute(
				`SELECT EXISTS (
					SELECT FROM information_schema.tables 
					WHERE table_schema = 'public' 
					AND table_name = '${tableName}'
				)`,
			);
			const rows = result as unknown as Array<{ exists: boolean }>;
			return !!rows[0]?.exists;
		},
		catch: () => false,
	});

/**
 * Get database statistics
 */
export const getDatabaseStats = (db: any) =>
	Effect.tryPromise({
		try: async () => {
			const apRepo = createApplicationPatternRepository(db);
			const epRepo = createEffectPatternRepository(db);
			const jobRepo = createJobRepository(db);

			const [aps, eps, jobs] = await Promise.all([
				apRepo.findAll(),
				epRepo.findAll(),
				jobRepo.findAll(),
			]);

			return {
				applicationPatterns: aps.length,
				effectPatterns: eps.length,
				jobs: jobs.length,
				tables: REQUIRED_TABLES,
			};
		},
		catch: () => ({
			applicationPatterns: 0,
			effectPatterns: 0,
			jobs: 0,
			tables: REQUIRED_TABLES,
		}),
	});

/**
 * Test search functionality
 */
export const testSearchFunctionality = (db: any) =>
	Effect.tryPromise({
		try: async () => {
			const epRepo = createEffectPatternRepository(db);
			await epRepo.search({ query: "effect", limit: 5 });
			return true;
		},
		catch: () => false,
	});

/**
 * Test repository functionality
 */
export const testRepositoryFunctionality = (db: any) =>
	Effect.tryPromise({
		try: async () => {
			const apRepo = createApplicationPatternRepository(db);
			const aps = await apRepo.findAll();
			if (aps.length > 0) {
				await apRepo.findBySlug(aps[0].slug);
			}
			return true;
		},
		catch: () => false,
	});
