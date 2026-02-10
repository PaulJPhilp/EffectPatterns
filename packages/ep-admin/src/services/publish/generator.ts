/**
 * README Generator Service
 *
 * Generates README.md from published pattern files on disk:
 * - Scans content/published/patterns/ for .mdx files
 * - Parses frontmatter for pattern metadata
 * - Groups patterns by application pattern (directory)
 * - Generates table of contents and formatted markdown sections
 */

import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import * as nodeFs from "node:fs";
import * as path from "node:path";

// --- TYPES ---

export interface PatternInfo {
	readonly slug: string;
	readonly title: string;
	readonly skillLevel: string;
	readonly summary: string;
	readonly lessonOrder: number | null;
	readonly applicationPatternId: string | null;
}

export interface ApplicationPatternInfo {
	readonly slug: string;
	readonly name: string;
	readonly description: string;
	readonly learningOrder: number;
}

export interface GeneratorConfig {
	readmePath: string;
}

// --- APPLICATION PATTERN DEFINITIONS ---

/**
 * Application pattern metadata keyed by slug.
 * Learning order determines the section ordering in the README.
 */
const APPLICATION_PATTERNS: readonly ApplicationPatternInfo[] = [
	{ slug: "getting-started", name: "Getting Started", description: "Foundational patterns for your first steps with Effect-TS.", learningOrder: 1 },
	{ slug: "core-concepts", name: "Core Concepts", description: "Essential building blocks for understanding and using Effect.", learningOrder: 2 },
	{ slug: "error-management", name: "Error Management", description: "Patterns for type-safe, composable error handling.", learningOrder: 3 },
	{ slug: "resource-management", name: "Resource Management", description: "Safe acquisition, use, and release of resources.", learningOrder: 4 },
	{ slug: "concurrency", name: "Concurrency", description: "Patterns for parallel and concurrent execution.", learningOrder: 5 },
	{ slug: "streams", name: "Streams", description: "Processing sequences of values over time.", learningOrder: 6 },
	{ slug: "scheduling", name: "Scheduling", description: "Patterns for retries, repetition, and time-based execution.", learningOrder: 7 },
	{ slug: "domain-modeling", name: "Domain Modeling", description: "Building robust domain models with Effect and Schema.", learningOrder: 8 },
	{ slug: "schema", name: "Schema", description: "Validation, parsing, and transformation with @effect/schema.", learningOrder: 9 },
	{ slug: "platform", name: "Platform", description: "Cross-platform utilities from @effect/platform.", learningOrder: 10 },
	{ slug: "building-apis", name: "Building APIs", description: "Patterns for building robust API services.", learningOrder: 11 },
	{ slug: "making-http-requests", name: "Making HTTP Requests", description: "HTTP client patterns with @effect/platform.", learningOrder: 12 },
	{ slug: "building-data-pipelines", name: "Building Data Pipelines", description: "Patterns for data ingestion, transformation, and processing.", learningOrder: 13 },
	{ slug: "testing", name: "Testing", description: "Patterns for testing Effect-based applications.", learningOrder: 14 },
	{ slug: "observability", name: "Observability", description: "Logging, metrics, and tracing patterns.", learningOrder: 15 },
	{ slug: "tooling-and-debugging", name: "Tooling & Debugging", description: "Developer tools and debugging techniques for Effect.", learningOrder: 16 },
];

// --- HELPERS ---

function getSkillLevel(skillLevel: string): string {
	return skillLevel.toLowerCase();
}

function getSkillEmoji(skillLevel: string): string {
	const level = getSkillLevel(skillLevel);
	const emojiMap: Record<string, string> = {
		beginner: "🟢",
		intermediate: "🟡",
		advanced: "🟠",
	};
	return emojiMap[level] || "⚪️";
}

/**
 * Parse YAML frontmatter from an .mdx file.
 * Returns key-value pairs from the --- delimited header.
 */
function parseFrontmatter(content: string): Record<string, string> {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};
	const frontmatter: Record<string, string> = {};
	let currentKey = "";
	let currentValue = "";
	for (const line of match[1].split("\n")) {
		// Multi-line value continuation (indented or >- continuation)
		if (currentKey && (line.startsWith("  ") || line.startsWith("\t")) && !line.match(/^\s+- /)) {
			currentValue += ` ${line.trim()}`;
			frontmatter[currentKey] = currentValue.trim();
			continue;
		}
		const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
		if (kvMatch) {
			currentKey = kvMatch[1];
			// Handle >- multiline indicator, then strip surrounding quotes
			currentValue = kvMatch[2].replace(/^>-?\s*$/, "").trim();
			currentValue = currentValue.replace(/^(['"])(.*)\1$/, "$2");
			if (currentValue) {
				frontmatter[currentKey] = currentValue;
			}
		}
	}
	return frontmatter;
}

/**
 * Recursively find all .mdx files under a directory.
 */
function findMdxFiles(dir: string): string[] {
	const results: string[] = [];
	const entries = nodeFs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...findMdxFiles(fullPath));
		} else if (entry.name.endsWith(".mdx")) {
			results.push(fullPath);
		}
	}
	return results;
}

/**
 * Scan the patterns directory and build PatternInfo[] from .mdx frontmatter.
 * Recursively scans subdirectories (e.g. schema/getting-started/*.mdx).
 * When the frontmatter applicationPatternId doesn't match a known application
 * pattern, falls back to the top-level directory name.
 */
function loadPatternsFromDisk(patternsDir: string): PatternInfo[] {
	const knownAPs = new Set(APPLICATION_PATTERNS.map((ap) => ap.slug));
	const patterns: PatternInfo[] = [];
	const allFiles = findMdxFiles(patternsDir);
	for (const filePath of allFiles) {
		const relativeToPatternsDir = path.relative(patternsDir, filePath);
		const topLevelCategory = relativeToPatternsDir.split(path.sep)[0];
		const content = nodeFs.readFileSync(filePath, "utf-8");
		const fm = parseFrontmatter(content);
		const slug = fm.id || path.basename(filePath, ".mdx");
		const fmApId = fm.applicationPatternId;
		// Use frontmatter value if it matches a known AP, otherwise use directory
		const applicationPatternId = fmApId && knownAPs.has(fmApId)
			? fmApId
			: topLevelCategory;
		patterns.push({
			slug,
			title: fm.title || slug,
			skillLevel: fm.skillLevel || "intermediate",
			summary: fm.summary || "",
			lessonOrder: fm.lessonOrder ? Number.parseInt(fm.lessonOrder, 10) : null,
			applicationPatternId,
		});
	}
	return patterns;
}

/**
 * Build a map from pattern slug to its relative file path.
 * Recursively scans subdirectories.
 * Maps both the filename-based slug and the frontmatter id (if different).
 */
function buildSlugToPathMap(patternsDir: string, repoRoot: string): Map<string, string> {
	const slugToPath = new Map<string, string>();
	const allFiles = findMdxFiles(patternsDir);
	for (const filePath of allFiles) {
		const relativePath = `./${path.relative(repoRoot, filePath)}`;
		const fileSlug = path.basename(filePath, ".mdx");
		slugToPath.set(fileSlug, relativePath);
		// Also map the frontmatter id if it differs from the filename
		const content = nodeFs.readFileSync(filePath, "utf-8");
		const idMatch = content.match(/^id:\s*(.+)$/m);
		if (idMatch) {
			const fmId = idMatch[1].trim();
			if (fmId !== fileSlug) {
				slugToPath.set(fmId, relativePath);
			}
		}
	}
	return slugToPath;
}

function generatePatternLink(
	slug: string,
	slugToPath: Map<string, string>,
): string {
	return slugToPath.get(slug) ?? `#${slug}`;
}

// --- README GENERATION ---

export const generateReadme = (
	config: GeneratorConfig,
): Effect.Effect<void, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const repoRoot = path.resolve(config.readmePath, "..");
		const patternsDir = path.join(repoRoot, "content", "published", "patterns");

		// Load all pattern data from disk
		const allPatterns = loadPatternsFromDisk(patternsDir);
		const slugToPath = buildSlugToPathMap(patternsDir, repoRoot);

		// Group patterns by application pattern slug
		const patternsByAP = new Map<string, PatternInfo[]>();
		for (const pattern of allPatterns) {
			const apSlug = pattern.applicationPatternId;
			if (!apSlug) continue;
			if (!patternsByAP.has(apSlug)) {
				patternsByAP.set(apSlug, []);
			}
			patternsByAP.get(apSlug)?.push(pattern);
		}

		// Sort application patterns by learning order
		const sortedAPs = [...APPLICATION_PATTERNS].sort(
			(a, b) => a.learningOrder - b.learningOrder,
		);

		// Generate README content
		const sections: string[] = [];
		const toc: string[] = [];

		// Build TOC
		toc.push("### Effect Patterns\n");

		for (const ap of sortedAPs) {
			const patterns = patternsByAP.get(ap.slug);
			if (!patterns || patterns.length === 0) continue;

			const anchor = ap.slug.toLowerCase().replace(/\s+/g, "-");
			toc.push(`- [${ap.name}](#${anchor})`);
		}

		toc.push("\n");

		// Generate sections for each Application Pattern
		for (const ap of sortedAPs) {
			const patterns = patternsByAP.get(ap.slug);
			if (!patterns || patterns.length === 0) continue;

			sections.push(`## ${ap.name}\n`);
			sections.push(`${ap.description}\n\n`);

			// Sort patterns by skill level and lesson order
			const sortedPatterns = [...patterns].sort((a, b) => {
				const levels = { beginner: 0, intermediate: 1, advanced: 2 };
				const levelDiff =
					levels[getSkillLevel(a.skillLevel) as keyof typeof levels] -
					levels[getSkillLevel(b.skillLevel) as keyof typeof levels];
				if (levelDiff !== 0) return levelDiff;
				const orderA = a.lessonOrder ?? 999;
				const orderB = b.lessonOrder ?? 999;
				return orderA - orderB;
			});

			// Render patterns table
			sections.push(
				"| Pattern | Skill Level | Summary |\n| :--- | :--- | :--- |\n",
			);

			for (const pattern of sortedPatterns) {
				const skillLevel = getSkillLevel(pattern.skillLevel);
				const skillEmoji = getSkillEmoji(pattern.skillLevel);
				const link = generatePatternLink(pattern.slug, slugToPath);

				sections.push(
					`| [${pattern.title}](${link}) | ${skillEmoji} **${skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)}** | ${pattern.summary || ""} |\n`,
				);
			}

			sections.push("\n");
		}

		// Generate full README
		const readme = `<!--
  ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY

  This file is automatically generated by the publishing pipeline.
  Any manual edits will be overwritten when the pipeline runs.

  To modify this file:
  - Run: bun run admin pipeline
  - Or modify the generator service in src/services/publish/generator.ts

  For project information, see ABOUT.md
-->

> [!WARNING]
> **This is an auto-generated file.** Manual edits will be overwritten by the publishing pipeline.
> For project information, see [ABOUT.md](./ABOUT.md)

# The Effect Patterns Hub

A community-driven knowledge base of practical, goal-oriented patterns for building robust applications with Effect-TS.

This repository is designed to be a living document that helps developers move from core concepts to advanced architectural strategies by focusing on the "why" behind the code.

**Looking for machine-readable rules for AI IDEs and coding agents? See the [AI Coding Rules](#ai-coding-rules) section below.**

## Table of Contents

${toc.join("\n")}

---

${sections.join("")}`;

		// Write README
		yield* fs.writeFileString(config.readmePath, readme);
	});

export const generateReadmeWithStats = (
	config: GeneratorConfig,
): Effect.Effect<
	{ applicationPatterns: number; effectPatterns: number },
	Error,
	FileSystem.FileSystem
> =>
	Effect.gen(function* () {
		const repoRoot = path.resolve(config.readmePath, "..");
		const patternsDir = path.join(repoRoot, "content", "published", "patterns");
		const allPatterns = loadPatternsFromDisk(patternsDir);

		// Count unique application patterns
		const apSlugs = new Set(allPatterns.map((p) => p.applicationPatternId).filter(Boolean));

		yield* generateReadme(config);

		return {
			applicationPatterns: apSlugs.size,
			effectPatterns: allPatterns.length,
		};
	});
