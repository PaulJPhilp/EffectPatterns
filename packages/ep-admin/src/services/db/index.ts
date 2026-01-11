/**
 * Database Services
 *
 * Native Effect-based services for database operations
 */

// Types
export type {
	DBQuickTestResult,
	DBStats,
	DBTestResult,
	DBTestSummary,
	TableStatus
} from "./types.js";

// API
export type { DatabaseService } from "./api.js";

// Errors
export {
	DatabaseConnectionError, DatabaseQueryError, DatabaseSchemaError, DatabaseTestError
} from "./errors.js";

// Service
export {
	runFullTestSuite,
	runQuickTest,
	verifySchema
} from "./service.js";

// Helpers
export {
	REQUIRED_TABLES, checkTableExists, createDatabaseConnection, getDatabaseStats, testDatabaseConnectivity, testRepositoryFunctionality, testSearchFunctionality
} from "./helpers.js";

