/**
 * validate.ts
 * 
 * Part of the Effect Patterns documentation pipeline. This script validates published MDX files
 * to ensure they meet our documentation standards. It checks:
 * 
 * 1. Frontmatter
 *    - All required fields are present
 *    - ID matches filename
 * 
 * 2. Required Sections
 *    - Good Example section with TypeScript code
 *    - Anti-Pattern section
 *    - Either Explanation or Rationale section
 * 
 * 3. TypeScript Code
 *    - Code in Good Example matches source file
 *    - Source file exists in /content/src
 * 
 * Usage:
 * ```bash
 * npm run validate
 * ```
 * 
 * The script will:
 * - Check all MDX files in the published directory
 * - Report any validation errors
 * - Exit with code 1 if any errors are found
 */

import * as fs from "fs/promises";
import * as path from "path";
import matter from "gray-matter";

// --- CONFIGURATION ---
const PUBLISHED_DIR = path.join(process.cwd(), "content/published");
const SRC_DIR = path.join(process.cwd(), "content/src");

interface ValidateOptions {
  indir?: string;
  srcdir?: string;
}

/**
 * Validates that:
 * 1. All published MDX files have valid frontmatter
 * 2. TypeScript code blocks match their source files
 * 3. Required sections are present
 */
async function validatePatterns({
  indir = PUBLISHED_DIR,
  srcdir = SRC_DIR
}: ValidateOptions = {}) {
  console.log(`Validating patterns in ${indir}`);
  console.log(`Using TypeScript source files from ${srcdir}`);

  const files = await fs.readdir(indir);
  const mdxFiles = files.filter(file => file.endsWith(".mdx"));
  const tsFiles = await fs.readdir(srcdir);

  console.log(`Found ${mdxFiles.length} MDX files and ${tsFiles.length} TypeScript files`);

  let hasErrors = false;
  let errorCount = 0;

  for (const mdxFile of mdxFiles) {
    const mdxPath = path.join(indir, mdxFile);
    const content = await fs.readFile(mdxPath, "utf-8");

    // 1. Validate frontmatter
    try {
      const { data: frontmatter } = matter(content);
      const filename = path.basename(mdxFile, ".mdx");

      if (!frontmatter.id) {
        console.error(`❌ Error: Missing 'id' in frontmatter of ${mdxFile}`);
        hasErrors = true;
        errorCount++;
      } else if (frontmatter.id !== filename) {
        console.error(`❌ Error: Frontmatter 'id' (${frontmatter.id}) does not match filename (${filename}) in ${mdxFile}`);
        hasErrors = true;
        errorCount++;
      }

      const requiredFields = ["title", "skillLevel", "useCase", "summary"];
      for (const field of requiredFields) {
        if (!frontmatter[field]) {
          console.error(`❌ Error: Missing '${field}' in frontmatter of ${mdxFile}`);
          hasErrors = true;
          errorCount++;
        }
      }
    } catch (error) {
      console.error(`❌ Error: Invalid frontmatter in ${mdxFile}:`, error);
      hasErrors = true;
      errorCount++;
      continue;
    }

    // 2. Validate TypeScript code blocks match source
    const tsFile = path.join(srcdir, mdxFile.replace(".mdx", ".ts"));
    try {
      const tsContent = await fs.readFile(tsFile, "utf-8");
      
      // Find the Good Example section
      const goodExampleMatch = content.match(/## Good Example[\s\S]*?```typescript\n([\s\S]*?)\n```/);
      
      if (!goodExampleMatch || !goodExampleMatch[1]) {
        console.error(`❌ Error: No TypeScript code block found in Good Example section of ${mdxFile}`);
        hasErrors = true;
        errorCount++;
        continue;
      }

      const codeBlockContent = goodExampleMatch[1].trim();
      const sourceContent = tsContent.trim();

      if (codeBlockContent !== sourceContent) {
        console.error(`❌ Error: TypeScript code block in ${mdxFile} does not match source file ${path.basename(tsFile)}`);
        hasErrors = true;
        errorCount++;
      }
    } catch (error) {
      console.error(`❌ Error: Failed to validate TypeScript code in ${mdxFile}:`, error);
      hasErrors = true;
      errorCount++;
    }

    // 3. Validate required sections
    const requiredSections = ["## Good Example", "## Anti-Pattern"];
const explanationFormats = ["**Explanation:**", "## Explanation", "## Rationale"];
if (!explanationFormats.some(format => content.includes(format))) {
  console.error(`❌ Error: Missing explanation section (Explanation or Rationale) in ${mdxFile}`);
  hasErrors = true;
  errorCount++;
}
    for (const section of requiredSections) {
      if (!content.includes(section)) {
        console.error(`❌ Error: Missing required section '${section}' in ${mdxFile}`);
        hasErrors = true;
        errorCount++;
      }
    }
  }

  if (hasErrors) {
    console.error(`❌ Validation failed with ${errorCount} errors`);
    process.exit(1);
  }

  console.log("✨ Validation complete! All patterns are valid.");
}

// Run if called directly
if (require.main === module) {
  validatePatterns().catch(error => {
    console.error("Failed to validate patterns:", error);
    process.exit(1);
  });
}

export { validatePatterns };
