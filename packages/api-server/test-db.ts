#!/usr/bin/env bun
/**
 * Test database connection and pattern retrieval
 */

import { createDatabase, createEffectPatternRepository, searchEffectPatterns } from "@effect-patterns/toolkit"
import { Effect } from "effect"

const testProgram = Effect.gen(function* () {
	console.log("🔍 Testing database connection and pattern retrieval...")

	// Create database connection
	const { db, close } = createDatabase()

	try {
		// Create repository
		const repository = createEffectPatternRepository(db)

		// Test search patterns
		const patterns = yield* Effect.promise(() => repository.findAll(5))
		const patternsArray = patterns as unknown as any[]

		console.log(`\n✅ Found ${patternsArray?.length || 0} patterns:`)
		if (patternsArray) {
			patternsArray.forEach((pattern: any, index: number) => {
				console.log(`  ${index + 1}. ${pattern.title} (${pattern.skillLevel || 'N/A'})`)
				console.log(`     ${pattern.summary || pattern.description || 'No summary'}`)
				console.log(`     Category: ${pattern.category || 'N/A'}`)
				console.log()
			})
		}

		// Test search with query
		const retryPatterns = yield* searchEffectPatterns({
			query: "retry",
			limit: 3
		})
		const retryArray = retryPatterns as unknown as any[]

		console.log(`\n🔄 Search results for "retry":`)
		if (retryArray) {
			retryArray.forEach((pattern: any, index: number) => {
				console.log(`  ${index + 1}. ${pattern.title}`)
			})
		}

		// Test search by category
		const concurrencyPatterns = yield* searchEffectPatterns({
			category: "concurrency",
			limit: 3
		})
		const concurrencyArray = concurrencyPatterns as unknown as any[]

		console.log(`\n⚡ Concurrency patterns:`)
		if (concurrencyArray) {
			concurrencyArray.forEach((pattern: any, index: number) => {
				console.log(`  ${index + 1}. ${pattern.title}`)
			})
		}

	} finally {
		yield* Effect.promise(() => close())
	}
})

// Run the test
Effect.runPromise(testProgram as any).catch((error) => {
	console.error("❌ Test failed:", error)
	process.exit(1)
})
