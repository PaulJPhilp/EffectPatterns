/**
 * Pattern Validation Service
 *
 * Validates MDX pattern files for:
 * - Frontmatter completeness and correctness
 * - Required sections presence
 * - Code block validation
 * - Link checking
 * - File structure
 */

import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import { MdxService } from "effect-mdx";

// --- TYPES ---

export interface Frontmatter {
	id?: string;
	title?: string;
	skillLevel?: string;
	useCase?: string | string[];
	summary?: string;
	tags?: string[];
	[key: string]: unknown;
}

export interface ValidationIssue {
	type: "error" | "warning";
	category:
	| "frontmatter"
	| "structure"
	| "links"
	| "code"
	| "content"
	| "files";
	message: string;
}

export interface ValidationResult {
	file: string;
	valid: boolean;
	issues: ValidationIssue[];
	warnings: number;
	errors: number;
}

export interface ValidatorConfig {
	publishedDir: string;
	srcDir: string;
	concurrency: number;
}

// --- CONSTANTS ---

const REQUIRED_FIELDS = ["id", "title", "skillLevel", "useCase", "summary"];

const VALID_SKILL_LEVELS = ["beginner", "intermediate", "advanced"];

const VALID_USE_CASES = [
	"core-concepts",
	"error-management",
	"concurrency",
	"resource-management",
	"dependency-injection",
	"testing",
	"observability",
	"domain-modeling",
	"application-architecture",
	"building-apis",
	"network-requests",
	"file-handling",
	"database-connections",
	"modeling-data",
	"modeling-time",
	"building-data-pipelines",
	"tooling-and-debugging",
	"project-setup--execution",
	"making-http-requests",
	"custom-layers",
	"advanced-dependency-injection",
];

const USE_CASE_ALIASES: Record<string, string | readonly string[]> = {
	combinators: "core-concepts",
	sequencing: "core-concepts",
	composition: "core-concepts",
	pairing: "core-concepts",
	"side-effects": "core-concepts",
	constructors: "core-concepts",
	lifting: "core-concepts",
	"effect-results": "core-concepts",
	"data-types": "modeling-data",
	collections: "modeling-data",
	"set-operations": "modeling-data",
	"optional-values": "modeling-data",
	time: "modeling-time",
	duration: "modeling-time",
	logging: "observability",
	instrumentation: "observability",
	metrics: "observability",
	monitoring: "observability",
	"function-calls": "observability",
	debugging: "tooling-and-debugging",
	performance: "resource-management",
	security: "application-architecture",
	"sensitive-data": "application-architecture",
	interop: "application-architecture",
	async: "concurrency",
	callback: "concurrency",
	"error-handling": "error-management",
};

const REQUIRED_SECTIONS = [
	{ pattern: /##\s+Good Example/i, name: "Good Example" },
	{ pattern: /##\s+Anti-Pattern/i, name: "Anti-Pattern" },
	{ pattern: /##\s+(Explanation|Rationale)/i, name: "Explanation/Rationale" },
];

// --- HELPER FUNCTIONS ---

function normalizeUseCaseValue(value: string): readonly string[] {
	const trimmed = value.trim();
	if (!trimmed) {
		return [];
	}

	const lower = trimmed.toLowerCase();
	const slug = lower.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

	for (const candidate of [lower, slug]) {
		if (VALID_USE_CASES.includes(candidate)) {
			return [candidate];
		}
	}

	const aliasKey = [lower, slug].find(
		(candidate): candidate is keyof typeof USE_CASE_ALIASES =>
			candidate in USE_CASE_ALIASES,
	);

	if (!aliasKey) {
		return [];
	}

	const mapped = USE_CASE_ALIASES[aliasKey];
	if (typeof mapped === "string") {
		return [mapped];
	}

	return mapped;
}

function validateFrontmatter(
	frontmatter: Frontmatter,
	filename: string,
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	// Check required fields
	for (const field of REQUIRED_FIELDS) {
		if (!frontmatter[field]) {
			issues.push({
				type: "error",
				category: "frontmatter",
				message: `Missing required field: '${field}'`,
			});
		}
	}

	// Validate id matches filename
	if (frontmatter.id && frontmatter.id !== filename) {
		issues.push({
			type: "error",
			category: "frontmatter",
			message: `Frontmatter 'id' (${frontmatter.id}) does not match filename (${filename})`,
		});
	}

	// Validate skill level
	if (
		frontmatter.skillLevel &&
		!VALID_SKILL_LEVELS.includes(frontmatter.skillLevel)
	) {
		issues.push({
			type: "warning",
			category: "frontmatter",
			message: `Invalid skillLevel '${frontmatter.skillLevel}'. Valid values: ${VALID_SKILL_LEVELS.join(", ")}`,
		});
	}

	// Validate use case
	if (frontmatter.useCase) {
		const useCases = Array.isArray(frontmatter.useCase)
			? frontmatter.useCase
			: [frontmatter.useCase];

		const normalizedUseCases = new Set<string>();
		const unmapped: string[] = [];

		for (const raw of useCases) {
			if (typeof raw !== "string") {
				unmapped.push(String(raw));
				continue;
			}

			const normalized = normalizeUseCaseValue(raw);
			if (normalized.length === 0) {
				unmapped.push(raw);
				continue;
			}

			for (const entry of normalized) {
				normalizedUseCases.add(entry);
			}
		}

		if (normalizedUseCases.size === 0) {
			issues.push({
				type: "warning",
				category: "frontmatter",
				message: `Invalid useCase '${Array.isArray(frontmatter.useCase) ? frontmatter.useCase.join(", ") : frontmatter.useCase}'. Valid values: ${VALID_USE_CASES.join(", ")}`,
			});
		} else if (unmapped.length > 0) {
			issues.push({
				type: "warning",
				category: "frontmatter",
				message: `Some useCase values could not be normalized (${unmapped.join(", ")}). Valid values: ${VALID_USE_CASES.join(", ")}`,
			});
		}
	}

	// Check summary length
	if (frontmatter.summary && frontmatter.summary.length > 200) {
		issues.push({
			type: "warning",
			category: "frontmatter",
			message: `Summary is too long (${frontmatter.summary.length} chars). Keep it under 200 characters.`,
		});
	}

	return issues;
}

function validateStructure(content: string): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	for (const section of REQUIRED_SECTIONS) {
		if (!section.pattern.test(content)) {
			issues.push({
				type: "error",
				category: "structure",
				message: `Missing required section: '${section.name}'`,
			});
		}
	}

	return issues;
}

// --- SERVICE ---

export const validatePattern = (
	filePath: string,
	config: ValidatorConfig,
) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const mdx = yield* MdxService;

		// Extract filename from path
		const fileName = filePath
			.split("/")
			.pop()
			?.replace(".mdx", "") || "unknown";
		const issues: ValidationIssue[] = [];

		const { frontmatter: rawFrontmatter, mdxBody } =
			yield* mdx.readMdxAndFrontmatter(filePath);
		const frontmatter = rawFrontmatter as Frontmatter;

		// Validate frontmatter
		issues.push(...validateFrontmatter(frontmatter, fileName));

		// Validate structure
		issues.push(...validateStructure(mdxBody));

		// Check for corresponding TypeScript file
		const tsPath = `${config.srcDir}/${fileName}.ts`;
		const tsExists = yield* fs.exists(tsPath);

		if (!tsExists) {
			issues.push({
				type: "warning",
				category: "files",
				message: `No corresponding TypeScript file found at ${tsPath}`,
			});
		}

		const errors = issues.filter((i) => i.type === "error").length;
		const warnings = issues.filter((i) => i.type === "warning").length;

		return {
			file: fileName,
			valid: errors === 0,
			issues,
			warnings,
			errors,
		};
	}).pipe(
		Effect.catchAll((error) =>
			Effect.succeed({
				file: filePath.split("/").pop()?.replace(".mdx", "") || "unknown",
				valid: false,
				issues: [
					{
						type: "error" as const,
						category: "files" as const,
						message: `Failed to parse file: ${error}`,
					},
				],
				warnings: 0,
				errors: 1,
			}),
		),
	);

export const validateAllPatterns = (
	config: ValidatorConfig,
) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		// Get all MDX files
		const files = yield* fs.readDirectory(config.publishedDir);
		const mdxFiles = files.filter((f) => f.endsWith(".mdx"));

		// Build file paths
		const filePaths = mdxFiles.map((f) => `${config.publishedDir}/${f}`);

		// Validate in parallel with concurrency limit
		const results = yield* Effect.all(
			filePaths.map((fp) => validatePattern(fp, config)),
			{ concurrency: config.concurrency },
		);

		return results;
	});

export const summarizeResults = (
	results: ValidationResult[],
): {
	total: number;
	valid: number;
	invalid: number;
	totalErrors: number;
	totalWarnings: number;
} => {
	const valid = results.filter((r) => r.valid).length;
	const invalid = results.filter((r) => !r.valid).length;
	const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
	const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0);

	return {
		total: results.length,
		valid,
		invalid,
		totalErrors,
		totalWarnings,
	};
};
