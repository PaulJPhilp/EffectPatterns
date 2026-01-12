/**
 * Simple database reset endpoint - creates minimal schema
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

		// Drop existing tables
		await db.execute(sql`DROP TABLE IF EXISTS effect_patterns CASCADE`)
		await db.execute(sql`DROP TABLE IF EXISTS application_patterns CASCADE`)

		// Create effect_patterns table with minimal schema
		await db.execute(sql`
			CREATE TABLE effect_patterns (
				id UUID PRIMARY KEY,
				title TEXT NOT NULL,
				skill_level TEXT NOT NULL,
				category TEXT NOT NULL,
				slug VARCHAR(255) NOT NULL UNIQUE,
				summary TEXT NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`)

		// Create application_patterns table with minimal schema
		await db.execute(sql`
			CREATE TABLE application_patterns (
				id UUID PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				description TEXT NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`)

		await close()

		return NextResponse.json({
			success: true,
			message: "Database reset completed with minimal schema",
			tablesRecreated: 2
		})
	} catch (error) {
		console.error("Reset error:", error)
		const errorMessage = error instanceof Error ? error.message : String(error)
		return NextResponse.json(
			{
				success: false,
				error: "Database reset failed",
				details: errorMessage
			},
			{ status: 500 }
		)
	}
}
