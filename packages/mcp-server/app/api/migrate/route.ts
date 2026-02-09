/**
 * Database migration endpoint
 */

import { createDatabase } from "@effect-patterns/toolkit"
import { sql } from "drizzle-orm"
import { Effect } from "effect"
import { type NextRequest } from "next/server"
import { createSimpleHandler } from "../../../src/server/routeHandler"

const handleMigrate = (_request: NextRequest) => Effect.gen(function* () {
	const dbUrl = process.env.DATABASE_URL
	if (!dbUrl) {
		return yield* Effect.fail(new Error("DATABASE_URL not set"))
	}

	yield* Effect.tryPromise(async () => {
		const { db, close } = createDatabase(dbUrl)
		try {
			// Create effect_patterns table with full schema
			await db.execute(sql`
				CREATE TABLE IF NOT EXISTS effect_patterns (
					id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
					slug VARCHAR(255) NOT NULL UNIQUE,
					title VARCHAR(500) NOT NULL,
					summary TEXT NOT NULL,
					skill_level VARCHAR(50) NOT NULL,
					category VARCHAR(100),
					difficulty VARCHAR(50),
					tags JSONB DEFAULT '[]',
					examples JSONB DEFAULT '[]',
					use_cases JSONB DEFAULT '[]',
					rule JSONB,
					content TEXT,
					author VARCHAR(255),
					lesson_order INTEGER,
					application_pattern_id UUID REFERENCES application_patterns(id) ON DELETE SET NULL,
					validated BOOLEAN DEFAULT false NOT NULL,
					validated_at TIMESTAMP,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				)
			`)

			// Create application_patterns table with full schema
			await db.execute(sql`
				CREATE TABLE IF NOT EXISTS application_patterns (
					id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
					slug VARCHAR(255) NOT NULL UNIQUE,
					name VARCHAR(255) NOT NULL,
					description TEXT NOT NULL,
					learning_order INTEGER NOT NULL,
					effect_module VARCHAR(100),
					sub_patterns JSONB DEFAULT '[]',
					validated BOOLEAN DEFAULT false NOT NULL,
					validated_at TIMESTAMP,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				)
			`)
		} finally {
			await close()
		}
	})

	return {
		success: true,
		message: "Database migration completed",
		tablesCreated: 2
	}
})

export const POST = createSimpleHandler(handleMigrate, {
	requireAuth: false,
	requireAdmin: true,
})
