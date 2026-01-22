/**
 * Drizzle PostgreSQL Client
 *
 * Database client setup for PostgreSQL using Drizzle ORM.
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema/index.js"

/**
 * Database client type with schema
 */
export type Database = PostgresJsDatabase<typeof schema>

/**
 * Database connection interface
 */
export interface DatabaseConnection {
  db: Database
  close: () => Promise<void>
  warmupPool?: (count?: number) => Promise<void> // PERFORMANCE: Connection pool warm-up
}

/**
 * Create a database instance
 *
 * @param url - Database connection URL (defaults to DATABASE_URL env var or local postgres)
 * @param options - Configuration options
 * @returns Database connection with close function
 */
export function createDatabase(
  url?: string,
  options?: {
    poolSize?: number // Number of connections to maintain in pool
    warmupConnections?: number // Number of connections to pre-warm
  }
): DatabaseConnection {
  const databaseUrl =
    url ??
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/effect_patterns"

  // PERFORMANCE: Allow configurable pool size for server deployments
  // CLI defaults to 1, servers should use higher pool size
  const poolSize = options?.poolSize ?? 1

  const client = postgres(databaseUrl, {
    max: poolSize, // Connection pool size
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
    onnotice: () => {
      // Suppress notices in CLI
    },
  })

  const db = drizzle(client, { schema })

  return {
    db,
    close: async () => {
      try {
        await client.end({ timeout: 5 })
      } catch (error) {
        // Log but don't throw - connection might already be closed
        console.error("Error closing database connection:", error)
      }
    },
    // PERFORMANCE: Warm up connection pool by establishing connections
    warmupPool: async (count?: number) => {
      const connectionsToWarmup = count ?? options?.warmupConnections ?? Math.min(poolSize, 5)
      
      try {
        const warmupPromises = Array.from({ length: connectionsToWarmup }, async () => {
          try {
            // Execute a simple query to establish a connection
            await client`SELECT 1 as connected`
          } catch (error) {
            console.warn("Failed to warm up pool connection:", error)
            // Don't throw - continue with remaining warmups
          }
        })
        
        await Promise.all(warmupPromises)
        console.log(`[DB] Warmed up ${connectionsToWarmup} connection pool connections`)
      } catch (error) {
        console.warn("Connection pool warmup failed:", error)
        // Don't throw - server can still function without warmup
      }
    },
  }
}

/**
 * Get the default database URL
 */
export function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/effect_patterns"
  )
}
