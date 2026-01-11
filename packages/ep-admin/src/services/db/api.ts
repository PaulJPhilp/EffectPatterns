/**
 * Database Service API
 *
 * Interface for database testing and verification functionality
 */

import { Effect } from "effect";
import type {
	DBQuickTestResult,
	DBTestSummary
} from "./types.js";

/**
 * Database Service interface
 */
export interface DatabaseService {
	/**
	 * Run a quick database connectivity and functionality test
	 */
	readonly runQuickTest: () => Effect.Effect<DBQuickTestResult, Error>;

	/**
	 * Run the full database test suite
	 */
	readonly runFullTestSuite: () => Effect.Effect<DBTestSummary, Error>;

	/**
	 * Verify database schema exists and is correct
	 */
	readonly verifySchema: () => Effect.Effect<
		{ valid: boolean; missingTables: string[] },
		Error
	>;
}
