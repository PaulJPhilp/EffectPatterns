/**
 * Database info endpoint (Admin only)
 *
 * Returns sanitized DB connection info + a simple SELECT 1.
 */

import { createDatabase } from "@effect-patterns/toolkit";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { type NextRequest } from "next/server";
import { createRouteHandler } from "../../../src/server/routeHandler";

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

export const GET = createRouteHandler(handleDbInfo, {
  requireAuth: false,
  requireAdmin: true,
});
