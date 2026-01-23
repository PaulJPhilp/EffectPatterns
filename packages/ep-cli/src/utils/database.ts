/**
 * Database Utilities
 */

import { Effect } from "effect";

/**
 * Database-like object with optional close method
 */
interface Closeable {
  readonly close?: () => void | Promise<void>;
}

/**
 * Safely close the database connection
 */
export const closeDatabaseSafely = (db: unknown) =>
  Effect.try({
    try: () => {
      const closeable = db as Closeable | null | undefined;
      if (closeable && typeof closeable.close === "function") {
        closeable.close();
      }
    },
    catch: (error) => new Error(`Failed to close database: ${error}`),
  });
