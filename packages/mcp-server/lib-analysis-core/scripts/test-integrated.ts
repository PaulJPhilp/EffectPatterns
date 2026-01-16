#!/usr/bin/env bun

/**
 * Integrated Test Runner for Effect Patterns Analysis System
 * 
 * This script provides convenient ways to run different test categories
 * from the integrated test plan.
 */

import { execSync } from "child_process";
import { existsSync } from "fs";

const testCategories = {
	registry: {
		description: "Rule Registry Integrity Tests",
		path: "packages/analysis-core/src/__tests__/registry/",
	},
	categories: {
		description: "Category Coverage Tests",
		path: "packages/analysis-core/src/__tests__/categories/",
	},
	severity: {
		description: "Severity Distribution Tests",
		path: "packages/analysis-core/src/__tests__/severity/",
	},
	integration: {
		description: "Analysis Engine Integration Tests",
		path: "packages/analysis-core/src/__tests__/integration/",
	},
	mcp: {
		description: "MCP Output Contract Tests",
		path: "packages/analysis-core/src/__tests__/mcp/",
	},
	"fix-mapping": {
		description: "Fix Mapping Tests",
		path: "packages/analysis-core/src/__tests__/fix-mapping/",
	},
	regression: {
		description: "Regression/Snapshot Tests",
		path: "packages/analysis-core/src/__tests__/regression/",
	},
	performance: {
		description: "Performance Smoke Tests",
		path: "packages/analysis-core/src/__tests__/performance/",
	},
	rules: {
		description: "Rule-Level Unit Tests",
		path: "packages/analysis-core/src/__tests__/rules/",
	},
};

function showUsage() {
	console.log("🧪 Effect Patterns Analysis System - Integrated Test Runner\n");
	console.log("Usage:");
	console.log("  bun run test:integrated [category] [options]\n");
	console.log("Categories:");
	Object.entries(testCategories).forEach(([key, config]) => {
		console.log(`  ${key.padEnd(12)} ${config.description}`);
	});
	console.log("\nOptions:");
	console.log("  --coverage   Run with coverage report");
	console.log("  --watch      Run in watch mode");
	console.log("  --verbose    Verbose output");
	console.log("\nExamples:");
	console.log("  bun run test:integrated registry");
	console.log("  bun run test:integrated all --coverage");
	console.log("  bun run test:integrated performance --verbose");
}

function runTests(category: string, options: { coverage?: boolean; watch?: boolean; verbose?: boolean }) {
	const testPath = category === "all"
		? "packages/analysis-core/src/__tests__/"
		: (testCategories as any)[category]?.path;

	if (!testPath) {
		console.error(`❌ Unknown test category: ${category}`);
		showUsage();
		process.exit(1);
	}

	if (!existsSync(testPath)) {
		console.error(`❌ Test directory not found: ${testPath}`);
		process.exit(1);
	}

	const vitestArgs = ["test", testPath];

	if (options.coverage) {
		vitestArgs.push("--coverage");
	}

	if (options.watch) {
		vitestArgs.push("--watch");
	}

	if (options.verbose) {
		vitestArgs.push("--reporter=verbose");
	}

	console.log(`🧪 Running ${category === "all" ? "all" : (testCategories as any)[category]?.description}...\n`);

	try {
		execSync(`bun ${vitestArgs.join(" ")}`, {
			stdio: "inherit",
			cwd: process.cwd()
		});
	} catch (error) {
		console.error(`❌ Tests failed for category: ${category}`);
		process.exit(1);
	}
}

function showTestSummary() {
	console.log("📊 Effect Patterns Analysis System - Test Summary\n");
	console.log("Test Categories:");
	Object.entries(testCategories).forEach(([key, config]) => {
		console.log(`  ✓ ${key.padEnd(12)} ${config.description}`);
	});
	console.log("\nKey Metrics:");
	console.log("  • Total Rules: 68");
	console.log("  • Total Categories: 9");
	console.log("  • Total Fixes: 58");
	console.log("  • High Severity Rules: 15-25");
	console.log("  • Test Files: 10+ comprehensive test suites");
	console.log("\nRun 'bun run test:integrated --help' for usage information.");
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
	showTestSummary();
	process.exit(0);
}

if (args[0] === "--help" || args[0] === "-h") {
	showUsage();
	process.exit(0);
}

const category = args[0];
const options = {
	coverage: args.includes("--coverage"),
	watch: args.includes("--watch"),
	verbose: args.includes("--verbose"),
};

runTests(category, options);
