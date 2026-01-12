/**
 * Database connection test endpoint
 */

import { createDatabase } from "@effect-patterns/toolkit"
import { sql } from "drizzle-orm"
import { Effect } from "effect"
import { NextResponse } from "next/server"

export async function GET() {
	try {
		const dbUrl = process.env.DATABASE_URL
		if (!dbUrl) {
			return NextResponse.json({
				success: false,
				error: "DATABASE_URL not set"
			}, { status: 500 })
		}

		// Just test database connection without querying tables
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const { db, close } = createDatabase(dbUrl)

				// Test basic connection with a simple query
				const testQuery = yield* Effect.tryPromise(async () => {
					return await db.execute(sql`SELECT 1 as test`)
				})

				yield* Effect.promise(() => close())
				return testQuery
			})
		)

		return NextResponse.json({
			success: true,
			message: "Database connection successful",
			testResult: result
		})
	} catch (error) {
		console.error("Database connection test error:", error)
		const errorMessage = error instanceof Error ? error.message : String(error)
		return NextResponse.json(
			{
				success: false,
				error: "Database connection failed",
				details: errorMessage
			},
			{ status: 500 }
		)
	}
}
