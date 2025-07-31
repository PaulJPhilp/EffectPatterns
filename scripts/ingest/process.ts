/**
 * process.ts
 *
 * Ingest script for Effect Patterns. Processes all MDX files in content/new/raw:
 * - Validates frontmatter and required sections
 * - Extracts TypeScript from Good Example section into content/new/src/{id}.ts
 * - Replaces Good Example code block with <Example path="./src/{id}.ts" /> and writes to content/new/processed/{id}.mdx
 * - Exits with error if content/new/src or content/new/processed are not empty at start
 * - Does not move, delete, or rename any files
 *
 * Usage:
 *   npm run ingest
 */

import * as fs from "fs/promises";
import * as path from "path";
import matter from "gray-matter";

// --- CONFIGURATION ---
const PROJECT_ROOT = process.cwd();
const NEW_DIR = path.join(PROJECT_ROOT, "content/new");
const NEW_RAW_DIR = path.join(NEW_DIR, "raw");
const NEW_SRC_DIR = path.join(NEW_DIR, "src");
const NEW_PROCESSED_DIR = path.join(NEW_DIR, "processed");

// --- VALIDATION ---
interface FrontMatter {
  id: string;
  title: string;
  skillLevel: string;
  useCase: string[];
  summary: string;
}

async function validateFrontMatter(filePath: string): Promise<FrontMatter> {
  const content = await fs.readFile(filePath, "utf-8");
  const { data } = matter(content);

  // Required fields
  const requiredFields = ["id", "title", "skillLevel", "useCase", "summary"];
  const missingFields = requiredFields.filter(field => !data[field]);

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required frontmatter fields in ${filePath}: ${missingFields.join(", ")}`
    );
  }

  // Validate useCase is an array
  if (!Array.isArray(data.useCase)) {
    throw new Error(
      `useCase must be an array in ${filePath}`
    );
  }

  return data as FrontMatter;
}

async function validateSections(filePath: string): Promise<void> {
  const content = await fs.readFile(filePath, "utf-8");
  const { content: mdxContent } = matter(content);
  const sections = mdxContent.split("\n## ");

  // Check for required sections
  const requiredSections = ["Good Example", "Anti-Pattern"];
  const hasExplanation = sections.some(section =>
    section.startsWith("Explanation") || section.startsWith("Rationale")
  );

  if (!hasExplanation) {
    throw new Error(
      `Missing required section in ${filePath}: Explanation or Rationale`
    );
  }

  for (const section of requiredSections) {
    if (!sections.some(s => s.startsWith(section))) {
      throw new Error(
        `Missing required section in ${filePath}: ${section}`
      );
    }
  }
}

// --- EXTRACTION ---
function extractGoodExampleTS(mdxContent: string): string | null {
  const goodExampleMatch = mdxContent.match(/## Good Example[\s\S]*?```typescript\n([\s\S]*?)\n```/);
  return goodExampleMatch ? goodExampleMatch[1] : null;
}

function replaceGoodExampleWithExampleTag(mdxContent: string, id: string): string {
  return mdxContent.replace(
    /## Good Example[\s\S]*?```typescript\n([\s\S]*?)\n```/,
    `## Good Example\n\n<Example path=\"./src/${id}.ts\" />`
  );
}

// --- MAIN EXECUTION ---
async function main() {
  try {
    // Ensure directories exist
    await fs.mkdir(NEW_RAW_DIR, { recursive: true });
    await fs.mkdir(NEW_SRC_DIR, { recursive: true });
    await fs.mkdir(NEW_PROCESSED_DIR, { recursive: true });

    // Check that src and processed are empty
    const srcFiles = await fs.readdir(NEW_SRC_DIR);
    if (srcFiles.length > 0) {
      throw new Error(`Directory not empty: ${NEW_SRC_DIR}`);
    }
    const processedFiles = await fs.readdir(NEW_PROCESSED_DIR);
    if (processedFiles.length > 0) {
      throw new Error(`Directory not empty: ${NEW_PROCESSED_DIR}`);
    }

    // Get list of new MDX files
    const files = await fs.readdir(NEW_RAW_DIR);
    const mdxFiles = files.filter(file => file.endsWith(".mdx"));

    if (mdxFiles.length === 0) {
      console.log("No new patterns to process");
      return;
    }

    console.log(`Found ${mdxFiles.length} new pattern(s) to process`);

    // Process each pattern
    for (const file of mdxFiles) {
      const filePath = path.join(NEW_RAW_DIR, file);
      console.log(`\nProcessing ${file}...`);

      // Validate frontmatter and sections
      const frontmatter = await validateFrontMatter(filePath);
      await validateSections(filePath);

      // Extract Good Example TypeScript
      const rawContent = await fs.readFile(filePath, "utf-8");
      const { content: mdxContent } = matter(rawContent);
      const tsCode = extractGoodExampleTS(mdxContent);
      if (!tsCode) {
        throw new Error(`No TypeScript code block found in Good Example section of ${file}`);
      }
      // Write TypeScript file
      const tsTarget = path.join(NEW_SRC_DIR, `${frontmatter.id}.ts`);
      await fs.writeFile(tsTarget, tsCode);

      // Replace Good Example code block with Example tag
      const processedMdx = replaceGoodExampleWithExampleTag(rawContent, frontmatter.id);
      const mdxTarget = path.join(NEW_PROCESSED_DIR, `${frontmatter.id}.mdx`);
      await fs.writeFile(mdxTarget, processedMdx);

      console.log(`✅ Successfully processed ${frontmatter.title}`);
    }

    console.log("\n✨ All patterns processed successfully!");
  } catch (error) {
    console.error("❌ Error processing patterns:", error);
    process.exit(1);
  }
}

main();
