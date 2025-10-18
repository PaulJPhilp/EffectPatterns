/**
 * Drizzle database client
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

/**
 * Get database connection string from environment
 */
const getDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
        'See .env.sample for setup instructions.'
    );
  }
  return url;
};

/**
 * Create Postgres connection
 */
const createConnection = () => {
  const connectionString = getDatabaseUrl();
  return postgres(connectionString);
};

/**
 * Drizzle database instance
 *
 * Singleton - created once and reused across requests
 */
let dbInstance: ReturnType<typeof drizzle> | null = null;

export const getDb = () => {
  if (!dbInstance) {
    const connection = createConnection();
    dbInstance = drizzle(connection, { schema });
  }
  return dbInstance;
};

/**
 * Export for direct use
 */
export const db = getDb();
