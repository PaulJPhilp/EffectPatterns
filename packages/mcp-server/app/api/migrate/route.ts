/**
 * Database migration endpoint
 */

import { createDatabase } from "@effect-patterns/toolkit"
import { sql } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function POST() {
	try {
		const dbUrl = process.env.DATABASE_URL
		if (!dbUrl) {
			return NextResponse.json({
				success: false,
				error: "DATABASE_URL not set"
			}, { status: 500 })
		}

		const { db, close } = createDatabase(dbUrl)

		// Create effect_patterns table
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS effect_patterns (
				id SERIAL PRIMARY KEY,
				title TEXT NOT NULL,
				description TEXT,
				skill_level TEXT NOT NULL,
				category TEXT NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`)

		// Create application_patterns table
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS application_patterns (
				id SERIAL PRIMARY KEY,
				title TEXT NOT NULL,
				description TEXT,
				skill_level TEXT NOT NULL,
				category TEXT NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`)

		await close()

		return NextResponse.json({
			success: true,
			message: "Database migration completed",
			tablesCreated: 2
		})
	} catch (error) {
		console.error("Migration error:", error)
		const errorMessage = error instanceof Error ? error.message : String(error)
		return NextResponse.json(
			{
				success: false,
				error: "Migration failed",
				details: errorMessage
			},
			{ status: 500 }
		)
	}
}
