#!/usr/bin/env bun

/**
 * Add missing `rule:` frontmatter to pattern MDX files that lack it.
 *
 * For each file missing a `rule:` field, generates a description from the
 * pattern title and inserts it into the YAML frontmatter block.
 *
 * Usage: bun run scripts/add-missing-rules.ts [--dry-run]
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

/**
 * Known gerund → imperative mappings for titles.
 * Avoids fragile suffix-stripping heuristics.
 */
const GERUND_MAP: Record<string, string> = {
  Adding: "Add",
  Building: "Build",
  Combining: "Combine",
  Composing: "Compose",
  Creating: "Create",
  Customizing: "Customize",
  Decoding: "Decode",
  Defining: "Define",
  Encoding: "Encode",
  Filtering: "Filter",
  Getting: "Get",
  Handling: "Handle",
  Mapping: "Map",
  Merging: "Merge",
  Parsing: "Parse",
  Transforming: "Transform",
  Understanding: "Understand",
  Using: "Use",
  Validating: "Validate",
  Working: "Work",
};

/**
 * Generate a rule description from a pattern title.
 *
 * If title starts with a known gerund, converts to imperative:
 *   "Parsing Partial Responses" → "Parse partial responses using Schema."
 *   "Handling Union Responses" → "Handle union responses using Schema."
 *
 * Otherwise uses the title directly:
 *   "Date Validation and Parsing" → "Date validation and parsing using Schema."
 *   "Basic AI Output Schema" → "Basic AI output schema."
 */
function generateRuleDescription(title: string): string {
  const words = title.split(/\s+/);
  const firstWord = words[0];
  const hasSchema = title.toLowerCase().includes("schema");
  const suffix = hasSchema ? "" : " using Schema";

  const imperative = GERUND_MAP[firstWord];
  if (imperative) {
    const rest = words.slice(1).join(" ").replace(/\.$/, "");
    return `${imperative} ${rest}${suffix}.`;
  }

  // Non-gerund title — use as-is, lowercasing first letter
  const desc = `${title.charAt(0).toUpperCase()}${title.slice(1).replace(/\.$/, "")}`;
  return `${desc}${suffix}.`;
}

const files = globSync(`${CONTENT_DIR}/**/*.mdx`);
let updated = 0;
let skipped = 0;

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const { data: frontmatter } = matter(raw);

  // Skip files that already have a rule
  if (frontmatter.rule) {
    skipped++;
    continue;
  }

  const title = frontmatter.title || path.basename(file, ".mdx");
  const ruleDescription = generateRuleDescription(title);

  // Insert rule: block before the closing --- of frontmatter
  // Find the second --- which closes the frontmatter
  const firstDash = raw.indexOf("---");
  const secondDash = raw.indexOf("---", firstDash + 3);

  if (secondDash === -1) {
    console.error(`  ! Skipping ${file}: no closing --- found`);
    continue;
  }

  // Insert rule block just before the closing ---
  const before = raw.slice(0, secondDash);
  const after = raw.slice(secondDash);
  const ruleBlock = `rule:\n  description: >-\n    ${ruleDescription}\n`;
  const newContent = before + ruleBlock + after;

  if (dryRun) {
    console.log(`  [dry-run] Would add rule to: ${path.relative(ROOT, file)}`);
    console.log(`            → "${ruleDescription}"`);
  } else {
    writeFileSync(file, newContent, "utf8");
  }

  updated++;
}

console.log(`\n✅ add-missing-rules complete${dryRun ? " (dry run)" : ""}!`);
console.log(`   Updated: ${updated}`);
console.log(`   Skipped (already had rule): ${skipped}`);
console.log(`   Total files: ${files.length}`);
