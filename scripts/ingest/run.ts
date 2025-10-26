/**
 * run.ts
 *
 * The main entry point for the ingest pipeline.
 * This script orchestrates the entire process of ingesting, validating,
 * and preparing pattern files for publishing.
 */

import { FileSystem, Path } from '@effect/platform';
import { NodeContext } from '@effect/platform-node';
import { Console, Effect, Layer } from 'effect';
import { MdxService } from 'effect-mdx';

// --- Configuration Service ---
class AppConfig extends Effect.Service<AppConfig>()('AppConfig', {
  sync: () => ({
    rawDir: `${process.cwd()}/content/new/raw`,
    srcDir: `${process.cwd()}/content/new/src`,
    processedDir: `${process.cwd()}/content/new/processed`,
  }),
}) {}

// --- Pipeline Stages ---

/**
 * The 'extract' stage of the pipeline.
 * - Reads all MDX files from the raw directory.
 * - Validates frontmatter and required sections.
 * - Extracts TypeScript from 'Good Example' into a .ts file.
 * - Replaces the code block with an <Example /> component.
 * - Writes the processed MDX to the 'processed' directory.
 */
const extract = Effect.gen(function* () {
  const config = yield* AppConfig;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const mdx = yield* MdxService;

  yield* Console.log('--- Running: Extract Stage ---');

  const rawMdxFiles = yield* fs.readDirectory(config.rawDir);

  yield* Effect.forEach(
    rawMdxFiles,
    (file) =>
      Effect.gen(function* () {
        const filePath = path.join(config.rawDir, file);
        yield* Console.log(`Processing ${file}...`);

        const { content, frontmatter } =
          yield* mdx.readMdxAndFrontmatter(filePath);

        // Simple validation for now, can be expanded
        if (!(frontmatter.id && frontmatter.title)) {
          return yield* Effect.fail(
            new Error(`Missing id or title in ${file}`),
          );
        }

        const codeBlockRegex =
          /## Good Example[\s\S]*?```typescript\n([\s\S]*?)\n```/;
        const tsCodeMatch = content.match(codeBlockRegex);
        const tsCode = tsCodeMatch ? tsCodeMatch[1] : null;

        if (!tsCode) {
          return yield* Effect.fail(
            new Error(`No TypeScript code block found in ${file}`),
          );
        }

        const tsTargetPath = path.join(config.srcDir, `${frontmatter.id}.ts`);
        yield* fs.writeFileString(tsTargetPath, tsCode);

        const processedMdx = content.replace(
          codeBlockRegex,
          `## Good Example\n\n<Example path="./src/${frontmatter.id}.ts" />`,
        );
        const mdxTargetPath = path.join(
          config.processedDir,
          `${frontmatter.id}.mdx`,
        );
        yield* fs.writeFileString(mdxTargetPath, processedMdx);

        yield* Console.log(`✅ Successfully extracted ${file}`);
      }).pipe(Effect.catchAll((error) => Console.error(String(error)))),
    { concurrency: 'unbounded', discard: true },
  );

  yield* Console.log('--- Completed: Extract Stage ---');
});

// --- Main Orchestrator ---
const main = Effect.gen(function* () {
  yield* Console.log('🚀 Starting ingest pipeline...');

  // For now, we only run the extract stage.
  // We will add more stages here.
  yield* extract;

  yield* Console.log('✅ Ingest pipeline completed successfully!');
});

// --- Run the Program ---
const runnable = main.pipe(
  Effect.provide(
    Layer.mergeAll(
      AppConfig.Default,
      NodeContext.layer,
      Layer.provide(MdxService.Default, NodeContext.layer),
    ),
  ),
);

Effect.runFork(runnable as Effect.Effect<void, unknown, never>);
