/**
 * Drizzle PostgreSQL Client
 *
 * Database client setup for PostgreSQL using Drizzle ORM.
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import * as postgres from "postgres"
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

/**
 * Create a database instance
 *
 * @param url - Database connection URL (defaults to DATABASE_URL env var or local postgres)
 * @returns Database connection with close function
 */
export function createDatabase(url?: string): DatabaseConnection {
  const databaseUrl =
    url ??
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/effect_patterns"

  const client = postgres(databaseUrl)
  const db = drizzle(client, { schema })

  return {
    db,
    close: () => client.end(),
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
