#!/usr/bin/env bun
/**
 * Simple test of database connection and pattern count
 */

import { Effect } from "effect"
import { createDatabase } from "./packages/toolkit/src/db/client.js"
import { effectPatterns } from "./packages/toolkit/src/db/schema/index.js"

const testProgram = Effect.gen(function* () {
	console.log("🔍 Testing database connection...")

	// Create database connection
	const { db, close } = createDatabase()

	try {
		// Simple query to count patterns
		const result = yield* Effect.tryPromise(async () => {
			const patterns = await db.select({
				id: effectPatterns.id,
				title: effectPatterns.title,
				skillLevel: effectPatterns.skillLevel,
				category: effectPatterns.category
			}).from(effectPatterns).limit(5)
			return patterns
		})

		console.log(`\n✅ Database connected successfully!`)
		console.log(`📊 Found ${result.length} patterns (showing first 5):`)

		// Show first few patterns
		result.forEach((pattern: any, i: number) => {
			console.log(`  ${i + 1}. ${pattern.title} (${pattern.skillLevel}) - ${pattern.category || 'No category'}`)
		})

		// Count all patterns
		const count = yield* Effect.tryPromise(async () => {
			const result = await db.select({ count: effectPatterns.id }).from(effectPatterns)
			return result.length
		})

		console.log(`\n📈 Total patterns in database: ${count}`)

	} finally {
		yield* Effect.promise(() => close())
	}
})

// Run the test
Effect.runPromise(testProgram).catch((error) => {
	console.error("❌ Test failed:", error)
	process.exit(1)
})
