/**
 * Ingest Service Helpers
 *
 * Helper functions for pattern ingestion and processing
 */

import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import * as yaml from "yaml";
import type { IngestConfig, Pattern, ProcessResult } from "./types.js";

// --- CONSTANTS ---

export const REQUIRED_FRONTMATTER_FIELDS = [
	"id",
	"title",
	"skillLevel",
	"useCase",
	"summary",
] as const;

export const REQUIRED_CONTENT_SECTIONS = [
	"Good Example",
	"Anti-Pattern",
] as const;

// --- FRONTMATTER HELPERS ---

/**
 * Parse frontmatter from MDX content
 */
export const parseFrontmatter = (
	content: string,
): { frontmatter: Record<string, unknown>; body: string } => {
	const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

	if (!fmMatch) {
		return { frontmatter: {}, body: content };
	}

	try {
		const frontmatter = yaml.parse(fmMatch[1] || "{}") as Record<string, unknown>;
		const body = fmMatch[2] || "";
		return { frontmatter, body };
	} catch {
		return { frontmatter: {}, body: content };
	}
};

/**
 * Validate frontmatter contains required fields
 */
export const validateFrontmatter = (
	frontmatter: Record<string, unknown>,
): { valid: boolean; missing: string[] } => {
	const missing = REQUIRED_FRONTMATTER_FIELDS.filter(
		(field) => !frontmatter[field],
	);

	return {
		valid: missing.length === 0,
		missing,
	};
};

// --- CONTENT HELPERS ---

/**
 * Check if content contains required sections
 */
export const validateContentStructure = (
	content: string,
): { valid: boolean; missing: string[] } => {
	const missing = REQUIRED_CONTENT_SECTIONS.filter((section) =>
		!new RegExp(`##\\s+${section}`, "i").test(content)
	);

	return {
		valid: missing.length === 0,
		missing,
	};
};

/**
 * Extract TypeScript code from Good Example section
 */
export const extractTypeScriptCode = (
	content: string,
): string | null => {
	const codeMatch = content.match(
		/##\s+Good Example[\s\S]*?```typescript\n([\s\S]*?)\n```/,
	);

	return codeMatch?.[1]?.trim() || null;
};

/**
 * Check if content has TypeScript code
 */
export const hasTypeScriptCode = (content: string): boolean => {
	return /```typescript\n[\s\S]*?\n```/.test(content);
};

// --- FILE HELPERS ---

/**
 * Generate pattern ID from file name and frontmatter
 */
export const generatePatternId = (
	fileName: string,
	frontmatter: Record<string, unknown>,
): string => {
	return (frontmatter.id as string) || fileName.replace(".mdx", "");
};

/**
 * Generate file paths for a pattern
 */
export const generatePatternPaths = (
	id: string,
	config: IngestConfig,
): { srcPath: string; processedPath: string } => ({
	srcPath: `${config.srcDir}/${id}.ts`,
	processedPath: `${config.processedDir}/${id}.mdx`,
});

/**
 * Read and parse MDX file
 */
export const readMdxFile = (
	filePath: string,
): Effect.Effect<{ content: string; frontmatter: Record<string, unknown> }, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const content = yield* fs.readFileString(filePath);
		const { frontmatter } = parseFrontmatter(content);

		return { content, frontmatter };
	});

/**
 * Write TypeScript code to file
 */
export const writeTypeScriptFile = (
	filePath: string,
	code: string,
): Effect.Effect<void, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		yield* fs.makeDirectory(filePath.split("/").slice(0, -1).join("/"), {
			recursive: true,
		});
		yield* fs.writeFileString(filePath, code);
	});

/**
 * Create process result
 */
export const createProcessResult = (
	file: string,
	success: boolean,
	id?: string,
	error?: string,
): ProcessResult => ({
	file,
	success,
	id,
	error,
});

/**
 * Filter MDX files from directory listing
 */
export const filterMdxFiles = (files: string[]): string[] => {
	return files.filter((file) => file.endsWith(".mdx"));
};

/**
 * Generate pattern object from file and config
 */
export const createPatternFromFile = (
	file: string,
	config: IngestConfig,
	frontmatter: Record<string, unknown>,
): Pattern => {
	const id = generatePatternId(file, frontmatter);
	const { srcPath, processedPath } = generatePatternPaths(id, config);
	const rawPath = `${config.rawDir}/${file}`;

	return {
		id,
		title: (frontmatter.title as string) || id,
		rawPath,
		srcPath,
		processedPath,
		frontmatter,
		hasTypeScript: false, // Will be determined during processing
	};
};
