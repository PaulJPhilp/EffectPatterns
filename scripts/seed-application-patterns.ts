#!/usr/bin/env bun

/**
 * Seed the `application_patterns` table with the 16 top-level categories.
 *
 * Uses UPSERT (on conflict slug) so it is safe to run repeatedly.
 *
 * Usage: bun run scripts/seed-application-patterns.ts
 */

import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { createDatabase } from "../packages/toolkit/src/db/client.js";
import { applicationPatterns } from "../packages/toolkit/src/db/schema/index.js";

const APPLICATION_PATTERN_SEEDS = [
  { slug: "getting-started", name: "Getting Started", description: "Foundational patterns for your first steps with Effect-TS.", learningOrder: 1 },
  { slug: "core-concepts", name: "Core Concepts", description: "Essential building blocks for understanding and using Effect.", learningOrder: 2 },
  { slug: "error-management", name: "Error Management", description: "Patterns for type-safe, composable error handling.", learningOrder: 3 },
  { slug: "resource-management", name: "Resource Management", description: "Safe acquisition, use, and release of resources.", learningOrder: 4 },
  { slug: "concurrency", name: "Concurrency", description: "Patterns for parallel and concurrent execution.", learningOrder: 5 },
  { slug: "streams", name: "Streams", description: "Processing sequences of values over time.", learningOrder: 6 },
  { slug: "scheduling", name: "Scheduling", description: "Patterns for retries, repetition, and time-based execution.", learningOrder: 7 },
  { slug: "domain-modeling", name: "Domain Modeling", description: "Building robust domain models with Effect and Schema.", learningOrder: 8 },
  { slug: "schema", name: "Schema", description: "Validation, parsing, and transformation with @effect/schema.", learningOrder: 9 },
  { slug: "platform", name: "Platform", description: "Cross-platform utilities from @effect/platform.", learningOrder: 10 },
  { slug: "building-apis", name: "Building APIs", description: "Patterns for building robust API services.", learningOrder: 11 },
  { slug: "making-http-requests", name: "Making HTTP Requests", description: "HTTP client patterns with @effect/platform.", learningOrder: 12 },
  { slug: "building-data-pipelines", name: "Building Data Pipelines", description: "Patterns for data ingestion, transformation, and processing.", learningOrder: 13 },
  { slug: "testing", name: "Testing", description: "Patterns for testing Effect-based applications.", learningOrder: 14 },
  { slug: "observability", name: "Observability", description: "Logging, metrics, and tracing patterns.", learningOrder: 15 },
  { slug: "tooling-and-debugging", name: "Tooling & Debugging", description: "Developer tools and debugging techniques for Effect.", learningOrder: 16 },
] as const;

const program = Effect.gen(function* () {
  const { db, close } = createDatabase();
  let upserted = 0;

  for (const seed of APPLICATION_PATTERN_SEEDS) {
    const existing = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ id: applicationPatterns.id })
          .from(applicationPatterns)
          .where(eq(applicationPatterns.slug, seed.slug))
          .limit(1),
      catch: (error) => new Error(`Failed to check ${seed.slug}: ${error}`),
    });

    if (existing.length > 0) {
      yield* Effect.tryPromise({
        try: () =>
          db
            .update(applicationPatterns)
            .set({
              name: seed.name,
              description: seed.description,
              learningOrder: seed.learningOrder,
              validated: true,
              validatedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(applicationPatterns.slug, seed.slug)),
        catch: (error) => new Error(`Failed to update ${seed.slug}: ${error}`),
      });
    } else {
      yield* Effect.tryPromise({
        try: () =>
          db.insert(applicationPatterns).values({
            slug: seed.slug,
            name: seed.name,
            description: seed.description,
            learningOrder: seed.learningOrder,
            validated: true,
            validatedAt: new Date(),
          }),
        catch: (error) => new Error(`Failed to insert ${seed.slug}: ${error}`),
      });
    }

    upserted++;
  }

  // Verify
  const rows = yield* Effect.tryPromise({
    try: () => db.select().from(applicationPatterns),
    catch: (error) => new Error(`Failed to count: ${error}`),
  });

  console.log(`\n✅ Seeded application_patterns!`);
  console.log(`   Upserted: ${upserted}`);
  console.log(`   Total in DB: ${rows.length}`);

  for (const row of rows) {
    console.log(`   ${row.learningOrder}. ${row.slug} → ${row.id}`);
  }

  yield* Effect.promise(() => close());
});

Effect.runPromise(program).catch((error) => {
  console.error("❌ Error seeding application patterns:", error);
  process.exit(1);
});
