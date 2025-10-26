/**
 * process.ts
 *
 * Batch ingest for Effect Patterns. Processes all MDX files in
 * content/new/raw:
 * - Validates frontmatter and required sections
 * - Extracts TypeScript from Good Example into content/new/src/{id}.ts
 * - Replaces that code block with <Example path="./src/{id}.ts" /> and writes
 *   to content/new/processed/{id}.mdx
 * - Exits with error if content/new/src or content/new/processed are not empty
 *
 * Usage:
 *   bunx tsx scripts/ingest/process.ts
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as yaml from 'yaml';
// Use shared utility to split markdown content into sections by headings
import { splitSections } from '../../packages/toolkit/src/splitSections.js';

// --- CONFIGURATION ---
const PROJECT_ROOT = process.cwd();
const NEW_DIR = path.join(PROJECT_ROOT, 'content/new');
const NEW_RAW_DIR = path.join(NEW_DIR, 'raw');
const NEW_SRC_DIR = path.join(NEW_DIR, 'src');
const NEW_PROCESSED_DIR = path.join(NEW_DIR, 'processed');

// --- VALIDATION ---
interface FrontMatter {
  id: string;
  title: string;
  skillLevel: string;
  useCase: string[];
  summary: string;
}

function parseMdx(
  filePath: string,
  raw: string,
): {
  frontmatter: any;
  content: string;
} {
  // Expect frontmatter at the very top delimited by ---
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error(`Missing or invalid frontmatter in ${filePath}`);
  }
  const frontmatter = yaml.parse(fmMatch[1] || '{}');
  const content = fmMatch[2] ?? '';
  return { frontmatter, content };
}

function validateFrontMatter(filePath: string, fm: any): FrontMatter {
  const required = ['id', 'title', 'skillLevel', 'useCase', 'summary'];
  for (const key of required) {
    if (!fm[key])
      throw new Error(`Missing required field '${key}' in ${filePath}`);
  }
  const validSkill = ['Beginner', 'Intermediate', 'Advanced'];
  const rawSkill = String(fm.skillLevel ?? '');
  const normalizedSkill =
    rawSkill.length > 0
      ? rawSkill.charAt(0).toUpperCase() + rawSkill.slice(1).toLowerCase()
      : rawSkill;
  if (!validSkill.includes(normalizedSkill)) {
    throw new Error(
      `Invalid skillLevel '${fm.skillLevel}' in ${filePath}. Must be one of: ${validSkill.join(', ')}`,
    );
  }
  fm.skillLevel = normalizedSkill;
  if (!Array.isArray(fm.useCase)) {
    throw new Error(`useCase must be an array in ${filePath}`);
  }
  return fm as FrontMatter;
}

function validateSections(filePath: string, content: string): void {
  const sections = splitSections(content);
  const requiredSections = ['Good Example', 'Anti-Pattern'];
  const hasExplanation = sections.some(
    (s) => s.startsWith('Explanation') || s.startsWith('Rationale'),
  );
  if (!hasExplanation) {
    throw new Error(
      `Missing required section in ${filePath}: Explanation or Rationale`,
    );
  }
  for (const section of requiredSections) {
    if (!sections.some((s) => s.startsWith(section))) {
      throw new Error(`Missing required section in ${filePath}: ${section}`);
    }
  }
}

// --- EXTRACTION ---
function extractGoodExampleTS(mdxContent: string): string | null {
  const goodExampleMatch = mdxContent.match(
    /## Good Example[\s\S]*?```typescript\n([\s\S]*?)\n```/,
  );
  return goodExampleMatch ? goodExampleMatch[1] : null;
}

function replaceGoodExampleWithExampleTag(
  mdxContent: string,
  id: string,
): string {
  return mdxContent.replace(
    /## Good Example[\s\S]*?```typescript\n([\s\S]*?)\n```/,
    `## Good Example\n\n<Example path="./src/${id}.ts" />`,
  );
}

// --- MAIN EXECUTION ---
async function main() {
  // Ensure directories exist
  await fs.mkdir(NEW_RAW_DIR, { recursive: true });
  await fs.mkdir(NEW_SRC_DIR, { recursive: true });
  await fs.mkdir(NEW_PROCESSED_DIR, { recursive: true });

  // Enforce empty src and processed
  const srcFiles = await fs.readdir(NEW_SRC_DIR);
  if (srcFiles.length > 0) {
    throw new Error(`Directory not empty: ${NEW_SRC_DIR}`);
  }
  const processedFiles = await fs.readdir(NEW_PROCESSED_DIR);
  if (processedFiles.length > 0) {
    throw new Error(`Directory not empty: ${NEW_PROCESSED_DIR}`);
  }

  // Read raw mdx files
  const files = await fs.readdir(NEW_RAW_DIR);
  const mdxFiles = files.filter((f) => f.toLowerCase().endsWith('.mdx'));
  if (mdxFiles.length === 0) {
    console.log('No new patterns to process');
    return;
  }

  console.log(`Found ${mdxFiles.length} new pattern(s) to process`);
  for (const file of mdxFiles) {
    const filePath = path.join(NEW_RAW_DIR, file);
    console.log(`\nProcessing ${file}...`);
    const raw = await fs.readFile(filePath, 'utf8');

    const parsed = parseMdx(filePath, raw);
    const fm = validateFrontMatter(filePath, parsed.frontmatter);
    validateSections(filePath, parsed.content);

    const tsCode = extractGoodExampleTS(parsed.content);
    if (!tsCode) {
      throw new Error(
        `No TypeScript code block found in Good Example section of ${file}`,
      );
    }

    // Write TS file
    const tsTarget = path.join(NEW_SRC_DIR, `${fm.id}.ts`);
    await fs.writeFile(tsTarget, tsCode, 'utf8');

    // Replace Good Example with Example tag and write processed mdx
    const processedMdx = replaceGoodExampleWithExampleTag(raw, fm.id);
    const mdxTarget = path.join(NEW_PROCESSED_DIR, `${fm.id}.mdx`);
    await fs.writeFile(mdxTarget, processedMdx, 'utf8');

    console.log(`✅ Successfully processed ${fm.title}`);
  }

  console.log('\n✨ All patterns processed successfully!');
}

main().catch((err) => {
  console.error('❌ Error processing patterns:', err);
  process.exit(1);
});
