/**
 * test-publish.ts
 *
 * Ingest pipeline test script for Effect Patterns. This script takes processed MDX files
 * and generates published MDX files by:
 *
 * 1. Reading processed MDX files from /content/new/processed
 * 2. Finding corresponding TypeScript files in /content/new/src
 * 3. Replacing <Example /> components with actual TypeScript code
 * 4. Writing the result to /content/new/published
 *
 * Usage:
 * ```bash
 * bun run scripts/ingest/test-publish.ts
 * ```
 *
 * The script will:
 * - Process all MDX files in the processed directory
 * - Replace Example components with TypeScript code
 * - Create the published directory if it doesn't exist
 * - Write the processed files to the published directory
 * - Exit with code 1 if any errors occur
 */

import { NodeContext } from "@effect/platform-node";
import { FileSystem } from "@effect/platform";
import { Effect, Layer } from "effect";
import { MdxService } from "../../cli/src/services/mdx-service/service.js";
import * as path from "path";

// --- CONFIGURATION ---
const PROCESSED_DIR = path.join(process.cwd(), "content/new/processed");
const PUBLISHED_DIR = path.join(process.cwd(), "content/new/published");
const SRC_DIR = path.join(process.cwd(), "content/new/src");

// --- Effect Program ---
interface PublishOptions {
  indir?: string;
  outdir?: string;
  srcdir?: string;
}
/**
 * Publishes MDX files by replacing Example components with TypeScript code blocks.
 * Takes processed MDX files and TypeScript source files and creates published MDX files.
 */
const publishPatterns = ({
  indir = PROCESSED_DIR,
  outdir = PUBLISHED_DIR,
  srcdir = SRC_DIR,
}: PublishOptions = {}) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const mdxService = yield* MdxService;

    console.log(`Publishing MDX files from ${indir}`);
    console.log(`Writing published files to ${outdir}`);
    console.log(`Using TypeScript source files from ${srcdir}`);

    // Ensure output directory exists
    yield* fs.makeDirectory(outdir, { recursive: true });
    // Get all MDX files from input directory
    const files = yield* fs.readDirectory(indir);
    const mdxFiles = files.filter((file) => file.endsWith(".mdx"));

    console.log(`Found ${mdxFiles.length} MDX files to process`);

    for (const mdxFile of mdxFiles) {
      const inPath = path.join(indir, mdxFile);
      const outPath = path.join(outdir, mdxFile);

      // Read processed MDX content
      const content = yield* fs.readFileString(inPath);
      // Parse MDX with frontmatter using MDX service
      const parsed = yield* mdxService.readMdxAndFrontmatter(inPath);

      // Find corresponding TypeScript file
      const tsFile = path.join(srcdir, mdxFile.replace(".mdx", ".ts"));

      try {
        const tsContent = yield* fs.readFileString(tsFile);

        // Replace Example component with TypeScript code block
        const processedContent = content.replace(
          /<Example path="\.\/src\/.*?" \/>/g,
          "```typescript\n" + tsContent + "\n```"
        );

        // Write published MDX
        yield* fs.writeFileString(outPath, processedContent);
        console.log(`✅ Published ${mdxFile} to ${outPath}`);
      } catch (error) {
        console.error(`❌ Error processing ${mdxFile}:`, error);
        process.exit(1);
      }
    }

    console.log("✨ Publishing complete!");
  });

// Run if called directly
if (require.main === module) {
  const program = publishPatterns();

  // Define layers
  const allLayers = Layer.mergeAll(
    NodeContext.layer, // Provides all Node.js platform implementations
    Layer.provide(MdxService.Default, NodeContext.layer) // MDX service with its dependencies
  );

  // Run the program
  Effect.runPromise(Effect.provide(program, allLayers)).catch((error) => {
    console.error("Failed to publish patterns:", error);
    process.exit(1);
  });
}

export { publishPatterns };
