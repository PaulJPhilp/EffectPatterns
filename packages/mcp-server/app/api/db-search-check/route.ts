/**
 * Database search check endpoint (Admin only)
 *
 * Runs the same repository search used by /api/patterns and returns errors.
 */

import { createDatabase } from "@effect-patterns/toolkit";
import { createEffectPatternRepository } from "@effect-patterns/toolkit";
import { Effect } from "effect";
import { type NextRequest } from "next/server";
import { createRouteHandler } from "../../../src/server/routeHandler";

const handleDbSearchCheck = Effect.fn("db-search-check")(function* (
  request: NextRequest
) {
  const dbUrl = process.env.DATABASE_URL_OVERRIDE || process.env.DATABASE_URL;
  if (!dbUrl) {
    return yield* Effect.fail(
      new Error("DATABASE_URL not configured on server")
    );
  }

  const result = yield* Effect.gen(function* () {
    const { db, close } = createDatabase(dbUrl);
    const repo = createEffectPatternRepository(db);

    const rowsResult = yield* Effect.tryPromise({
      try: () => repo.search({ limit: 1 }),
      catch: (error: any) => ({
        ok: false as const,
        error: {
          message: error?.message,
          code: error?.code,
          detail: error?.detail,
          hint: error?.hint,
          constraint: error?.constraint,
          table: error?.table ?? error?.table_name,
          column: error?.column ?? error?.column_name,
          schema: error?.schema ?? error?.schema_name,
          where: error?.where,
          cause: error?.cause?.message ?? error?.cause,
        },
      }),
    });

    yield* Effect.promise(() => close());

    if (Array.isArray(rowsResult)) {
      return { ok: true as const, rows: rowsResult };
    }

    return rowsResult;
  });

  return {
    success: true,
    result,
  };
});

export const GET = createRouteHandler(handleDbSearchCheck, {
  requireAuth: false,
  requireAdmin: true,
});
