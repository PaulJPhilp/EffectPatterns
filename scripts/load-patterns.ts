#!/usr/bin/env bun
/**
 * Load patterns from JSON file into PostgreSQL database
 * 
 * Usage: bun run scripts/load-patterns.ts
 */

import { Effect } from "effect"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { createDatabase } from "../packages/toolkit/src/db/client.js"
import { effectPatterns } from "../packages/toolkit/src/db/schema/index.js"

interface PatternData {
	id: string
	title: string
	description: string
	category: string
	difficulty: string
	tags: string[]
	examples: Array<{
		language: string
		code: string
		description: string
	}>
	useCases: string[]
	relatedPatterns?: string[]
	effectVersion: string
}

interface PatternsFile {
	version: string
	patterns: PatternData[]
	lastUpdated: string
}

const loadPatternsProgram = Effect.gen(function* () {
	console.log("📚 Loading patterns from JSON file...")

	// Read patterns JSON file
	const jsonPath = join(process.cwd(), "packages/mcp-server/data/all-patterns.json")
	const jsonContent = yield* Effect.tryPromise({
		try: () => readFile(jsonPath, "utf-8"),
		catch: (error) => new Error(`Failed to read patterns file: ${error}`)
	})

	const data: PatternsFile = JSON.parse(jsonContent)
	console.log(`Found ${data.patterns.length} patterns to load`)

	// Create database connection
	const { db, close } = createDatabase()

	// Clear existing patterns (optional - comment out if you want to keep existing)
	console.log("\n🗑️  Clearing existing patterns...")
	yield* Effect.tryPromise({
		try: () => db.delete(effectPatterns),
		catch: (error) => new Error(`Failed to clear patterns: ${error}`)
	})

	// Insert patterns
	console.log("\n📝 Inserting patterns...")
	for (const pattern of data.patterns) {
		const skillLevel = pattern.difficulty === "beginner"
			? "beginner"
			: pattern.difficulty === "advanced"
				? "advanced"
				: "intermediate"

		yield* Effect.tryPromise({
			try: () => db.insert(effectPatterns).values({
				slug: pattern.id,
				title: pattern.title,
				summary: pattern.description,
				skillLevel,
				category: pattern.category,
				difficulty: pattern.difficulty,
				tags: pattern.tags,
				examples: pattern.examples.map(ex => ({
					language: ex.language,
					code: ex.code,
					description: ex.description
				})),
				useCases: pattern.useCases,
				content: `# ${pattern.title}\n\n${pattern.description}`,
				author: "Effect Patterns Team",
				validated: true,
				validatedAt: new Date(),
			}),
			catch: (error) => new Error(`Failed to insert pattern ${pattern.id}: ${error}`)
		})

		console.log(`  ✓ Loaded: ${pattern.title}`)
	}

	console.log(`\n✅ Successfully loaded ${data.patterns.length} patterns!`)

	// Verify
	const count = yield* Effect.tryPromise({
		try: () => db.select().from(effectPatterns).then(result => result.length),
		catch: (error) => new Error(`Failed to count patterns: ${error}`)
	})

	console.log(`\n📊 Total patterns in database: ${count}`)

	// Close database connection
	yield* Effect.promise(() => close())

	return count
})

// Run the program
Effect.runPromise(loadPatternsProgram).catch((error) => {
	console.error("❌ Error loading patterns:", error)
	process.exit(1)
})
