/**
 * Drizzle PostgreSQL Client
 *
 * Database client setup for PostgreSQL using Drizzle ORM.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";
/**
 * Create a database instance
 *
 * @param url - Database connection URL (defaults to DATABASE_URL env var or local postgres)
 * @returns Database connection with close function
 */
export function createDatabase(url) {
    const databaseUrl = url ??
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/effect_patterns";
    const client = postgres(databaseUrl, {
        max: 1, // Single connection for CLI usage
        idle_timeout: 20, // Close idle connections after 20 seconds
        connect_timeout: 10, // Connection timeout in seconds
        onnotice: () => {
            // Suppress notices in CLI
        },
    });
    const db = drizzle(client, { schema });
    return {
        db,
        close: async () => {
            try {
                await client.end({ timeout: 5 });
            }
            catch (error) {
                // Log but don't throw - connection might already be closed
                console.error("Error closing database connection:", error);
            }
        },
    };
}
/**
 * Get the default database URL
 */
export function getDatabaseUrl() {
    return (process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/effect_patterns");
}
//# sourceMappingURL=client.js.map