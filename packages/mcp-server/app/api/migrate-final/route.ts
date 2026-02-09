/**
 * Final migration endpoint - uses migration format without UUID defaults
 */

import { createDatabase } from "@effect-patterns/toolkit"
import { sql } from "drizzle-orm"
import { Effect } from "effect"
import { type NextRequest } from "next/server"
import { createSimpleHandler } from "../../../src/server/routeHandler"

const handleMigrateFinal = (_request: NextRequest) => Effect.gen(function* () {
	const dbUrl = process.env.DATABASE_URL
	if (!dbUrl) {
		return yield* Effect.fail(new Error("DATABASE_URL not set"))
	}

	yield* Effect.tryPromise(async () => {
		const { db, close } = createDatabase(dbUrl)
		try {
			// Drop existing tables
			await db.execute(sql`DROP TABLE IF EXISTS pattern_relations CASCADE`)
			await db.execute(sql`DROP TABLE IF EXISTS pattern_jobs CASCADE`)
			await db.execute(sql`DROP TABLE IF EXISTS jobs CASCADE`)
			await db.execute(sql`DROP TABLE IF EXISTS effect_patterns CASCADE`)
			await db.execute(sql`DROP TABLE IF EXISTS application_patterns CASCADE`)

			// Create tables using migration format without UUID defaults
			await db.execute(sql`CREATE TABLE "application_patterns" (
				"id" uuid PRIMARY KEY NOT NULL,
				"slug" varchar(255) NOT NULL,
				"name" varchar(255) NOT NULL,
				"description" text NOT NULL,
				"learning_order" integer NOT NULL,
				"effect_module" varchar(100),
				"sub_patterns" jsonb DEFAULT '[]'::jsonb,
				"created_at" timestamp DEFAULT now() NOT NULL,
				"updated_at" timestamp DEFAULT now() NOT NULL,
				CONSTRAINT "application_patterns_slug_unique" UNIQUE("slug")
			)`)

			await db.execute(sql`CREATE TABLE "effect_patterns" (
				"id" uuid PRIMARY KEY NOT NULL,
				"slug" varchar(255) NOT NULL,
				"title" varchar(500) NOT NULL,
				"summary" text NOT NULL,
				"skill_level" varchar(50) NOT NULL,
				"category" varchar(100),
				"difficulty" varchar(50),
				"tags" jsonb DEFAULT '[]'::jsonb,
				"examples" jsonb DEFAULT '[]'::jsonb,
				"use_cases" jsonb DEFAULT '[]'::jsonb,
				"rule" jsonb,
				"content" text,
				"author" varchar(255),
				"lesson_order" integer,
				"application_pattern_id" uuid,
				"validated" boolean DEFAULT false NOT NULL,
				"validated_at" timestamp,
				"created_at" timestamp DEFAULT now() NOT NULL,
				"updated_at" timestamp DEFAULT now() NOT NULL,
				CONSTRAINT "effect_patterns_slug_unique" UNIQUE("slug")
			)`)

			// Create indexes
			await db.execute(sql`CREATE UNIQUE INDEX "application_patterns_slug_idx" ON "application_patterns" USING btree ("slug")`)
			await db.execute(sql`CREATE INDEX "application_patterns_learning_order_idx" ON "application_patterns" USING btree ("learning_order")`)
			await db.execute(sql`CREATE UNIQUE INDEX "effect_patterns_slug_idx" ON "effect_patterns" USING btree ("slug")`)
			await db.execute(sql`CREATE INDEX "effect_patterns_skill_level_idx" ON "effect_patterns" USING btree ("skill_level")`)
			await db.execute(sql`CREATE INDEX "effect_patterns_category_idx" ON "effect_patterns" USING btree ("category")`)
		} finally {
			await close()
		}
	})

	return {
		success: true,
		message: "Database migration completed with proper schema",
		tablesCreated: 2
	}
})

export const POST = createSimpleHandler(handleMigrateFinal, {
	requireAuth: false,
	requireAdmin: true,
})
