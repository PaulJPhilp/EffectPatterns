/**
 * Admin-only database connectivity check.
 */

import { createDatabase, effectPatterns } from "@effect-patterns/toolkit";
import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import { validateAdminKey } from "../../../src/auth/adminAuth";
import { errorHandler } from "../../../src/server/errorHandler";
import { runWithRuntime } from "../../../src/server/init";

const handleDatabaseTest = (request: NextRequest) =>
  Effect.gen(function* () {
    yield* validateAdminKey(request);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return yield* Effect.fail(new Error("DATABASE_URL not set"));
    }

    const { db, close } = createDatabase(dbUrl);
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: effectPatterns.id,
            title: effectPatterns.title,
            skillLevel: effectPatterns.skillLevel,
            category: effectPatterns.category,
          })
          .from(effectPatterns)
          .limit(5),
      catch: (error) => new Error(`Database connection failed: ${String(error)}`),
    }).pipe(
      Effect.ensuring(
        Effect.tryPromise({
          try: () => close(),
          catch: (error) => new Error(`Failed to close database connection: ${String(error)}`),
        }).pipe(Effect.ignore),
      ),
    );

    return {
      success: true,
      count: rows.length,
      patterns: rows,
    };
  });

export async function GET(request: NextRequest) {
  const result = await runWithRuntime(
    handleDatabaseTest(request).pipe(
      Effect.catchAll((error) => errorHandler(error)),
    ),
  );

  if (result instanceof Response) {
    return result;
  }

  return NextResponse.json(result, { status: 200 });
}
