#!/usr/bin/env bun

/**
 * Comprehensive fix for test files
 * 
 * This script fixes:
 * 1. Replace analyzeCode with analyzeFile calls
 * 2. Fix Effect.runPromise type issues
 * 3. Fix import paths
 * 4. Add proper type annotations
 */

import { readFileSync, writeFileSync } from "fs";

const testFiles = [
	"src/__tests__/integration/analysis-engine-integration.test.ts",
	"src/__tests__/mcp/mcp-output-contract.test.ts",
	"src/__tests__/fix-mapping/fix-mapping.test.ts",
	"src/__tests__/regression/regression-snapshots.test.ts",
	"src/__tests__/performance/performance-smoke.test.ts",
	"src/__tests__/integration/end-to-end-confidence.test.ts",
];

function fixTestFile(filePath: string) {
	console.log(`Fixing ${filePath}...`);

	try {
		let content = readFileSync(filePath, "utf8");

		// Fix 1: Replace analyzeCode with analyzeFile
		content = content.replace(
			/analysisService\.analyzeCode\(/g,
			'analysisService.analyzeFile('
		);

		// Fix 2: Fix analyzeFile calls - swap parameter order
		content = content.replace(
			/analysisService\.analyzeFile\(([^,]+),\s*([^)]+)\)/g,
			'analysisService.analyzeFile($2, $1)'
		);

		// Fix 3: Add proper type imports
		if (content.includes('AnalysisService') && !content.includes('import type { AnalysisServiceApi')) {
			content = content.replace(
				/import { AnalysisService } from/,
				'import type { AnalysisServiceApi } from "../../services/analysis-service";\nimport { AnalysisService } from'
			);
		}

		if (content.includes('RuleRegistryService') && !content.includes('import type { RuleDefinition')) {
			content = content.replace(
				/import { RuleRegistryService } from/,
				'import type { RuleDefinition, FixDefinition } from "../../services/rule-registry";\nimport { RuleRegistryService } from'
			);
		}

		// Fix 4: Fix Effect.runPromise calls with proper typing
		content = content.replace(
			/Effect\.runPromise\(\s*Effect\.gen\(function\* \(\) \{([\s\S]*?)\}\)\.pipe\(Effect\.provide\(AnalysisService\.Default\)\)\)/g,
			(_match, genBody) => {
				return `Effect.runPromise(
	Effect.gen(function* () {${genBody}}).pipe(
		Effect.provide(AnalysisService.Default)
	)
)`;
			}
		);

		// Fix 5: Fix array iteration with explicit types
		content = content.replace(
			/for \(const (\w+) of (\w+)\) \{/g,
			(match, param, array) => {
				if (array.includes('rules')) {
					return `for (const ${param} of ${array} as RuleDefinition[]) {`;
				}
				if (array.includes('fixes')) {
					return `for (const ${param} of ${array} as FixDefinition[]) {`;
				}
				return match;
			}
		);

		// Fix 6: Fix map/filter callbacks
		content = content.replace(
			/\.map\((\w+):/g,
			(match, param) => {
				if (param === 'r') return '.map((r: RuleDefinition):';
				if (param === 'f') return '.map((f: FixDefinition):';
				return match;
			}
		);

		content = content.replace(
			/\.filter\((\w+):/g,
			(match, param) => {
				if (param === 'r') return '.filter((r: RuleDefinition):';
				if (param === 'f') return '.filter((f: FixDefinition):';
				return match;
			}
		);

		// Fix 7: Fix severityOrder object access
		content = content.replace(
			/const severityOrder = \{ high: 3, medium: 2, low: 1 \};/g,
			'const severityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };'
		);

		// Fix 8: Fix parameter types in callbacks
		content = content.replace(
			/\((\w):/g,
			(match, param) => {
				if (param === 'r') return '(r: RuleDefinition:';
				if (param === 'f') return '(f: FixDefinition:';
				if (param === 'v') return '(v: any:';
				if (param === 's') return '(s: string:';
				return match;
			}
		);

		writeFileSync(filePath, content);
		console.log(`✅ Fixed ${filePath}`);

	} catch (error) {
		console.error(`❌ Error fixing ${filePath}:`, error);
	}
}

// Execute fixes
console.log("🔧 Applying comprehensive fixes to test files...\n");

testFiles.forEach(fixTestFile);

console.log("\n✅ All fixes applied!");
console.log("\n💡 Key changes made:");
console.log("  - analyzeCode → analyzeFile (with corrected parameter order)");
console.log("  - Added proper type imports");
console.log("  - Fixed Effect.runPromise typing");
console.log("  - Added explicit type annotations for arrays");
console.log("  - Fixed callback parameter types");
