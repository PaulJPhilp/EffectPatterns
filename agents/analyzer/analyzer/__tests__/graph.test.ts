import { FileSystem } from '@effect/platform/FileSystem';
import { Path } from '@effect/platform/Path';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { app, type GraphState } from '../graph.js';
import { withLiveRuntime } from './runtime.js';

const describeLive = process.env.OPENAI_API_KEY ? describe : describe.skip;

const EXPECTED_TOTAL_MESSAGES = 50;
const REPORT_PREVIEW_LENGTH = 500;

describeLive('Analyzer graph (live)', () => {
  it('processes the mock export end to end', async () => {
    const { finalState, reportText } = await withLiveRuntime(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        const path = yield* Path;
        const fixturePath = path.resolve(
          process.cwd(),
          'scripts',
          'analyzer',
          'test-data',
          'mock-export.json',
        );
        const tempDir = yield* fs.makeTempDirectoryScoped();
        const outputPath = path.join(tempDir, 'report.txt');
        const graphState = (yield* Effect.promise(() =>
          app.invoke({
            inputFile: fixturePath,
            outputFile: outputPath,
          }),
        )) as GraphState;
        const reportContent = yield* fs.readFileString(outputPath);
        return {
          finalState: graphState,
          reportText: reportContent,
        };
      }),
    );

    expect(finalState.chunks?.length ?? 0).toBeGreaterThan(0);
    expect(finalState.partialAnalyses?.length ?? 0).toBeGreaterThan(0);
    expect(finalState.finalReport?.trim().length ?? 0).toBeGreaterThan(0);
    expect(reportText.trim().length).toBeGreaterThan(0);
  });

  it('processes real Discord Q&A data (discord-qna.json)', async () => {
    const { finalState, reportText, metadata } = await withLiveRuntime(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        const path = yield* Path;

        // Path to real Discord Q&A data
        const fixturePath = path.resolve(
          process.cwd(),
          'packages',
          'data',
          'discord-qna.json',
        );

        const tempDir = yield* fs.makeTempDirectoryScoped();
        const outputPath = path.join(tempDir, 'discord-analysis.txt');

        const graphState = (yield* Effect.promise(() =>
          app.invoke({
            inputFile: fixturePath,
            outputFile: outputPath,
          }),
        )) as GraphState;

        const reportContent = yield* fs.readFileString(outputPath);

        return {
          finalState: graphState,
          reportText: reportContent,
          metadata: {
            totalMessages: graphState.totalMessages,
            chunkCount: graphState.chunkCount,
            chunkingStrategy: graphState.chunkingStrategy,
          },
        };
      }),
    );

    // ============================================================
    // Metadata Validation
    // ============================================================
    expect(metadata.totalMessages).toBe(EXPECTED_TOTAL_MESSAGES);
    expect(metadata.chunkCount).toBeGreaterThan(0);
    expect(metadata.chunkingStrategy).toBeDefined();

    // ============================================================
    // Basic Structure Validation
    // ============================================================
    expect(finalState.chunks).toBeDefined();
    expect(finalState.chunks?.length ?? 0).toBeGreaterThan(0);
    expect(finalState.partialAnalyses).toBeDefined();
    expect(finalState.partialAnalyses?.length ?? 0).toBeGreaterThan(0);
    expect(finalState.finalReport).toBeDefined();
    expect(finalState.finalReport?.trim().length ?? 0).toBeGreaterThan(0);

    // Verify report was written to file
    expect(reportText.trim().length).toBeGreaterThan(0);

    // ============================================================
    // Effect-TS Specific Content Validation
    // ============================================================
    const reportLower = reportText.toLowerCase();

    // Should mention Effect-TS core concepts
    const hasEffectConcepts =
      reportLower.includes('effect') ||
      reportLower.includes('service') ||
      reportLower.includes('layer');
    expect(hasEffectConcepts).toBe(true);

    // Should identify common patterns from the Q&A data
    const mentionsHttpApi =
      reportLower.includes('httpapi') ||
      reportLower.includes('http api') ||
      reportLower.includes('httprouter');
    const mentionsErrors =
      reportLower.includes('error') || reportLower.includes('fail');
    const mentionsSchema = reportLower.includes('schema');
    const mentionsRpc = reportLower.includes('rpc');

    // At least 2 of these core topics should be mentioned
    const topicsMentioned = [
      mentionsHttpApi,
      mentionsErrors,
      mentionsSchema,
      mentionsRpc,
    ].filter(Boolean).length;
    expect(topicsMentioned).toBeGreaterThanOrEqual(2);

    // ============================================================
    // Report Structure Validation
    // ============================================================
    // Should have key sections (not all required, but should have some structure)
    const hasSectionHeaders =
      reportText.includes('##') || // Markdown headers
      reportText.includes('Questions') ||
      reportText.includes('Patterns') ||
      reportText.includes('Best Practices') ||
      reportText.includes('Summary');
    expect(hasSectionHeaders).toBe(true);

    // ============================================================
    // Code Examples Validation
    // ============================================================
    // Should include code examples (markdown code fences or actual code snippets)
    const hasCodeExamples =
      reportText.includes('```') || // Markdown code blocks
      reportText.includes('Effect.gen') ||
      reportText.includes('yield*');
    expect(hasCodeExamples).toBe(true);

    // ============================================================
    // Log validation results for debugging
    // ============================================================
    console.log('\n📊 Discord Q&A Analysis Test Results:');
    console.log(`   Total Messages: ${metadata.totalMessages}`);
    console.log(`   Chunks Created: ${metadata.chunkCount}`);
    console.log(`   Chunking Strategy: ${metadata.chunkingStrategy}`);
    console.log(`   Report Length: ${reportText.length} characters`);
    console.log(
      `   Topics Mentioned: ${topicsMentioned}/4 (HttpApi, Errors, Schema, RPC)`,
    );
    console.log(`   Has Code Examples: ${hasCodeExamples}`);
    console.log(`   Has Section Headers: ${hasSectionHeaders}`);

    // Optional: Log a preview of the report for manual inspection
    if (process.env.VERBOSE) {
      console.log('\n📄 Report Preview (first 500 chars):');
      console.log(`${reportText.slice(0, REPORT_PREVIEW_LENGTH)}...\n`);
    }
  });
});
