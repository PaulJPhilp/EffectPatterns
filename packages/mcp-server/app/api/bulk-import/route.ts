/**
 * Bulk import data endpoint
 */

import { createDatabase } from "@effect-patterns/toolkit";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { type NextRequest } from "next/server";
import { ValidationError } from "../../../src/errors";
import { createSimpleHandler } from "../../../src/server/routeHandler";

const handleBulkImport = (request: NextRequest) => Effect.gen(function* () {
  const body = (yield* Effect.tryPromise({
    try: () => request.json(),
    catch: () =>
      new ValidationError({
        field: "body",
        message: "Invalid JSON request body",
      }),
  })) as Record<string, unknown>;
  const { patterns } = body;

  if (!Array.isArray(patterns)) {
    return yield* Effect.fail(
      new ValidationError({
        field: "patterns",
        message: "patterns must be an array",
        value: patterns,
      })
    );
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return yield* Effect.fail(new Error("DATABASE_URL not set"));
  }

  const imported = yield* Effect.tryPromise(async () => {
    const { db, close } = createDatabase(dbUrl);
    try {
      let importedCount = 0;
      for (const pattern of patterns as Array<Record<string, unknown>>) {
        await db.execute(sql`
          INSERT INTO effect_patterns (
            id, slug, title, summary, skill_level, category, difficulty,
            tags, examples, use_cases, rule, content, author, lesson_order,
            application_pattern_id, validated, validated_at, created_at, updated_at
          ) VALUES (
            ${pattern.id}, ${pattern.slug}, ${pattern.title}, ${pattern.summary},
            ${pattern.skill_level}, ${pattern.category}, ${pattern.difficulty},
            ${JSON.stringify(pattern.tags || [])}::jsonb,
            ${JSON.stringify(pattern.examples || [])}::jsonb,
            ${JSON.stringify(pattern.use_cases || [])}::jsonb,
            ${pattern.rule ? JSON.stringify(pattern.rule) : null}::jsonb,
            ${pattern.content}, ${pattern.author}, ${pattern.lesson_order},
            ${pattern.application_pattern_id}, ${pattern.validated}, ${pattern.validated_at},
            ${pattern.created_at}, ${pattern.updated_at}
          )
          ON CONFLICT (id) DO NOTHING
        `);
        importedCount++;
      }
      return importedCount;
    } finally {
      await close();
    }
  });

  return {
    success: true,
    message: `Imported ${imported} patterns`,
    imported,
  };
});

export const POST = createSimpleHandler(handleBulkImport, {
  requireAuth: false,
  requireAdmin: true,
});
