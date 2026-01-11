/**
 * Ingest Processor Service
 *
 * Processes raw MDX files from content/new/raw:
 * - Validates frontmatter and required sections
 * - Extracts TypeScript from Good Example into content/new/src/{id}.ts
 * - Replaces code block with <Example /> tag
 * - Writes to content/new/processed/{id}.mdx
 */

import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import * as yaml from "yaml";
import type {
	IngestConfig,
	ProcessResult,
	ProcessSummary
} from "./types.js";

// --- HELPERS ---

function parseMdx(
	raw: string,
): { frontmatter: Record<string, unknown>; content: string } | null {
	const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!fmMatch) return null;

	const frontmatter = yaml.parse(fmMatch[1] || "{}") as Record<string, unknown>;
	const content = fmMatch[2] ?? "";
	return { frontmatter, content };
}

function extractGoodExampleTS(mdxContent: string): string | null {
	const match = mdxContent.match(
		/## Good Example[\s\S]*?```typescript\n([\s\S]*?)\n```/,
	);
	return match ? match[1] : null;
}

function replaceGoodExampleWithTag(mdxContent: string, id: string): string {
	return mdxContent.replace(
		/## Good Example[\s\S]*?```typescript\n([\s\S]*?)\n```/,
		`## Good Example\n\n<Example path="./src/${id}.ts" />`,
	);
}

// --- PROCESSING ---

export const processPattern = (
	file: string,
	config: IngestConfig,
): Effect.Effect<ProcessResult, never, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const rawPath = `${config.rawDir}/${file}`;

		try {
			const raw = yield* fs.readFileString(rawPath);
			const parsed = parseMdx(raw);

			if (!parsed) {
				return {
					file,
					success: false,
					error: "Missing or invalid frontmatter",
				};
			}

			const { frontmatter } = parsed;

			// Validate required fields
			const required = ["id", "title", "skillLevel", "useCase", "summary"];
			for (const key of required) {
				if (!frontmatter[key]) {
					return {
						file,
						success: false,
						error: `Missing required field '${key}'`,
					};
				}
			}

			const id = String(frontmatter.id);

			// Extract TypeScript code
			const tsCode = extractGoodExampleTS(raw);
			if (!tsCode) {
				return {
					file,
					success: false,
					error: "No TypeScript code block found in Good Example section",
				};
			}

			// Write TypeScript file
			const tsPath = `${config.srcDir}/${id}.ts`;
			yield* fs.writeFileString(tsPath, tsCode);

			// Replace code block with Example tag and write processed MDX
			const processedMdx = replaceGoodExampleWithTag(raw, id);
			const mdxPath = `${config.processedDir}/${id}.mdx`;
			yield* fs.writeFileString(mdxPath, processedMdx);

			return {
				file,
				success: true,
				id,
			};
		} catch (error) {
			return {
				file,
				success: false,
				error: String(error),
			};
		}
	}).pipe(
		Effect.catchAll((error) =>
			Effect.succeed({
				file,
				success: false,
				error: String(error),
			}),
		),
	);

export const processAllPatterns = (
	config: IngestConfig,
): Effect.Effect<ProcessResult[], Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		// Ensure directories exist
		yield* fs.makeDirectory(config.rawDir, { recursive: true });
		yield* fs.makeDirectory(config.srcDir, { recursive: true });
		yield* fs.makeDirectory(config.processedDir, { recursive: true });

		// Get MDX files from raw directory
		const files = yield* fs.readDirectory(config.rawDir);
		const mdxFiles = files.filter((f) =>
			f.toLowerCase().endsWith(".mdx"),
		);

		if (mdxFiles.length === 0) {
			return [];
		}

		// Process all files
		const results = yield* Effect.all(
			mdxFiles.map((f) => processPattern(f, config)),
			{ concurrency: 10 },
		);

		return results;
	});

// --- SUMMARY ---

export const summarizeProcessResults = (
	results: ProcessResult[],
): ProcessSummary => {
	const processed = results.filter((r) => r.success).length;
	const failed = results.filter((r) => !r.success).length;
	const processedFiles = results.filter((r) => r.success).map((r) => r.file);
	const failedFiles = results
		.filter((r) => !r.success)
		.map((r) => ({ file: r.file, error: r.error || "Unknown error" }));

	return {
		total: results.length,
		processed,
		failed,
		processedFiles,
		failedFiles,
	};
};
