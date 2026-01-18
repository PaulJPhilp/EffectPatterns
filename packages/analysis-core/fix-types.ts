#!/usr/bin/env bun

/**
 * Fix malformed type annotations created by previous script
 */

import { readFileSync, writeFileSync } from "fs";

const testFiles = [
	"src/__tests__/integration/end-to-end-confidence.test.ts",
	"src/__tests__/mcp/mcp-output-contract.test.ts",
	"src/__tests__/regression/regression-snapshots.test.ts",
	"src/__tests__/fix-mapping/fix-mapping.test.ts",
	"src/__tests__/integration/analysis-engine-integration.test.ts",
];

function fixMalformedTypes(filePath: string) {
	console.log(`Fixing malformed types in ${filePath}...`);

	try {
		let content = readFileSync(filePath, "utf8");

		// Fix malformed type annotations: (v: any: any) => (v: any) =>
		content = content.replace(/\((\w+): (\w+): (\w+)\) =>/g, '($1: $2) =>');

		// Fix malformed type annotations: (s: string: string) => (s: string) =>
		content = content.replace(/\((\w+): (\w+): (\w+)\) =>/g, '($1: $2) =>');

		// Fix malformed return types: (v: any: any) => ({ (v: any) => ({
		content = content.replace(/\((\w+): (\w+): (\w+)\) => \({/g, '($1: $2) => ({');

		writeFileSync(filePath, content);
		console.log(`✅ Fixed ${filePath}`);

	} catch (error) {
		console.error(`❌ Error fixing ${filePath}:`, error);
	}
}

// Execute fixes
console.log("🔧 Fixing malformed type annotations...\n");

testFiles.forEach(fixMalformedTypes);

console.log("\n✅ Type annotation fixes applied!");
