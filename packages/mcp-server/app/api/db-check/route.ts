/**
 * Database connection test endpoint (Admin only)
 *
 * Requires ADMIN_API_KEY for authentication.
 * Returns database connection status and test results.
 */

import { createDatabase } from "@effect-patterns/toolkit"
import { sql } from "drizzle-orm"
import { Effect } from "effect"
import { type NextRequest } from "next/server"
import { createRouteHandler } from "../../../src/server/routeHandler"

const handleDbCheck = (_request: NextRequest) => Effect.gen(function* () {
	const dbUrl = process.env.DATABASE_URL
	if (!dbUrl) {
		return yield* Effect.fail(
			new Error("DATABASE_URL not configured on server")
		)
	}

	// Test database connection
	const result = yield* Effect.gen(function* () {
		const { db, close } = createDatabase(dbUrl)

		// Test basic connection with a simple query
		const testQuery = yield* Effect.tryPromise(async () => {
			return await db.execute(sql`SELECT 1 as test`)
		})

		yield* Effect.promise(() => close())
		return testQuery
	})

	return {
		success: true,
		message: "Database connection successful",
		testResult: result
	}
})

export const GET = createRouteHandler(handleDbCheck, {
	requireAuth: false,
	requireAdmin: true,
})
