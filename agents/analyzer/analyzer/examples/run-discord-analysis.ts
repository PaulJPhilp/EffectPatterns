#!/usr/bin/env bun

/**
 * Example: Running the Discord Q&A Analyzer
 *
 * This script demonstrates how to use the Effect-TS Discord Q&A analyzer
 * to process real Discord conversation data and generate insights.
 *
 * Usage:
 *   bun run examples/run-discord-analysis.ts
 *
 * Prerequisites:
 *   - .env file with OPENAI_API_KEY (copy from .env.example)
 *   - Discord Q&A data available at ../../packages/data/discord-qna.json
 */

import { FileSystem } from '@effect/platform/FileSystem';
import { Path } from '@effect/platform/Path';
import { NodeContext } from '@effect/platform-node';
import { Console, Effect } from 'effect';
import { setupEnvironment } from '../env-loader.js';
import { app, type GraphState } from '../graph.js';

/**
 * Main program that runs the analyzer with proper error handling
 * and progress reporting.
 */
const program = Effect.gen(function* () {
  yield* Console.log('🚀 Starting Effect-TS Discord Q&A Analyzer\n');

  // ============================================================
  // Step 1: Load and Validate Environment
  // ============================================================
  yield* Console.log('📋 Step 1: Loading environment...');
  yield* setupEnvironment(['OPENAI_API_KEY']);
  yield* Console.log('');

  // ============================================================
  // Step 2: Setup Paths
  // ============================================================
  yield* Console.log('📁 Step 2: Setting up file paths...');

  const fs = yield* FileSystem;
  const path = yield* Path;

  // Find project root (go up from scripts/analyzer to project root)
  const projectRoot = path.resolve(process.cwd(), '../..');

  const inputPath = path.resolve(
    projectRoot,
    'packages',
    'data',
    'discord-qna.json',
  );

  const outputDir = path.resolve(projectRoot, 'scripts', 'analyzer', 'output');

  const outputPath = path.join(outputDir, 'discord-analysis.md');

  // Create output directory if it doesn't exist
  yield* fs.makeDirectory(outputDir, { recursive: true }).pipe(
    Effect.catchAll(() => Effect.void), // Ignore if already exists
  );

  yield* Console.log(`   📥 Input:  ${inputPath}`);
  yield* Console.log(`   📤 Output: ${outputPath}\n`);

  // ============================================================
  // Step 3: Verify Input File
  // ============================================================
  yield* Console.log('🔍 Step 3: Verifying input file...');

  const fileExists = yield* fs.exists(inputPath);
  if (!fileExists) {
    return yield* Effect.fail(
      new Error(
        `❌ Input file not found: ${inputPath}\n` +
          '   Please ensure discord-qna.json exists in packages/data/',
      ),
    );
  }
  const fileInfo = yield* fs.stat(inputPath);
  yield* Console.log(`   ✅ File found (${fileInfo.size} bytes)\n`);

  // ============================================================
  // Step 4: Run Analysis
  // ============================================================
  yield* Console.log('🤖 Step 4: Running analysis (this may take a minute)...');
  yield* Console.log('   ⏳ Processing messages with GPT-4o...\n');

  const startTime = Date.now();

  const result = (yield* Effect.promise(() =>
    app.invoke({
      inputFile: inputPath,
      outputFile: outputPath,
    }),
  )) as GraphState;

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // ============================================================
  // Step 5: Display Results
  // ============================================================
  yield* Console.log('\n✨ Analysis Complete!\n');
  yield* Console.log('📊 Summary:');
  yield* Console.log(`   • Total Messages: ${result.totalMessages ?? 0}`);
  yield* Console.log(`   • Chunks Created: ${result.chunkCount ?? 0}`);
  yield* Console.log(
    `   • Chunking Strategy: ${result.chunkingStrategy ?? 'N/A'}`,
  );
  yield* Console.log(
    `   • Analyses Generated: ${result.partialAnalyses?.length ?? 0}`,
  );
  yield* Console.log(`   • Processing Time: ${duration}s\n`);

  // ============================================================
  // Step 6: Display Report Preview
  // ============================================================
  if (result.finalReport) {
    const reportLines = result.finalReport.split('\n');
    const preview = reportLines.slice(0, 20).join('\n');

    yield* Console.log('📄 Report Preview (first 20 lines):');
    yield* Console.log('─'.repeat(60));
    yield* Console.log(preview);
    yield* Console.log('─'.repeat(60));

    if (reportLines.length > 20) {
      yield* Console.log(`\n   (${reportLines.length - 20} more lines...)`);
    }
  }

  yield* Console.log(`\n💾 Full report saved to: ${outputPath}`);

  // ============================================================
  // Step 7: Quality Checks
  // ============================================================
  yield* Console.log('\n🔍 Quality Checks:');

  const reportText = result.finalReport ?? '';
  const reportLower = reportText.toLowerCase();

  const checks = [
    {
      name: 'Contains Effect-TS concepts',
      passed:
        reportLower.includes('effect') ||
        reportLower.includes('service') ||
        reportLower.includes('layer'),
    },
    {
      name: 'Mentions HttpApi patterns',
      passed:
        reportLower.includes('httpapi') || reportLower.includes('httprouter'),
    },
    {
      name: 'Discusses error handling',
      passed: reportLower.includes('error') || reportLower.includes('fail'),
    },
    {
      name: 'Includes code examples',
      passed: reportText.includes('```') || reportText.includes('Effect.gen'),
    },
    {
      name: 'Has structured sections',
      passed: reportText.includes('##'),
    },
  ];

  for (const check of checks) {
    const icon = check.passed ? '✅' : '⚠️';
    yield* Console.log(`   ${icon} ${check.name}`);
  }

  const passedCount = checks.filter((c) => c.passed).length;
  yield* Console.log(
    `\n   Quality Score: ${passedCount}/${checks.length} checks passed`,
  ); // ============================================================
  // Step 8: Next Steps
  // ============================================================
  yield* Console.log('\n📖 Next Steps:');
  yield* Console.log('   1. Review the full report in your editor');
  yield* Console.log('   2. Check for identified patterns and pain points');
  yield* Console.log('   3. Use insights to improve documentation');
  yield* Console.log('   4. Share findings with the Effect-TS community\n');

  return result;
});

/**
 * Error handler that provides user-friendly error messages
 */
const handleError = (error: unknown): Effect.Effect<void> => {
  return Effect.gen(function* () {
    yield* Console.log('\n❌ Analysis Failed\n');

    if (error instanceof Error) {
      yield* Console.log(`Error: ${error.message}\n`);

      // Provide helpful hints based on error type
      if (error.message.includes('OPENAI_API_KEY')) {
        yield* Console.log('💡 Tip: Create a .env file:');
        yield* Console.log('   cp .env.example .env');
        yield* Console.log('   # Then edit .env and add your API key\n');
      } else if (error.message.includes('not found')) {
        yield* Console.log('💡 Tip: Ensure the input file exists:');
        yield* Console.log('   packages/data/discord-qna.json\n');
      } else if (error.message.includes('rate limit')) {
        yield* Console.log('💡 Tip: Rate limit exceeded. Try:');
        yield* Console.log('   - Wait a few minutes and retry');
        yield* Console.log('   - Reduce CHUNK_SIZE in .env');
        yield* Console.log('   - Check your OpenAI API quota\n');
      } else if (error.message.includes('timeout')) {
        yield* Console.log('💡 Tip: Request timed out. Try:');
        yield* Console.log('   - Increase REQUEST_TIMEOUT in .env');
        yield* Console.log('   - Check your network connection\n');
      }
    } else {
      yield* Console.log(`Unknown error: ${String(error)}\n`);
    }

    yield* Console.log('For more help, see:');
    yield* Console.log('   scripts/analyzer/README.md#troubleshooting\n');
  });
};

/**
 * Main entry point with runtime execution
 */
const main = program.pipe(
  Effect.catchAll((error) =>
    handleError(error).pipe(Effect.flatMap(() => Effect.fail(error))),
  ),
  Effect.provide(NodeContext.layer),
);

// Run the program and exit with appropriate code
const mainWithSuccessLog = main.pipe(Effect.tap(() => Console.log('✅ Done!')));

Effect.runPromiseExit(mainWithSuccessLog).then((exit) => {
  process.exit(exit._tag === 'Success' ? 0 : 1);
});
