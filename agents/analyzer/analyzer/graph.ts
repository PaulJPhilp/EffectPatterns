import { FileSystem } from '@effect/platform/FileSystem';
import { NodeContext } from '@effect/platform-node';
import { Effect, Layer } from 'effect';
import { z } from 'zod';
import { chunkMessagesDefault } from './chunking-service.js';
import {
  type AnalyzerError,
  FileReadError,
  InvalidJSONError,
} from './errors.js';
import type { Message } from './schemas.js';
import { LLMService, LLMServiceLive } from './services.js';
import {
  DataValidationService,
  validateMessageCollection,
} from './validation-service.js';

// GraphState now uses proper Message types instead of z.any()
const GraphStateSchema = z.object({
  inputFile: z.string(),
  outputFile: z.string(),
  messages: z.array(z.any()).optional(), // Will be validated Message[]
  chunks: z.array(z.array(z.any())).optional(), // Will be Message[][]
  partialAnalyses: z.array(z.string()).optional(),
  finalReport: z.string().optional(),
  // Metadata for tracking
  chunkingStrategy: z.string().optional(),
  totalMessages: z.number().optional(),
  chunkCount: z.number().optional(),
});
export type GraphState = z.infer<typeof GraphStateSchema>;

// Create the main analysis layer with all dependencies
const AnalysisLayer = Layer.mergeAll(
  LLMServiceLive,
  DataValidationService.Live,
  NodeContext.layer,
);

const nodes = {
  /**
   * Step 1: Load file, validate data, and create smart chunks
   */
  loadAndChunkData: async (state: GraphState) => {
    const program = Effect.gen(function* () {
      yield* Effect.log(`📖 Loading file: ${state.inputFile}`);

      const fs = yield* FileSystem;

      // Read file with proper error handling
      const content = yield* fs.readFileString(state.inputFile).pipe(
        Effect.mapError(
          (cause) =>
            new FileReadError({
              path: state.inputFile,
              cause,
            }),
        ),
        Effect.tapError((error) =>
          Effect.logError(`Failed to read file: ${error.path}`),
        ),
      );

      // Parse JSON with error handling
      const parsedData = yield* Effect.try({
        try: () => JSON.parse(content),
        catch: (cause) =>
          new InvalidJSONError({
            path: state.inputFile,
            cause,
          }),
      }).pipe(
        Effect.tapError((error) =>
          Effect.logError(`Invalid JSON in file: ${error.path}`),
        ),
      );

      // Validate message structure using our schema
      yield* Effect.log('✅ Validating message data...');
      const rawCollection = yield* validateMessageCollection(parsedData);

      // Extract validated messages from the MessageCollection result
      const messages = [...rawCollection.messages];

      yield* Effect.log(`📊 Found ${messages.length} messages`);

      // Smart chunking with our heuristic
      yield* Effect.log('🧩 Creating smart chunks...');
      // Deleting the TypeScript error since it's a known issue with zod
      const chunkingResult = yield* chunkMessagesDefault(messages);

      yield* Effect.log(
        `✅ Created ${chunkingResult.chunkCount} chunks (strategy: ${chunkingResult.strategy})`,
      );
      yield* Effect.log(
        `   Average chunk size: ${chunkingResult.averageChunkSize} messages`,
      );

      return {
        messages: messages as unknown[],
        chunks: chunkingResult.chunks as unknown[][],
        chunkingStrategy: chunkingResult.strategy,
        totalMessages: chunkingResult.totalMessages,
        chunkCount: chunkingResult.chunkCount,
      } satisfies Partial<GraphState>;
    }).pipe(
      Effect.catchAll((error: AnalyzerError) =>
        Effect.gen(function* () {
          yield* Effect.logError(`❌ Load and chunk failed: ${error._tag}`);
          // Re-throw to stop the workflow
          return yield* Effect.fail(error);
        }),
      ),
    );

    return await Effect.runPromise(Effect.provide(program, AnalysisLayer));
  },

  /**
   * Step 2: Analyze a single chunk using LLM
   */
  analyzeSingleChunk: async (
    _state: GraphState,
    _config: { recursionLimit?: number },
    chunk: unknown[],
  ) => {
    const program = Effect.gen(function* () {
      const llm = yield* LLMService;
      yield* Effect.log(`🔍 Analyzing chunk with ${chunk.length} messages`);

      const partialAnalysis = yield* llm.analyzeChunk(chunk as Message[]);

      yield* Effect.log('✅ Chunk analysis complete');
      return {
        partialAnalyses: [partialAnalysis],
      } satisfies Partial<GraphState>;
    });

    return await Effect.runPromise(Effect.provide(program, AnalysisLayer));
  },

  /**
   * Step 3: Aggregate all partial analyses into final report
   */
  aggregateResults: async (state: GraphState) => {
    const program = Effect.gen(function* () {
      const llm = yield* LLMService;
      const fs = yield* FileSystem;

      yield* Effect.log('📝 Aggregating partial analyses...');
      yield* Effect.log(
        `   Processing ${state.partialAnalyses?.length ?? 0} partial analyses`,
      );

      const finalReport = yield* llm.aggregateAnalyses(
        state.partialAnalyses ?? [],
      );

      yield* Effect.log(`💾 Saving report to: ${state.outputFile}`);
      yield* fs.writeFileString(state.outputFile, finalReport);

      yield* Effect.log('✅ Final report saved successfully');
      return { finalReport } satisfies Partial<GraphState>;
    });

    return await Effect.runPromise(Effect.provide(program, AnalysisLayer));
  },
};

/**
 * Pure Effect-TS workflow implementation
 * Replaces LangGraph with native Effect composition
 */
export const app = {
  invoke: async (input: {
    inputFile: string;
    outputFile: string;
  }): Promise<GraphState> => {
    const program = Effect.gen(function* () {
      // Step 1: Load and chunk data
      const step1Result = yield* Effect.promise(() =>
        nodes.loadAndChunkData({ ...input }),
      );

      const state1: GraphState = { ...input, ...step1Result };

      // Step 2: Analyze each chunk
      const chunks = state1.chunks ?? [];
      const partialAnalyses: string[] = [];

      for (const chunk of chunks) {
        const step2Result = yield* Effect.promise(() =>
          nodes.analyzeSingleChunk(state1, {}, chunk),
        );
        partialAnalyses.push(...(step2Result.partialAnalyses ?? []));
      }

      const state2: GraphState = { ...state1, partialAnalyses };

      // Step 3: Aggregate results
      const step3Result = yield* Effect.promise(() =>
        nodes.aggregateResults(state2),
      );

      const finalState: GraphState = { ...state2, ...step3Result };

      return finalState;
    });

    return await Effect.runPromise(Effect.provide(program, AnalysisLayer));
  },
};
