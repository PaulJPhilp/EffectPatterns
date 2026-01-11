/**
 * Ingest Pipeline Service
 *
 * Orchestrates the complete ingest workflow:
 * 1. Discovery & Extraction - Find patterns and extract TypeScript
 * 2. Validation - Validate frontmatter, structure, and code
 * 3. Testing - Run TypeScript examples
 * 4. Comparison - Check for duplicates
 * 5. Migration - Move validated patterns to published
 * 6. Reporting - Generate detailed report
 */

import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as yaml from "yaml";
import type {
	IngestConfig,
	IngestReport,
	IngestResult,
	Pattern,
} from "./types.js";

const execAsync = promisify(exec);

// --- DISCOVERY ---

export const discoverPatterns = (
	config: IngestConfig,
): Effect.Effect<Pattern[], Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		yield* fs.makeDirectory(config.srcDir, { recursive: true });

		const rawFiles = yield* fs.readDirectory(config.rawDir);
		const mdxFiles = rawFiles.filter((f) => f.endsWith(".mdx"));

		const patterns: Pattern[] = [];

		for (const file of mdxFiles) {
			const rawPath = `${config.rawDir}/${file}`;
			const content = yield* fs.readFileString(rawPath);

			// Parse frontmatter
			const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
			const frontmatter = fmMatch
				? (yaml.parse(fmMatch[1] || "{}") as Record<string, unknown>)
				: {};

			const id =
				(frontmatter.id as string) ||
				file.replace(".mdx", "");
			const srcPath = `${config.srcDir}/${id}.ts`;
			const processedPath = `${config.processedDir}/${file}`;

			// Extract TypeScript code
			const codeMatch = content.match(
				/##\s+Good Example[\s\S]*?```typescript\n([\s\S]*?)\n```/,
			);
			let hasTypeScript = false;

			if (codeMatch?.[1]) {
				const tsCode = codeMatch[1].trim();
				yield* fs.writeFileString(srcPath, tsCode);
				hasTypeScript = true;
			}

			patterns.push({
				id,
				title: (frontmatter.title as string) || id,
				rawPath,
				srcPath,
				processedPath,
				frontmatter,
				hasTypeScript,
			});
		}

		return patterns;
	});

// --- VALIDATION ---

export const validatePattern = (
	pattern: Pattern,
	config: IngestConfig,
): Effect.Effect<IngestResult, never, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const issues: IngestResult["issues"] = [];

		// Validate frontmatter
		const required = ["id", "title", "skillLevel", "useCase", "summary"];
		for (const field of required) {
			if (!pattern.frontmatter[field]) {
				issues.push({
					type: "error",
					category: "frontmatter",
					message: `Missing required field: ${field}`,
				});
			}
		}

		// Validate TypeScript file
		if (!pattern.hasTypeScript) {
			issues.push({
				type: "error",
				category: "files",
				message: "TypeScript file not found",
			});
		}

		// Validate content structure
		const content = yield* fs.readFileString(pattern.rawPath);
		if (!/##\s+Good Example/i.test(content)) {
			issues.push({
				type: "error",
				category: "structure",
				message: "Missing 'Good Example' section",
			});
		}
		if (!/##\s+Anti-Pattern/i.test(content)) {
			issues.push({
				type: "warning",
				category: "structure",
				message: "Missing 'Anti-Pattern' section",
			});
		}

		const errors = issues.filter((i) => i.type === "error").length;

		return {
			pattern,
			valid: errors === 0,
			issues,
		};
	}).pipe(
		Effect.catchAll(() =>
			Effect.succeed({
				pattern,
				valid: false,
				issues: [
					{
						type: "error" as const,
						category: "files",
						message: "Failed to read pattern file",
					},
				],
			}),
		),
	);

export const validatePatterns = (
	patterns: Pattern[],
	config: IngestConfig,
): Effect.Effect<IngestResult[], Error, FileSystem.FileSystem> =>
	Effect.all(
		patterns.map((p) => validatePattern(p, config)),
		{ concurrency: 10 },
	);

// --- TESTING ---

export const testPattern = (
	result: IngestResult,
): Effect.Effect<IngestResult, never, never> =>
	Effect.promise(async () => {
		if (!(result.valid && result.pattern.hasTypeScript)) {
			return { ...result, testPassed: false };
		}

		try {
			await execAsync(`bun run ${result.pattern.srcPath}`, {
				timeout: 10_000,
				maxBuffer: 1024 * 1024,
			});
			return { ...result, testPassed: true };
		} catch {
			return { ...result, testPassed: false };
		}
	});

export const testPatterns = (
	results: IngestResult[],
): Effect.Effect<IngestResult[], never, never> =>
	Effect.all(
		results.map((r) => testPattern(r)),
		{ concurrency: 5 },
	);

// --- DUPLICATE DETECTION ---

export const checkDuplicates = (
	results: IngestResult[],
	config: IngestConfig,
): Effect.Effect<IngestResult[], Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const existing = yield* fs.readDirectory(config.targetPublishedDir);
		const existingIds = new Set(
			existing
				.filter((f) => f.endsWith(".mdx"))
				.map((f) => f.replace(".mdx", "")),
		);

		return results.map((result) => {
			if (existingIds.has(result.pattern.id)) {
				return {
					...result,
					isDuplicate: true,
					existingPatternId: result.pattern.id,
				};
			}
			return result;
		});
	});

// --- MIGRATION ---

export const migratePattern = (
	result: IngestResult,
	config: IngestConfig,
): Effect.Effect<boolean, never, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		if (!(result.valid && result.testPassed) || result.isDuplicate) {
			return false;
		}

		const fs = yield* FileSystem.FileSystem;

		try {
			// Read the raw MDX
			const rawMdx = yield* fs.readFileString(result.pattern.rawPath);

			// Read TypeScript code and embed it
			let publishedMdx = rawMdx;
			if (result.pattern.hasTypeScript) {
				const tsCode = yield* fs.readFileString(result.pattern.srcPath);
				// Replace code block with embedded code (for published version)
				publishedMdx = rawMdx.replace(
					/## Good Example[\s\S]*?```typescript\n[\s\S]*?\n```/,
					`## Good Example\n\n\`\`\`typescript\n${tsCode}\n\`\`\``,
				);
			}

			// Write to published directory
			const targetPath = `${config.publishedDir}/${result.pattern.id}.mdx`;
			yield* fs.writeFileString(targetPath, publishedMdx);

			return true;
		} catch {
			return false;
		}
	}).pipe(Effect.catchAll(() => Effect.succeed(false)));

export const migratePatterns = (
	results: IngestResult[],
	config: IngestConfig,
): Effect.Effect<IngestResult[], Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const migratable = results.filter(
			(r) => r.valid && r.testPassed && !r.isDuplicate,
		);

		for (const result of migratable) {
			yield* migratePattern(result, config);
		}

		return results;
	});

// --- REPORTING ---

export const generateReport = (results: IngestResult[]): IngestReport => ({
	timestamp: new Date().toISOString(),
	totalPatterns: results.length,
	validated: results.filter((r) => r.valid).length,
	testsPassed: results.filter((r) => r.testPassed).length,
	duplicates: results.filter((r) => r.isDuplicate).length,
	migrated: results.filter(
		(r) => r.valid && r.testPassed && !r.isDuplicate,
	).length,
	failed: results.filter((r) => !(r.valid && r.testPassed)).length,
	results,
});

// --- FULL PIPELINE ---

export const runIngestPipeline = (
	config: IngestConfig,
): Effect.Effect<IngestReport, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		// Stage 1: Discovery
		const patterns = yield* discoverPatterns(config);

		// Stage 2: Validation
		let results = yield* validatePatterns(patterns, config);

		// Stage 3: Testing
		results = yield* testPatterns(results);

		// Stage 4: Duplicate check
		results = yield* checkDuplicates(results, config);

		// Stage 5: Migration
		results = yield* migratePatterns(results, config);

		// Stage 6: Report
		const report = generateReport(results);

		return report;
	});
