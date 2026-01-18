#!/usr/bin/env bun

/**
 * Final fix: replace 'violations' with 'findings' and fix analyzeFile usage
 */

import { readFileSync, writeFileSync } from "fs";

const testFiles = [
	"src/__tests__/integration/analysis-engine-integration.test.ts",
	"src/__tests__/mcp/mcp-output-contract.test.ts",
	"src/__tests__/regression/regression-snapshots.test.ts",
	"src/__tests__/integration/end-to-end-confidence.test.ts",
];

function fixFinalIssues(filePath: string) {
	console.log(`Final fixes for ${filePath}...`);

	try {
		let content = readFileSync(filePath, "utf8");

		// Fix 1: Replace result.violations with result.findings
		content = content.replace(/result\.violations/g, 'result.findings');

		// Fix 2: Replace analysisResult.violations with analysisResult.findings  
		content = content.replace(/analysisResult\.violations/g, 'analysisResult.findings');

		// Fix 3: Replace violations.length with findings.length
		content = content.replace(/\.violations\.length/g, '.findings.length');

		// Fix 4: Replace violations.filter with findings.filter
		content = content.replace(/\.violations\.filter/g, '.findings.filter');

		// Fix 5: Replace violations.map with findings.map
		content = content.replace(/\.violations\.map/g, '.findings.map');

		// Fix 6: Fix analyzeFile parameter order (filename, source) not (source, filename)
		content = content.replace(
			/analysisService\.analyzeFile\("([^"]+)",\s*([^)]+)\)/g,
			'analysisService.analyzeFile($2, "$1")'
		);

		// Fix 7: Fix analyzeFile with variables
		content = content.replace(
			/analysisService\.analyzeFile\((\w+),\s*(\w+)\)/g,
			'analysisService.analyzeFile($2, $1)'
		);

		// Fix 8: Fix config parameter - analyzeFile takes optional third parameter
		content = content.replace(
			/analysisService\.analyzeFile\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g,
			'analysisService.analyzeFile($2, $1, { config: $3 })'
		);

		writeFileSync(filePath, content);
		console.log(`✅ Fixed ${filePath}`);

	} catch (error) {
		console.error(`❌ Error fixing ${filePath}:`, error);
	}
}

// Execute fixes
console.log("🔧 Applying final fixes...\n");

testFiles.forEach(fixFinalIssues);

console.log("\n✅ All final fixes applied!");
console.log("\n💡 Changes made:");
console.log("  - violations → findings");
console.log("  - Fixed analyzeFile parameter order");
console.log("  - Fixed config parameter structure");
