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

import { NodeContext } from "@effect/platform-node";
import { FileSystem } from "@effect/platform";
import { Effect, Layer } from "effect";
import { MdxService } from "../../cli/src/services/mdx-service/service.js";
import * as path from "path";

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

const validateFrontMatter = (filePath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const mdxService = yield* MdxService;
    
    const content = yield* fs.readFileString(filePath);
    const parsed = yield* mdxService.readMdxAndFrontmatter(filePath);

    // Validate required fields
    if (!parsed.frontmatter.id) {
      return yield* Effect.fail(new Error(`Missing required field 'id' in ${filePath}`));
    }
    if (!parsed.frontmatter.title) {
      return yield* Effect.fail(new Error(`Missing required field 'title' in ${filePath}`));
    }
    if (!parsed.frontmatter.skillLevel) {
      return yield* Effect.fail(new Error(`Missing required field 'skillLevel' in ${filePath}`));
    }
    if (!parsed.frontmatter.useCase) {
      return yield* Effect.fail(new Error(`Missing required field 'useCase' in ${filePath}`));
    }
    if (!parsed.frontmatter.summary) {
      return yield* Effect.fail(new Error(`Missing required field 'summary' in ${filePath}`));
    }

    // Validate skillLevel
    const validSkillLevels = ["Beginner", "Intermediate", "Advanced"];
    const skillLevel = parsed.frontmatter.skillLevel as string;
    if (!validSkillLevels.includes(skillLevel)) {
      return yield* Effect.fail(
        new Error(
          `Invalid skillLevel '${skillLevel}' in ${filePath}. Must be one of: ${validSkillLevels.join(", ")}`
        )
      );
    }

    // Validate useCase is an array
    if (!Array.isArray(parsed.frontmatter.useCase)) {
      return yield* Effect.fail(
        new Error(
          `useCase must be an array in ${filePath}`
        )
      );
    }

    // Cast to FrontMatter type
    return parsed.frontmatter as unknown as FrontMatter;
  });

const validateSections = (filePath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const mdxService = yield* MdxService;
    
    const content = yield* fs.readFileString(filePath);
    const parsed = yield* mdxService.readMdxAndFrontmatter(filePath);
    const sections = parsed.content.split("\n## ");

    // Check for required sections
    const requiredSections = ["Good Example", "Anti-Pattern"];
    const hasExplanation = sections.some(section =>
      section.startsWith("Explanation") || section.startsWith("Rationale")
    );

    if (!hasExplanation) {
      return yield* Effect.fail(
        new Error(
          `Missing required section in ${filePath}: Explanation or Rationale`
        )
      );
    }

    for (const section of requiredSections) {
      if (!sections.some(s => s.startsWith(section))) {
        return yield* Effect.fail(
          new Error(
            `Missing required section in ${filePath}: ${section}`
          )
        );
      }
    }
    
    return yield* Effect.void;
  });

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
const main = () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const mdxService = yield* MdxService;
    
    // Ensure directories exist
    yield* fs.makeDirectory(NEW_RAW_DIR, { recursive: true });
    yield* fs.makeDirectory(NEW_SRC_DIR, { recursive: true });
    yield* fs.makeDirectory(NEW_PROCESSED_DIR, { recursive: true });

    // Check that src and processed are empty
    const srcFiles = yield* fs.readDirectory(NEW_SRC_DIR);
    if (srcFiles.length > 0) {
      return yield* Effect.fail(new Error(`Directory not empty: ${NEW_SRC_DIR}`));
    }
    const processedFiles = yield* fs.readDirectory(NEW_PROCESSED_DIR);
    if (processedFiles.length > 0) {
      return yield* Effect.fail(new Error(`Directory not empty: ${NEW_PROCESSED_DIR}`));
    }

    // Get list of new MDX files
    const files = yield* fs.readDirectory(NEW_RAW_DIR);
    const mdxFiles = files.filter(file => file.endsWith(".mdx"));

    if (mdxFiles.length === 0) {
      console.log("No new patterns to process");
      return yield* Effect.void;
    }

    console.log(`Found ${mdxFiles.length} new pattern(s) to process`);

    // Process each pattern
    for (const file of mdxFiles) {
      const filePath = path.join(NEW_RAW_DIR, file);
      console.log(`\nProcessing ${file}...`);

      // Validate frontmatter and sections
      const frontmatter = yield* validateFrontMatter(filePath);
      yield* validateSections(filePath);

      // Extract Good Example TypeScript
      const rawContent = yield* fs.readFileString(filePath);
      const parsed = yield* mdxService.readMdxAndFrontmatter(filePath);
      const tsCode = extractGoodExampleTS(parsed.content);
      if (!tsCode) {
        return yield* Effect.fail(new Error(`No TypeScript code block found in Good Example section of ${file}`));
      }
      // Write TypeScript file
      const tsTarget = path.join(NEW_SRC_DIR, `${frontmatter.id}.ts`);
      yield* fs.writeFileString(tsTarget, tsCode);

      // Replace Good Example code block with Example tag
      const processedMdx = replaceGoodExampleWithExampleTag(rawContent, frontmatter.id);
      const mdxTarget = path.join(NEW_PROCESSED_DIR, `${frontmatter.id}.mdx`);
      yield* fs.writeFileString(mdxTarget, processedMdx);

      console.log(`✅ Successfully processed ${frontmatter.title}`);
    }

    console.log("\n✨ All patterns processed successfully!");
  });

// Run if called directly
if (require.main === module) {
  const program = main();
  
  // Define layers
  const allLayers = Layer.mergeAll(
    NodeContext.layer, // Provides all Node.js platform implementations
    Layer.provide(MdxService.Default, NodeContext.layer) // MDX service with its dependencies
  );
  
  // Run the program
  Effect.runPromise(Effect.provide(program, allLayers)).catch((error) => {
    console.error("❌ Error processing patterns:", error);
    process.exit(1);
  });
}
