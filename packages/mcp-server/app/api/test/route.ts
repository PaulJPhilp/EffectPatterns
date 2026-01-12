/**
 * Simple test endpoint to verify database connection
 */

import { createDatabase, effectPatterns } from "@effect-patterns/toolkit"
import { Effect } from "effect"
import { NextResponse } from "next/server"

export async function GET() {
	try {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const { db, close } = createDatabase()

				const patterns = yield* Effect.tryPromise(async () => {
					return await db.select({
						id: effectPatterns.id,
						title: effectPatterns.title,
						skillLevel: effectPatterns.skillLevel,
						category: effectPatterns.category
					}).from(effectPatterns).limit(5)
				})

				yield* Effect.promise(() => close())
				return patterns
			})
		)

		return NextResponse.json({
			success: true,
			count: result.length,
			patterns: result.map((p: any) => ({
				id: p.id,
				title: p.title,
				skillLevel: p.skillLevel,
				category: p.category
			}))
		})
	} catch (error) {
		console.error("Database test error:", error)
		return NextResponse.json(
			{ success: false, error: "Database connection failed" },
			{ status: 500 }
		)
	}
}

