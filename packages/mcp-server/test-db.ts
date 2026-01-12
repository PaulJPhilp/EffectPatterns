#!/usr/bin/env bun
/**
 * Test database connection and pattern retrieval
 */

import { Effect } from "effect"
import { createDatabase } from "../../packages/toolkit/src/db/client.js"
import { createEffectPatternRepository } from "../../packages/toolkit/src/repositories/effect-pattern.js"

const testProgram = Effect.gen(function* () {
	console.log("🔍 Testing database connection and pattern retrieval...")

	// Create database connection
	const { db, close } = createDatabase()

	try {
		// Create repository
		const repository = createEffectPatternRepository(db)

		// Test search patterns
		const patterns = yield* repository.findAll(5)

		console.log(`\n✅ Found ${patterns.length} patterns:`)
		patterns.forEach((pattern, index) => {
			console.log(`  ${index + 1}. ${pattern.title} (${pattern.skillLevel})`)
			console.log(`     ${pattern.summary}`)
			console.log(`     Category: ${pattern.category || 'N/A'}`)
			console.log()
		})

		// Test search with query
		const retryPatterns = yield* searchEffectPatterns({
			query: "retry",
			limit: 3
		})

		console.log(`\n🔄 Search results for "retry":`)
		retryPatterns.forEach((pattern, index) => {
			console.log(`  ${index + 1}. ${pattern.title}`)
		})

		// Test search by category
		const concurrencyPatterns = yield* searchEffectPatterns({
			category: "concurrency",
			limit: 3
		})

		console.log(`\n⚡ Concurrency patterns:`)
		concurrencyPatterns.forEach((pattern, index) => {
			console.log(`  ${index + 1}. ${pattern.title}`)
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
