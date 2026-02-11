/**
 * Database Service Helpers
 *
 * Helper functions for database operations
 */

import {
	createApplicationPatternRepository,
	createDatabase,
	createEffectPatternRepository,
} from "@effect-patterns/toolkit";
import { Effect } from "effect";

// --- CONSTANTS ---

// Local type for database operations
type Database = Parameters<typeof createApplicationPatternRepository>[0] & {
	execute: (query: string) => Promise<unknown>;
};

// Type guard for database query results
interface QueryResult {
	rows: unknown[];
}

interface ExistsQueryResult {
	exists: boolean;
}

const isQueryResult = (result: unknown): result is QueryResult => {
	return typeof result === "object" && result !== null && "rows" in result;
};

const isExistsQueryResult = (rows: unknown[]): rows is ExistsQueryResult[] => {
	return Array.isArray(rows) && rows.length > 0 && typeof rows[0] === "object" && rows[0] !== null && "exists" in rows[0];
};

export const REQUIRED_TABLES = [
	"application_patterns",
	"effect_patterns",
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
export const testDatabaseConnectivity = (db: Database) =>
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
export const checkTableExists = (db: Database, tableName: string) =>
	Effect.tryPromise({
		try: async () => {
			const result = await db.execute(
				`SELECT EXISTS (
					SELECT FROM information_schema.tables 
					WHERE table_schema = 'public' 
					AND table_name = '${tableName}'
				)`
			);
			if (!isQueryResult(result) || !isExistsQueryResult(result.rows)) {
				return false;
			}
			return result.rows[0]?.exists || false;
		},
		catch: (error) => new Error(`Failed to check table ${tableName}: ${error}`),
	});

/**
 * Get database statistics
 */
export const getDatabaseStats = (db: Database) =>
	Effect.tryPromise({
		try: async () => {
			const apRepo = createApplicationPatternRepository(db);
			const epRepo = createEffectPatternRepository(db);

			const [apCount, epCount] = await Promise.all([
				apRepo.findAll(),
				epRepo.findAll(),
			]);

			return {
				applicationPatterns: apCount.length,
				effectPatterns: epCount.length,
				tables: REQUIRED_TABLES,
			};
		},
		catch: (error) => new Error(`Failed to get database stats: ${error}`),
	});

/**
 * Test search functionality
 */
export const testSearchFunctionality = (db: Database) =>
	Effect.tryPromise({
		try: async () => {
			const epRepo = createEffectPatternRepository(db);
			const results = await epRepo.search({ query: "effect", limit: 5 });
			return results.length >= 0;
		},
		catch: (error) => new Error(`Failed to test search functionality: ${error}`),
	});

/**
 * Test repository functionality
 */
export const testRepositoryFunctionality = (db: Database) =>
	Effect.tryPromise({
		try: async () => {
			const apRepo = createApplicationPatternRepository(db);
			const aps = await apRepo.findAll();
			if (aps.length > 0) {
				await apRepo.findBySlug(aps[0].slug);
			}
			return true;
		},
		catch: (error) => new Error(`Failed to test repository functionality: ${error}`),
	});
