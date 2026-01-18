/**
 * Database connection test endpoint (Admin only)
 *
 * Requires ADMIN_API_KEY for authentication.
 * Returns database connection status and test results.
 */

import { createDatabase } from "@effect-patterns/toolkit"
import { sql } from "drizzle-orm"
import { Effect } from "effect"
import { type NextRequest, NextResponse } from "next/server"
import { validateAdminKey } from "../../../src/auth/adminAuth"
import { runWithRuntime } from "../../../src/server/init"
import { errorHandler } from "../../../src/server/errorHandler"

const handleDbCheck = Effect.fn("db-check")(function* (request: NextRequest) {
	yield* validateAdminKey(request)

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

export async function GET(request: NextRequest) {
	const result = await runWithRuntime(
		handleDbCheck(request).pipe(
			Effect.catchAll((error) => errorHandler(error))
		)
	)

	if (result instanceof Response) {
		return result
	}

	return NextResponse.json(result, { status: 200 })
}
