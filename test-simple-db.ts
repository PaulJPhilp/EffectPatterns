#!/usr/bin/env bun
/**
 * Simple test of database connection and pattern count
 */

import { Effect } from "effect"
import { createDatabase } from "./packages/toolkit/src/db/client.js"

const testProgram = Effect.gen(function* () {
	console.log("🔍 Testing database connection...")

	// Create database connection
	const { db, close } = createDatabase()

	try {
		// Simple query to count patterns
		const result = yield* Effect.tryPromise(async () => {
			const patterns = await db.select({
				id: true,
				title: true,
				skillLevel: true,
				category: true
			}).from(db.effectPatterns || db.select().from({ effectPatterns: {} }))
			return patterns
		})

		console.log(`\n✅ Database connected successfully!`)
		console.log(`📊 Found ${result.length} patterns in database`)

		// Show first few patterns
		result.slice(0, 5).forEach((pattern: any, i: number) => {
			console.log(`  ${i + 1}. ${pattern.title} (${pattern.skillLevel})`)
		})

	} finally {
		yield* Effect.promise(() => close())
	}
})

// Run the test
Effect.runPromise(testProgram).catch((error) => {
	console.error("❌ Test failed:", error)
	process.exit(1)
})
