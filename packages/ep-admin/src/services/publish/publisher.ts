/**
 * Pattern Publishing Service
 *
 * Publishes MDX patterns by:
 * - Reading processed MDX files with <Example /> tags
 * - Replacing Example components with TypeScript code blocks
 * - Writing to published directory
 */

import { FileSystem } from "@effect/platform";
import { Effect } from "effect";

// --- TYPES ---

export interface PublishResult {
	file: string;
	success: boolean;
	error?: string;
}

export interface PublisherConfig {
	processedDir: string;
	publishedDir: string;
	srcDir: string;
}

export interface PublishSummary {
	total: number;
	published: number;
	failed: number;
	publishedFiles: string[];
	failedFiles: Array<{ file: string; error: string }>;
}

// --- PUBLISHING ---

export const publishPattern = (
	mdxFile: string,
	config: PublisherConfig,
): Effect.Effect<PublishResult, never, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const inPath = `${config.processedDir}/${mdxFile}`;
		const outPath = `${config.publishedDir}/${mdxFile}`;
		const tsFile = `${config.srcDir}/${mdxFile.replace(".mdx", ".ts")}`;

		try {
			// Read processed MDX content
			const content = yield* fs.readFileString(inPath);

			// Read corresponding TypeScript file
			const tsContent = yield* fs.readFileString(tsFile);

			// Replace Example component with TypeScript code block
			const processedContent = content.replace(
				/<Example path="\.\/src\/.*?" \/>/g,
				`\`\`\`typescript\n${tsContent}\n\`\`\``,
			);

			// Write published MDX
			yield* fs.writeFileString(outPath, processedContent);

			return {
				file: mdxFile,
				success: true,
			};
		} catch (error) {
			return {
				file: mdxFile,
				success: false,
				error: String(error),
			};
		}
	}).pipe(
		Effect.catchAll((error) =>
			Effect.succeed({
				file: mdxFile,
				success: false,
				error: String(error),
			}),
		),
	);

export const publishAllPatterns = (
	config: PublisherConfig,
): Effect.Effect<PublishResult[], Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		// Ensure output directory exists
		yield* fs.makeDirectory(config.publishedDir, { recursive: true });

		// Get all MDX files from processed directory
		const files = yield* fs.readDirectory(config.processedDir);
		const mdxFiles = files.filter((f) => f.endsWith(".mdx"));

		// Publish all patterns in parallel
		const results = yield* Effect.all(
			mdxFiles.map((f) => publishPattern(f, config)),
			{ concurrency: 10 },
		);

		return results;
	});

// --- SUMMARY HELPERS ---

export const summarizePublishResults = (
	results: PublishResult[],
): PublishSummary => {
	const published = results.filter((r) => r.success).length;
	const failed = results.filter((r) => !r.success).length;
	const publishedFiles = results
		.filter((r) => r.success)
		.map((r) => r.file);
	const failedFiles = results
		.filter((r) => !r.success)
		.map((r) => ({ file: r.file, error: r.error || "Unknown error" }));

	return {
		total: results.length,
		published,
		failed,
		publishedFiles,
		failedFiles,
	};
};

export const getFailedPublishes = (results: PublishResult[]): PublishResult[] =>
	results.filter((r) => !r.success);
