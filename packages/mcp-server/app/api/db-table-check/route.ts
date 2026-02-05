/**
 * Database table check endpoint (Admin only)
 *
 * Attempts to query effect_patterns and returns error details if it fails.
 */

import { createDatabase } from "@effect-patterns/toolkit";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { type NextRequest } from "next/server";
import { createRouteHandler } from "../../../src/server/routeHandler";

const handleDbTableCheck = (_request: NextRequest) => Effect.gen(function* () {
  const dbUrl = process.env.DATABASE_URL_OVERRIDE || process.env.DATABASE_URL;
  if (!dbUrl) {
    return yield* Effect.fail(
      new Error("DATABASE_URL not configured on server")
    );
  }

  const result = yield* Effect.gen(function* () {
    const { db, close } = createDatabase(dbUrl);
    const count = yield* Effect.tryPromise(async () => {
      return await db.execute(
        sql`SELECT COUNT(*)::int as count FROM effect_patterns`
      );
    });
    const columns = yield* Effect.tryPromise(async () => {
      return await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'effect_patterns'
        ORDER BY ordinal_position
      `);
    });
    yield* Effect.promise(() => close());
    return { count, columns };
  });

  return {
    success: true,
    result,
  };
});

export const GET = createRouteHandler(handleDbTableCheck, {
  requireAuth: false,
  requireAdmin: true,
});
