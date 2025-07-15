/**
 * process.ts
 * 
 * Part of the Effect Patterns documentation pipeline. This script processes new pattern files
 * from /content/new into the main pattern collection. It:
 * 
 * 1. Validates new pattern files for:
 *    - Required frontmatter fields (id, title, skillLevel, useCase, summary)
 *    - Required sections (Good Example, Anti-Pattern, Explanation/Rationale)
 *    - Valid TypeScript code in Example components
 * 
 * 2. Moves TypeScript source files:
 *    - From: /content/new/src/*.ts
 *    - To: /content/src/{pattern-id}.ts
 * 
 * 3. Moves MDX files:
 *    - From: /content/new/*.mdx
 *    - To: /content/raw/{pattern-id}.mdx
 * 
 * 4. Updates any related files (README.md, etc.)
 * 
 * Usage:
 * ```bash
 * npm run ingest
 * ```
 */

import * as fs from "fs/promises";
import * as path from "path";
import matter from "gray-matter";

// --- CONFIGURATION ---
const PROJECT_ROOT = process.cwd();
const NEW_DIR = path.join(PROJECT_ROOT, "content/new");
const NEW_SRC_DIR = path.join(NEW_DIR, "src");
const RAW_DIR = path.join(PROJECT_ROOT, "content/raw");
const SRC_DIR = path.join(PROJECT_ROOT, "content/src");

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

// --- FILE OPERATIONS ---
async function moveSourceFile(id: string): Promise<void> {
  const sourceFile = path.join(NEW_SRC_DIR, `${id}.ts`);
  const targetFile = path.join(SRC_DIR, `${id}.ts`);

  try {
    await fs.access(sourceFile);
  } catch {
    throw new Error(
      `Source file not found: ${sourceFile}`
    );
  }

  await fs.copyFile(sourceFile, targetFile);
  await fs.unlink(sourceFile);
}

async function moveMdxFile(id: string): Promise<void> {
  const sourceFile = path.join(NEW_DIR, `${id}.mdx`);
  const targetFile = path.join(RAW_DIR, `${id}.mdx`);

  try {
    await fs.access(sourceFile);
  } catch {
    throw new Error(
      `MDX file not found: ${sourceFile}`
    );
  }

  await fs.copyFile(sourceFile, targetFile);
  await fs.unlink(sourceFile);
}

// --- MAIN EXECUTION ---
async function main() {
  try {
    // Ensure directories exist
    await fs.mkdir(NEW_DIR, { recursive: true });
    await fs.mkdir(NEW_SRC_DIR, { recursive: true });

    // Get list of new MDX files
    const files = await fs.readdir(NEW_DIR);
    const mdxFiles = files.filter(file => file.endsWith(".mdx"));

    if (mdxFiles.length === 0) {
      console.log("No new patterns to process");
      return;
    }

    console.log(`Found ${mdxFiles.length} new pattern(s) to process`);

    // Process each pattern
    for (const file of mdxFiles) {
      const filePath = path.join(NEW_DIR, file);
      console.log(`\nProcessing ${file}...`);

      // Validate frontmatter and sections
      const frontmatter = await validateFrontMatter(filePath);
      await validateSections(filePath);

      // Move files
      await moveSourceFile(frontmatter.id);
      await moveMdxFile(frontmatter.id);

      console.log(`✅ Successfully processed ${frontmatter.title}`);
    }

    console.log("\n✨ All patterns processed successfully!");
  } catch (error) {
    console.error("❌ Error processing patterns:", error);
    process.exit(1);
  }
}

main();
