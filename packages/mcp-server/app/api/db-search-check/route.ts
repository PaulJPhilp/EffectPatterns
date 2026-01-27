/**
 * Database search check endpoint (Admin only)
 *
 * Runs the same repository search used by /api/patterns and returns errors.
 */

import { createDatabase } from "@effect-patterns/toolkit";
import { createEffectPatternRepository } from "@effect-patterns/toolkit/repositories";
import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import { validateAdminKey } from "../../../src/auth/adminAuth";
import { runWithRuntime } from "../../../src/server/init";
import { errorHandler } from "../../../src/server/errorHandler";

const handleDbSearchCheck = Effect.fn("db-search-check")(function* (
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
    try {
      const repo = createEffectPatternRepository(db);
      const rows = await repo.search({ limit: 1 });
      return { ok: true, rows };
    } catch (error: any) {
      return {
        ok: false,
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
      };
    } finally {
      await close();
    }
  });

  return {
    success: true,
    result,
  };
});

export async function GET(request: NextRequest) {
  const result = await runWithRuntime(
    handleDbSearchCheck(request).pipe(
      Effect.catchAll((error) => errorHandler(error))
    )
  );

  if (result instanceof Response) {
    return result;
  }

  return NextResponse.json(result, { status: 200 });
}
