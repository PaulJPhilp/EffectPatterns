/**
 * Database Utilities
 */

import { Effect } from "effect";

/**
 * Safely close the database connection
 */
export const closeDatabaseSafely = (db: any) =>
  Effect.try({
    try: () => {
      if (db && typeof db.close === "function") {
        db.close();
      }
    },
    catch: (error) => new Error(`Failed to close database: ${error}`),
  });
