#!/usr/bin/env bun
/**
 * Extract all patterns from README.md and create a comprehensive patterns JSON file
 * 
 * Usage: bun run scripts/extract-readme-patterns.ts
 */

import { Effect } from "effect"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

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

const extractPatternsProgram = Effect.gen(function* () {
	console.log("📖 Reading README.md to extract patterns...")

	// Read README file
	const readmePath = join(process.cwd(), "README.md")
	const readmeContent = yield* Effect.tryPromise({
		try: () => readFile(readmePath, "utf-8"),
		catch: (error) => new Error(`Failed to read README: ${error}`)
	})

	// Parse patterns from markdown tables
	const patterns: PatternData[] = []
	const lines = readmeContent.split('\n')
	let currentCategory = ""
	let i = 0

	while (i < lines.length) {
		const line = lines[i].trim()

		// Detect category headers (## Category Name)
		if (line.startsWith('## ') && !line.includes('Table of Contents')) {
			currentCategory = line.replace('## ', '').toLowerCase()
			console.log(`\n📂 Found category: ${currentCategory}`)
			i++
			continue
		}

		// Detect table header
		if (line.includes('| Pattern | Skill Level | Summary |')) {
			console.log(`  📋 Found patterns table in ${currentCategory}`)
			i += 2 // Skip header and separator

			// Parse table rows
			while (i < lines.length && lines[i].trim().startsWith('|')) {
				const rowLine = lines[i].trim()

				// Skip separator rows
				if (rowLine.includes('|---')) {
					i++
					continue
				}

				// Parse pattern row
				const columns = rowLine.split('|').map(col => col.trim()).filter(col => col)
				if (columns.length >= 3) {
					const patternCol = columns[0]
					const skillCol = columns[1]
					const summaryCol = columns[2]

					// Extract pattern title and anchor
					const patternMatch = patternCol.match(/\[([^\]]+)\]\(#([^)]+)\)/)
					if (patternMatch) {
						const title = patternMatch[1]
						const anchor = patternMatch[2]

						// Extract skill level
						let skillLevel = "beginner"
						if (skillCol.includes('🟡')) skillLevel = "intermediate"
						if (skillCol.includes('🟠')) skillLevel = "advanced"

						// Clean summary
						const summary = summaryCol.replace(/\*\*/g, '').trim()

						// Generate pattern ID from anchor
						const id = anchor.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()

						const pattern: PatternData = {
							id,
							title,
							description: summary,
							category: currentCategory,
							difficulty: skillLevel,
							tags: [currentCategory],
							examples: [],
							useCases: [],
							effectVersion: "3.x"
						}

						patterns.push(pattern)
						console.log(`    ✓ Extracted: ${title} (${skillLevel})`)
					}
				}
				i++
			}
		} else {
			i++
		}
	}

	console.log(`\n📊 Total patterns extracted: ${patterns.length}`)

	// Create patterns JSON file
	const patternsFile: PatternsFile = {
		version: "1.0.0",
		patterns,
		lastUpdated: new Date().toISOString()
	}

	// Write to JSON file
	const outputPath = join(process.cwd(), "packages/mcp-server/data/all-patterns.json")
	yield* Effect.tryPromise({
		try: () => writeFile(outputPath, JSON.stringify(patternsFile, null, 2)),
		catch: (error) => new Error(`Failed to write patterns file: ${error}`)
	})

	console.log(`\n✅ Patterns saved to: ${outputPath}`)
	console.log(`\n📈 Pattern distribution by category:`)

	// Show distribution
	const distribution = patterns.reduce((acc, pattern) => {
		acc[pattern.category] = (acc[pattern.category] || 0) + 1
		return acc
	}, {} as Record<string, number>)

	Object.entries(distribution).forEach(([category, count]) => {
		console.log(`  ${category}: ${count} patterns`)
	})

	return patterns.length
})

// Helper function to write file
function writeFile(path: string, content: string): Promise<void> {
	return require('node:fs/promises').writeFile(path, content, 'utf-8')
}

// Run the program
Effect.runPromise(extractPatternsProgram).catch((error) => {
	console.error("❌ Error extracting patterns:", error)
	process.exit(1)
})
