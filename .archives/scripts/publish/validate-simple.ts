/**
 * validate-simple.ts
 *
 * Simplified validation that doesn't use effect-mdx
 *
 * Validates content/new/published/ (output of publish step)
 * Checks for corresponding TypeScript files in content/new/src/
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';

// --- CONFIGURATION ---
const NEW_PUBLISHED_DIR = path.join(process.cwd(), 'content/new/published');
const NEW_SRC_DIR = path.join(process.cwd(), 'content/new/src');

async function validatePatterns() {
  console.log(`Validating patterns in ${NEW_PUBLISHED_DIR}`);
  console.log(`Using TypeScript source files from ${NEW_SRC_DIR}`);

  const files = await fs.readdir(NEW_PUBLISHED_DIR);
  const mdxFiles = files.filter((file) => file.endsWith('.mdx'));
  const tsFiles = await fs.readdir(NEW_SRC_DIR);

  console.log(
    `Found ${mdxFiles.length} MDX files and ${tsFiles.length} TypeScript files`,
  );

  let hasErrors = false;
  let errorCount = 0;

  for (const mdxFile of mdxFiles) {
    const mdxPath = path.join(NEW_PUBLISHED_DIR, mdxFile);
    const content = await fs.readFile(mdxPath, 'utf-8');

    // 1. Validate frontmatter
    try {
      const { data: frontmatter } = matter(content);
      const filename = path.basename(mdxFile, '.mdx');

      if (!frontmatter.id) {
        console.error(`❌ Error: Missing 'id' in frontmatter of ${mdxFile}`);
        hasErrors = true;
        errorCount++;
      } else if (frontmatter.id !== filename) {
        console.error(
          `❌ Error: Frontmatter 'id' (${frontmatter.id}) does not match filename (${filename}) in ${mdxFile}`,
        );
        hasErrors = true;
        errorCount++;
      }

      const requiredFields = ['title', 'skillLevel', 'useCase', 'summary'];
      for (const field of requiredFields) {
        if (!frontmatter[field]) {
          console.error(
            `❌ Error: Missing '${field}' in frontmatter of ${mdxFile}`,
          );
          hasErrors = true;
          errorCount++;
        }
      }
    } catch (error) {
      console.error(`❌ Error parsing frontmatter in ${mdxFile}:`, error);
      hasErrors = true;
      errorCount++;
      continue;
    }

    // 2. Check for required sections
    const hasGoodExample = /##\s+Good Example/i.test(content);
    const hasAntiPattern = /##\s+Anti-Pattern/i.test(content);
    const hasExplanationOrRationale = /##\s+(Explanation|Rationale)/i.test(
      content,
    );

    if (!hasGoodExample) {
      console.error(`❌ Error: Missing 'Good Example' section in ${mdxFile}`);
      hasErrors = true;
      errorCount++;
    }

    if (!hasAntiPattern) {
      console.error(`❌ Error: Missing 'Anti-Pattern' section in ${mdxFile}`);
      hasErrors = true;
      errorCount++;
    }

    if (!hasExplanationOrRationale) {
      console.error(
        `❌ Error: Missing 'Explanation' or 'Rationale' section in ${mdxFile}`,
      );
      hasErrors = true;
      errorCount++;
    }

    // 3. Check that TypeScript file exists
    const tsFile = path.join(NEW_SRC_DIR, mdxFile.replace('.mdx', '.ts'));
    try {
      await fs.access(tsFile);
    } catch (_error) {
      console.error(`❌ Error: TypeScript file not found: ${tsFile}`);
      hasErrors = true;
      errorCount++;
    }
  }

  // Summary
  if (hasErrors) {
    console.error(`\n❌ Validation failed with ${errorCount} errors`);
    process.exit(1);
  } else {
    console.log('\n✅ All patterns validated successfully!');
  }
}

validatePatterns().catch((error) => {
  console.error('Failed to validate patterns:', error);
  process.exit(1);
});
