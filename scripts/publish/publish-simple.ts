/**
 * publish-simple.ts
 *
 * Simplified version that doesn't use effect-mdx
 * Just reads MDX files, replaces Example components with TypeScript code
 *
 * Reads from content/new/processed/ (MDX with <Example /> tags)
 * Reads TypeScript from content/new/src/
 * Writes to content/new/published/ (MDX with embedded code)
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// --- CONFIGURATION ---
const PROCESSED_DIR = path.join(process.cwd(), 'content/new/processed');
const NEW_PUBLISHED_DIR = path.join(process.cwd(), 'content/new/published');
const NEW_SRC_DIR = path.join(process.cwd(), 'content/new/src');

async function publishPatterns() {
  console.log(
    `Publishing patterns from ${PROCESSED_DIR} to ${NEW_PUBLISHED_DIR}`,
  );
  console.log(`Using TypeScript source files from ${NEW_SRC_DIR}`);

  // Ensure output directory exists
  await fs.mkdir(NEW_PUBLISHED_DIR, { recursive: true });

  // Get all MDX files from input directory
  const files = await fs.readdir(PROCESSED_DIR);
  const mdxFiles = files.filter((file) => file.endsWith('.mdx'));

  console.log(`Found ${mdxFiles.length} MDX files to process`);

  let successCount = 0;
  let errorCount = 0;

  for (const mdxFile of mdxFiles) {
    const inPath = path.join(PROCESSED_DIR, mdxFile);
    const outPath = path.join(NEW_PUBLISHED_DIR, mdxFile);

    try {
      // Read processed MDX content
      const content = await fs.readFile(inPath, 'utf-8');

      // Find corresponding TypeScript file
      const tsFile = path.join(NEW_SRC_DIR, mdxFile.replace('.mdx', '.ts'));

      const tsContent = await fs.readFile(tsFile, 'utf-8');

      // Replace Example component with TypeScript code block
      const processedContent = content.replace(
        /<Example path="\.\/src\/.*?" \/>/g,
        `\`\`\`typescript\n${tsContent}\n\`\`\``,
      );

      // Write published MDX
      await fs.writeFile(outPath, processedContent, 'utf-8');
      console.log(`✅ Published ${mdxFile}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error processing ${mdxFile}:`, error);
      errorCount++;
    }
  }

  console.log('\n✨ Publishing complete!');
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

publishPatterns().catch((error) => {
  console.error('Failed to publish patterns:', error);
  process.exit(1);
});
