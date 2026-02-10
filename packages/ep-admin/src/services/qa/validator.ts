/**
 * QA Validator for Published Patterns
 *
 * Validates frontmatter, structure, and TypeScript code blocks
 * for all published .mdx patterns. Writes individual -qa.json
 * result files consumed by the existing QA reporting pipeline.
 */

import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import matter from "gray-matter";
import { globSync } from "glob";
import path from "node:path";
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import type { QAConfig, QAResult } from "./types.js";

// --- Constants ---

const VALID_SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TS_CODE_BLOCK_REGEX = /```(?:typescript|ts)\n([\s\S]*?)```/g;

// Structure heading patterns (case-insensitive)
const OLD_FORMAT_HEADINGS = [/^#{1,2}\s+good\s+example/im, /^#{1,2}\s+anti[- ]?pattern/im];
const NEW_FORMAT_HEADINGS = [/^#{1,2}\s+problem/im, /^#{1,2}\s+solution/im];
const ANY_HEADING_REGEX = /^#{1,3}\s+\S/m;

// --- Frontmatter Validation ---

function validateFrontmatter(
  frontmatter: Record<string, unknown>,
  filePath: string,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!frontmatter.id || typeof frontmatter.id !== "string" || frontmatter.id.trim() === "") {
    errors.push("Frontmatter: missing required field 'id'");
  } else if (!SLUG_REGEX.test(frontmatter.id)) {
    errors.push(
      `Frontmatter: 'id' must be a valid slug (lowercase, hyphens, no spaces). Got: "${frontmatter.id}"`,
    );
  }

  if (!frontmatter.title || typeof frontmatter.title !== "string" || frontmatter.title.trim() === "") {
    errors.push("Frontmatter: missing required field 'title'");
  }

  if (!frontmatter.skillLevel || typeof frontmatter.skillLevel !== "string") {
    errors.push("Frontmatter: missing required field 'skillLevel'");
  } else if (
    !VALID_SKILL_LEVELS.includes(
      frontmatter.skillLevel.toLowerCase() as (typeof VALID_SKILL_LEVELS)[number],
    )
  ) {
    errors.push(
      `Frontmatter: 'skillLevel' must be one of ${VALID_SKILL_LEVELS.join(", ")}. Got: "${frontmatter.skillLevel}"`,
    );
  }

  // Warnings for optional but recommended fields
  if (!frontmatter.summary) {
    warnings.push("Frontmatter: missing recommended field 'summary'");
  }
  if (!frontmatter.tags || !Array.isArray(frontmatter.tags) || frontmatter.tags.length === 0) {
    warnings.push("Frontmatter: missing recommended field 'tags'");
  }

  return { errors, warnings };
}

// --- Structure Validation ---

function validateStructure(content: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for old format (Good Example + Anti-Pattern or Rationale)
  const hasOldFormat = OLD_FORMAT_HEADINGS.every((re) => re.test(content));

  // Check for new format (Problem + Solution)
  const hasNewFormat = NEW_FORMAT_HEADINGS.every((re) => re.test(content));

  if (!hasOldFormat && !hasNewFormat) {
    // Fallback: at least one heading and one TypeScript code block
    const hasHeading = ANY_HEADING_REGEX.test(content);
    const hasCodeBlock = TS_CODE_BLOCK_REGEX.test(content);
    // Reset lastIndex after test
    TS_CODE_BLOCK_REGEX.lastIndex = 0;

    if (!hasHeading && !hasCodeBlock) {
      errors.push("Structure: no recognizable pattern structure (expected headings and code blocks)");
    } else if (!hasHeading) {
      warnings.push("Structure: no section headings found (expected ## headings)");
    } else if (!hasCodeBlock) {
      warnings.push("Structure: no TypeScript code blocks found");
    }
  }

  return { errors, warnings };
}

// --- TypeScript Type-Check ---

function extractTypeScriptBlocks(content: string): string[] {
  const blocks: string[] = [];
  const regex = /```(?:typescript|ts)\n([\s\S]*?)```/g;
  let match = regex.exec(content);
  while (match !== null) {
    blocks.push(match[1]);
    match = regex.exec(content);
  }
  return blocks;
}

function typeCheckBlock(
  code: string,
  slug: string,
  blockIndex: number,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const tempFile = `/tmp/qa-check-${slug}-${blockIndex}.ts`;

  try {
    writeFileSync(tempFile, code, "utf8");

    try {
      execSync(`bun build --no-bundle --target=bun "${tempFile}" 2>&1`, {
        encoding: "utf8",
        timeout: 15_000,
      });
    } catch (buildError: unknown) {
      const output = (buildError as { stdout?: string; stderr?: string }).stdout
        || (buildError as { stdout?: string; stderr?: string }).stderr
        || String(buildError);

      const errorLines = output
        .split("\n")
        .filter((line: string) => line.includes("error"))
        .slice(0, 5);

      if (errorLines.length > 0) {
        for (const line of errorLines) {
          errors.push(`TypeCheck[${blockIndex + 1}]: ${line.trim()}`);
        }
      } else if (output.includes("error")) {
        errors.push(`TypeCheck[${blockIndex + 1}]: build failed for ${slug}`);
      }
    }
  } catch (fsError: unknown) {
    warnings.push(`TypeCheck[${blockIndex + 1}]: could not write temp file: ${String(fsError)}`);
  } finally {
    try {
      unlinkSync(tempFile);
    } catch {
      // ignore cleanup errors
    }
  }

  return { errors, warnings };
}

function typeCheckBlocks(
  blocks: string[],
  slug: string,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [i, block] of blocks.entries()) {
    const result = typeCheckBlock(block, slug, i);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return { errors, warnings };
}

// --- Main Validation ---

/**
 * Validate a single published pattern file.
 *
 * Parses frontmatter, checks structure, and type-checks TypeScript code blocks.
 * Returns a QAResult suitable for writing to a -qa.json file.
 */
export const validatePublishedPattern = (
  filePath: string,
): Effect.Effect<QAResult, never> =>
  Effect.sync(() => {
    const startTime = Date.now();
    const fileName = path.basename(filePath, ".mdx");

    try {
      const raw = readFileSync(filePath, "utf8");
      const { data: frontmatter, content } = matter(raw);

      const slug =
        typeof frontmatter.id === "string" && frontmatter.id.trim().length > 0
          ? frontmatter.id.trim()
          : fileName;

      // Frontmatter validation
      const fm = validateFrontmatter(frontmatter as Record<string, unknown>, filePath);

      // Structure validation
      const structure = validateStructure(content);

      // TypeScript type-check
      const tsBlocks = extractTypeScriptBlocks(content);
      const typeCheck = typeCheckBlocks(tsBlocks, slug);

      const allErrors = [...fm.errors, ...structure.errors, ...typeCheck.errors];
      const allWarnings = [...fm.warnings, ...structure.warnings, ...typeCheck.warnings];
      const duration = Date.now() - startTime;

      return {
        passed: allErrors.length === 0,
        patternId: slug,
        fileName: path.basename(filePath),
        duration,
        metadata: {
          title: typeof frontmatter.title === "string" ? frontmatter.title : slug,
          skillLevel: typeof frontmatter.skillLevel === "string" ? frontmatter.skillLevel : "unknown",
          tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
        },
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
      } satisfies QAResult;
    } catch (error: unknown) {
      return {
        passed: false,
        patternId: fileName,
        fileName: path.basename(filePath),
        duration: Date.now() - startTime,
        errors: [`Parse error: ${String(error)}`],
      } satisfies QAResult;
    }
  });

/**
 * Validate all published patterns and write -qa.json result files.
 *
 * Globs for .mdx files in publishedPatternsDir, validates each one with
 * bounded concurrency, and writes results to resultsDir.
 */
export const validateAllPublishedPatterns = (
  config: QAConfig,
  concurrency = 10,
): Effect.Effect<QAResult[], Error, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    // Ensure results directory exists
    yield* fs.makeDirectory(config.resultsDir, { recursive: true });

    // Glob for all .mdx files
    const files = globSync(`${config.publishedPatternsDir}/**/*.mdx`);

    if (files.length === 0) {
      return [];
    }

    // Validate all patterns with bounded concurrency
    const results = yield* Effect.forEach(
      files,
      (filePath) =>
        Effect.gen(function* () {
          const result = yield* validatePublishedPattern(filePath);

          // Write individual -qa.json result file
          const slug = result.patternId || path.basename(filePath, ".mdx");
          const resultPath = `${config.resultsDir}/${slug}-qa.json`;
          yield* fs.writeFileString(resultPath, JSON.stringify(result, null, 2));

          return result;
        }),
      { concurrency },
    );

    return results;
  });
