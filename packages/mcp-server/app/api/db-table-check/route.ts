/**
 * Database table check endpoint (Admin only)
 *
 * Attempts to query effect_patterns and returns error details if it fails.
 */

import { createDatabase } from "@effect-patterns/toolkit";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import { validateAdminKey } from "../../../src/auth/adminAuth";
import { runWithRuntime } from "../../../src/server/init";
import { errorHandler } from "../../../src/server/errorHandler";

const handleDbTableCheck = Effect.fn("db-table-check")(function* (
  request: NextRequest
) {
  yield* validateAdminKey(request);

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

export async function GET(request: NextRequest) {
  const result = await runWithRuntime(
    handleDbTableCheck(request).pipe(
      Effect.catchAll((error) => errorHandler(error))
    )
  );

  if (result instanceof Response) {
    return result;
  }

  return NextResponse.json(result, { status: 200 });
}
