import { Effect } from "effect";
import { AnalysisService } from "../packages/analysis-core/src/index";

/**
 * Debug script for verifying blocking-calls-in-effect rule.
 * Run from project root: bun scripts/debug-blocking.ts
 */
Effect.gen(function* () {
	const analysisService = yield* AnalysisService;

	console.log("Checking blocking-calls-in-effect rule robustness...");

	const report = yield* analysisService.analyzeFile(
		"test.ts",
		`
import * as fs from 'fs';

// This Effect.gen block indicates Effect usage even without an explicit 'effect' import
Effect.gen(function* () {
  const data = fs.readFileSync('file.txt', 'utf-8');
  return data;
});
`
	);

	const findings = report.findings.filter(f => f.ruleId === "blocking-calls-in-effect");
	
	if (findings.length > 0) {
		console.log("✅ SUCCESS: Found blocking-calls-in-effect finding!");
		findings.forEach(f => {
			console.log(`- [${f.severity}] ${f.message} (Line ${f.range.startLine})`);
		});
	} else {
		console.log("❌ FAILURE: No findings found. Rule detection still failing for snippets without imports.");
		
		console.log("\nAll findings found:");
		report.findings.forEach(f => {
			console.log(`- ${f.ruleId}: ${f.message}`);
		});
	}

}).pipe(
	Effect.provide(AnalysisService.Default), 
	Effect.runPromise
).catch(e => {
	console.error("Script failed:", e);
	process.exit(1);
});
