/**
 * publish.ts
 * 
 * Part of the Effect Patterns documentation pipeline. This script takes raw MDX files
 * and generates published MDX files by:
 * 
 * 1. Reading raw MDX files from /content/raw
 * 2. Finding corresponding TypeScript files in /content/src
 * 3. Replacing <Example /> components with actual TypeScript code
 * 4. Writing the result to /content/published
 * 
 * Usage:
 * ```bash
 * npm run publish
 * ```
 * 
 * The script will:
 * - Process all MDX files in the raw directory
 * - Replace Example components with TypeScript code
 * - Create the published directory if it doesn't exist
 * - Write the processed files to the published directory
 * - Exit with code 1 if any errors occur
 */

import * as fs from "fs/promises";
import * as path from "path";
import matter from "gray-matter";

// --- CONFIGURATION ---
const RAW_DIR = path.join(process.cwd(), "content/raw");
const PUBLISHED_DIR = path.join(process.cwd(), "content/published");
const SRC_DIR = path.join(process.cwd(), "content/src");

interface PublishOptions {
  indir?: string;
  outdir?: string;
  srcdir?: string;
}

/**
 * Publishes MDX files by replacing Example components with TypeScript code blocks.
 * Takes raw MDX files and TypeScript source files and creates published MDX files.
 */
async function publishPatterns({ 
  indir = RAW_DIR, 
  outdir = PUBLISHED_DIR, 
  srcdir = SRC_DIR 
}: PublishOptions = {}) {
  console.log(`Publishing patterns from ${indir} to ${outdir}`);
  console.log(`Using TypeScript source files from ${srcdir}`);

  // Ensure output directory exists
  await fs.mkdir(outdir, { recursive: true });

  // Get all MDX files from input directory
  const files = await fs.readdir(indir);
  const mdxFiles = files.filter(file => file.endsWith(".mdx"));

  console.log(`Found ${mdxFiles.length} MDX files to process`);

  for (const mdxFile of mdxFiles) {
    const inPath = path.join(indir, mdxFile);
    const outPath = path.join(outdir, mdxFile);
    
    // Read raw MDX content
    const content = await fs.readFile(inPath, "utf-8");
    const { data: frontmatter } = matter(content);

    // Find corresponding TypeScript file
    const tsFile = path.join(srcdir, mdxFile.replace(".mdx", ".ts"));
    
    try {
      const tsContent = await fs.readFile(tsFile, "utf-8");
      
      // Replace Example component with TypeScript code block
      const processedContent = content.replace(
        /<Example path="\.\/src\/.*?" \/>/g,
        "```typescript\n" + tsContent + "\n```"
      );

      // Write published MDX
      await fs.writeFile(outPath, processedContent);
      console.log(`✅ Published ${mdxFile} to ${outPath}`);
    } catch (error) {
      console.error(`❌ Error processing ${mdxFile}:`, error);
      process.exit(1);
    }
  }

  console.log("✨ Publishing complete!");
}

// Run if called directly
if (require.main === module) {
  publishPatterns().catch(error => {
    console.error("Failed to publish patterns:", error);
    process.exit(1);
  });
}

export { publishPatterns };
