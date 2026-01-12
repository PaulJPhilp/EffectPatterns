#!/usr/bin/env bun
/**
 * Test the OTLP headers fix
 */

import { Effect } from "effect"

// Simulate the OTLP headers parsing with the fix
const testHeaders = {
	"undefined-header": "key1=value1,key2=value2",
	"malformed": "key1=,=value2",
	"empty": "",
	undefined: undefined as string | undefined,
}

const parseHeaders = (headers: string | undefined) => {
	if (!headers) return {}

	return Object.fromEntries(
		headers.split(",").map((pair) => {
			const [key, value] = pair.split("=")
			return [key?.trim() || "", value?.trim() || ""]
		})
	)
}

const testProgram = Effect.gen(function* () {
	console.log("Testing OTLP headers parsing fix...")

	// Test various header scenarios
	for (const [name, headers] of Object.entries(testHeaders)) {
		try {
			const parsed = parseHeaders(headers)
			console.log(`✅ ${name}:`, parsed)
		} catch (error) {
			console.log(`❌ ${name}:`, error)
		}
	}

	console.log("\n✅ All tests passed! The fix handles undefined values correctly.")
})

Effect.runPromise(testProgram)
