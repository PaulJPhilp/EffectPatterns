/**
 * Database info endpoint (Admin only)
 *
 * Returns sanitized DB connection info + a simple SELECT 1.
 */

import { createDatabase } from "@effect-patterns/toolkit";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import { validateAdminKey } from "../../../src/auth/adminAuth";
import { runWithRuntime } from "../../../src/server/init";
import { errorHandler } from "../../../src/server/errorHandler";

function sanitizeDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(":", ""),
      host: parsed.host,
      database: parsed.pathname.replace("/", "") || undefined,
      search: parsed.search || undefined,
    };
  } catch {
    return { host: "invalid-url" };
  }
}

const handleDbInfo = Effect.fn("db-info")(function* (request: NextRequest) {
  yield* validateAdminKey(request);

  const rawDatabaseUrl = process.env.DATABASE_URL;
  const overrideUrl = process.env.DATABASE_URL_OVERRIDE;
  const dbUrl = overrideUrl || rawDatabaseUrl;

  if (!dbUrl) {
    return yield* Effect.fail(
      new Error("DATABASE_URL not configured on server")
    );
  }

  const result = yield* Effect.gen(function* () {
    const { db, close } = createDatabase(dbUrl);
    const testQuery = yield* Effect.tryPromise(async () => {
      return await db.execute(sql`SELECT 1 as test`);
    });
    yield* Effect.promise(() => close());
    return testQuery;
  });

  return {
    success: true,
    database: {
      effective: sanitizeDatabaseUrl(dbUrl),
      raw: rawDatabaseUrl ? sanitizeDatabaseUrl(rawDatabaseUrl) : undefined,
      override: overrideUrl ? sanitizeDatabaseUrl(overrideUrl) : undefined,
    },
    testResult: result,
  };
});

export async function GET(request: NextRequest) {
  const result = await runWithRuntime(
    handleDbInfo(request).pipe(Effect.catchAll((error) => errorHandler(error)))
  );

  if (result instanceof Response) {
    return result;
  }

  return NextResponse.json(result, { status: 200 });
}
