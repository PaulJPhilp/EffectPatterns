#!/usr/bin/env bun

/**
 * Fix lint issues in test files
 * 
 * This script fixes:
 * 1. Import paths from "../services/" to "../../services/"
 * 2. Add proper type annotations for Effect.runPromise
 * 3. Add explicit typing for array iteration parameters
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

const testFiles = [
	"src/__tests__/registry/registry-integrity.test.ts",
	"src/__tests__/categories/category-coverage.test.ts",
	"src/__tests__/severity/severity-distribution.test.ts",
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

		// Fix import paths
		content = content.replace(
			/from "\.\.\/services\//g,
			'from "../../services/'
		);

		// Add type imports at the top
		if (content.includes('RuleRegistryService') && !content.includes('import type')) {
			content = content.replace(
				/import { RuleRegistryService } from/,
				'import type { RuleDefinition, FixDefinition } from "../../services/rule-registry";\nimport { RuleRegistryService } from'
			);
		}

		if (content.includes('AnalysisService') && !content.includes('import type')) {
			content = content.replace(
				/import { AnalysisService } from/,
				'import type { AnalysisReport } from "../../services/analysis-service";\nimport { AnalysisService } from'
			);
		}

		// Fix Effect.runPromise calls to use proper typing
		content = content.replace(
			/Effect\.runPromise\(\s*Effect\.gen\(function\* \(\) \{/g,
			'Effect.runPromise(Effect.gen(function* () {'
		);

		// Fix array iteration with explicit types
		content = content.replace(
			/for \(const (\w+) of (\w+)\) \{/g,
			(match, param, array) => {
				if (array.includes('rules')) {
					return `for (const ${param} of ${array} as RuleDefinition[]) {`;
				}
				if (array.includes('fixes')) {
					return `for (const ${param} of ${array} as FixDefinition[]) {`;
				}
				if (array.includes('violations')) {
					return `for (const ${param} of ${array}) {`;
				}
				return match;
			}
		);

		// Fix map callbacks with explicit types
		content = content.replace(
			/\.map\((\w+) => /g,
			(match, param) => {
				if (param === 'r' && content.includes('rules')) {
					return '.map((r: RuleDefinition) => ';
				}
				if (param === 'f' && content.includes('fixes')) {
					return '.map((f: FixDefinition) => ';
				}
				if (param === 'v' && content.includes('violations')) {
					return '.map((v: any) => ';
				}
				return match;
			}
		);

		// Fix filter callbacks with explicit types  
		content = content.replace(
			/\.filter\((\w+) => /g,
			(match, param) => {
				if (param === 'r' && content.includes('rules')) {
					return '.filter((r: RuleDefinition) => ';
				}
				if (param === 'f' && content.includes('fixes')) {
					return '.filter((f: FixDefinition) => ';
				}
				if (param === 'v' && content.includes('violations')) {
					return '.filter((v: any) => ';
				}
				return match;
			}
		);

		// Fix some callback parameters
		content = content.replace(
			/\((\w)\) => /g,
			(match, param) => {
				if (param === 'r') return '(r: RuleDefinition) => ';
				if (param === 'f') return '(f: FixDefinition) => ';
				if (param === 'v') return '(v: any) => ';
				if (param === 's') return '(s: string) => ';
				return match;
			}
		);

		writeFileSync(filePath, content);
		console.log(`✅ Fixed ${filePath}`);

	} catch (error) {
		console.error(`❌ Error fixing ${filePath}:`, error);
	}
}

// Main execution
console.log("🔧 Fixing lint issues in test files...\n");

testFiles.forEach(fixTestFile);

console.log("\n✅ All test files fixed!");
console.log("\n🧪 Running TypeScript check to verify fixes...");

try {
	execSync("bun run typecheck", { stdio: "inherit" });
	console.log("\n✅ TypeScript check passed!");
} catch (error) {
	console.log("\n⚠️  TypeScript check still has issues. Manual fixes may be needed.");
}
