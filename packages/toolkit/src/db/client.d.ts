/**
 * Drizzle PostgreSQL Client
 *
 * Database client setup for PostgreSQL using Drizzle ORM.
 */
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index.js";
/**
 * Database client type with schema
 */
export type Database = PostgresJsDatabase<typeof schema>;
/**
 * Database connection interface
 */
export interface DatabaseConnection {
    db: Database;
    close: () => Promise<void>;
}
/**
 * Create a database instance
 *
 * @param url - Database connection URL (defaults to DATABASE_URL env var or local postgres)
 * @returns Database connection with close function
 */
export declare function createDatabase(url?: string): DatabaseConnection;
/**
 * Get the default database URL
 */
export declare function getDatabaseUrl(): string;
//# sourceMappingURL=client.d.ts.map