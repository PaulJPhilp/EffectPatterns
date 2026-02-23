#!/usr/bin/env bun

/**
 * Add missing `summary:` frontmatter to pattern MDX files.
 *
 * For each file missing a `summary:` field, extracts the first meaningful
 * paragraph from the body (skipping headings, blank lines, code blocks)
 * and inserts it as the summary.
 *
 * Usage: bun run scripts/add-missing-summaries.ts [--dry-run]
 */

import matter from "gray-matter";
import { globSync } from "glob";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content/published/patterns");
const dryRun = process.argv.includes("--dry-run");

const MAX_SUMMARY_LENGTH = 200;

/**
 * Extract the first meaningful paragraph from the markdown body.
 * Skips headings, blank lines, and code blocks.
 */
function extractSummary(content: string): string | null {
  const lines = content.split("\n");
  let inCodeBlock = false;
  let paragraph = "";

  for (const line of lines) {
    // Track code fence boundaries
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) continue;

    const trimmed = line.trim();

    // Skip headings and blank lines
    if (trimmed.startsWith("#") || trimmed === "") {
      // If we already accumulated a paragraph, return it
      if (paragraph) break;
      continue;
    }

    // Skip HTML-like tags or MDX components
    if (trimmed.startsWith("<") && !trimmed.startsWith("<http")) continue;

    // Accumulate paragraph text
    paragraph += (paragraph ? " " : "") + trimmed;
  }

  if (!paragraph) return null;

  // Truncate to max length at word boundary
  if (paragraph.length > MAX_SUMMARY_LENGTH) {
    const truncated = paragraph.slice(0, MAX_SUMMARY_LENGTH);
    const lastSpace = truncated.lastIndexOf(" ");
    paragraph =
      (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "...";
  }

  return paragraph;
}

const files = globSync(`${CONTENT_DIR}/**/*.mdx`);
let updated = 0;
let skipped = 0;
let noSummary = 0;

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const { data: frontmatter, content } = matter(raw);

  // Skip files that already have a summary
  if (frontmatter.summary) {
    skipped++;
    continue;
  }

  const summary = extractSummary(content);

  if (!summary) {
    console.log(`  ? No summary found for: ${path.relative(ROOT, file)}`);
    noSummary++;
    continue;
  }

  // Insert summary: before the closing --- of frontmatter
  const firstDash = raw.indexOf("---");
  const secondDash = raw.indexOf("---", firstDash + 3);

  if (secondDash === -1) {
    console.error(`  ! Skipping ${file}: no closing --- found`);
    continue;
  }

  // Insert summary block just before the closing ---
  const before = raw.slice(0, secondDash);
  const after = raw.slice(secondDash);
  const summaryBlock = `summary: >-\n  ${summary}\n`;
  const newContent = before + summaryBlock + after;

  if (dryRun) {
    console.log(
      `  [dry-run] Would add summary to: ${path.relative(ROOT, file)}`
    );
    console.log(`            → "${summary}"`);
  } else {
    writeFileSync(file, newContent, "utf8");
  }

  updated++;
}

console.log(
  `\nadd-missing-summaries complete${dryRun ? " (dry run)" : ""}!`
);
console.log(`   Updated: ${updated}`);
console.log(`   Skipped (already had summary): ${skipped}`);
console.log(`   No summary extractable: ${noSummary}`);
console.log(`   Total files: ${files.length}`);
