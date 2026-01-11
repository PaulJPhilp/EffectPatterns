/**
 * Database Service Errors
 */

import { Data } from "effect";

/**
 * Database connection error
 */
export class DatabaseConnectionError extends Data.TaggedError(
	"DatabaseConnectionError"
)<{
	readonly cause: string;
}> { }

/**
 * Database schema error
 */
export class DatabaseSchemaError extends Data.TaggedError("DatabaseSchemaError")<{
	readonly cause: string;
}> { }

/**
 * Database query error
 */
export class DatabaseQueryError extends Data.TaggedError("DatabaseQueryError")<{
	readonly cause: string;
	readonly query?: string;
}> { }

/**
 * Database test failure error
 */
export class DatabaseTestError extends Data.TaggedError("DatabaseTestError")<{
	readonly testName: string;
	readonly cause: string;
}> { }
