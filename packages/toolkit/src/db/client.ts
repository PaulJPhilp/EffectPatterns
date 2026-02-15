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
}

const DEFAULT_LOCAL_URL = "postgresql://postgres:postgres@localhost:5432/effect_patterns"

/**
 * Resolve the database URL, throwing in production/serverless if missing.
 */
function resolveDatabaseUrl(url?: string): string {
  const resolved =
    url ??
    process.env.DATABASE_URL_OVERRIDE ??
    process.env.DATABASE_URL

  if (resolved) {
    return resolved
  }

  const isProduction = process.env.NODE_ENV === "production"
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)

  if (isProduction || isServerless) {
    throw new Error(
      "DATABASE_URL is required in production/serverless environments"
    )
  }

  // Local development only
  return DEFAULT_LOCAL_URL
}

/**
 * Create the postgres client + drizzle instance from a resolved URL.
 */
function createDatabaseInternal(databaseUrl: string): DatabaseConnection {
  // Detect environment to configure connection pooling appropriately
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  const isCLI = process.argv[1]?.includes('cli') ||
    process.argv[1]?.includes('load-patterns') ||
    process.argv[1]?.includes('migrate') ||
    Boolean(process.env.CLI_MODE)

  // Configure pool based on environment
  const poolConfig: any = {
    prepare: false, // Required for Neon pooler / PgBouncer compatibility
    onnotice: () => {
      // Suppress notices in CLI
    },
  }

  const poolMax = process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : undefined
  const poolIdle = process.env.DB_POOL_IDLE_TIMEOUT ? parseInt(process.env.DB_POOL_IDLE_TIMEOUT, 10) : undefined

  if (isCLI) {
    // CLI usage: single connection
    poolConfig.max = 1
    poolConfig.idle_timeout = 20
    poolConfig.connect_timeout = 10
  } else if (isServerless) {
    // Serverless (Vercel): moderate pool for concurrent requests, aggressive idle timeout
    poolConfig.max = poolMax ?? 10
    poolConfig.idle_timeout = poolIdle ?? 10
    poolConfig.connect_timeout = 10
    poolConfig.max_lifetime = 300 // 5 minutes - prevent stale connections
    poolConfig.transform = {
      undefined: null, // Normalize undefined values
    }
  } else {
    // Server environment: larger pool for sustained load
    poolConfig.max = poolMax ?? 20
    poolConfig.idle_timeout = poolIdle ?? 20
    poolConfig.connect_timeout = 10
  }

  const client = postgres(databaseUrl, poolConfig)

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
  }
}

/**
 * Create a database instance
 *
 * @param url - Database connection URL (defaults to DATABASE_URL env var or local postgres)
 * @returns Database connection with close function
 * @throws Error if DATABASE_URL is missing in production/serverless environments
 */
export function createDatabase(url?: string): DatabaseConnection {
  return createDatabaseInternal(resolveDatabaseUrl(url))
}

/**
 * Get the default database URL
 *
 * @throws Error if DATABASE_URL is missing in production/serverless environments
 */
export function getDatabaseUrl(): string {
  return resolveDatabaseUrl()
}
