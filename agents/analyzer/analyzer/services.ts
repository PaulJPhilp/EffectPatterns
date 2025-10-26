import { ChatOpenAI } from '@langchain/openai';
import { Context, Effect, Layer, Schedule } from 'effect';
import {
  AnalysisError,
  LLMAuthenticationError,
  LLMRateLimitError,
  type LLMServiceError,
  LLMTimeoutError,
} from './errors.js';
import type { Message } from './schemas.js';

export class LLMService extends Context.Tag('LLMService')<
  LLMService,
  {
    readonly analyzeChunk: (
      chunk: Message[],
    ) => Effect.Effect<string, LLMServiceError | AnalysisError>;
    readonly aggregateAnalyses: (
      analyses: string[],
    ) => Effect.Effect<string, LLMServiceError | AnalysisError>;
  }
>() {}

const RETRY_AFTER_REGEX = /retry after (\d+)/i;

export const LLMServiceLive = Layer.effect(
  LLMService,
  Effect.gen(function* () {
    const llm = yield* Effect.try({
      try: () => new ChatOpenAI({ model: 'gpt-4o', temperature: 0 }),
      catch: (_cause) =>
        new LLMAuthenticationError({
          message: 'Failed to initialize OpenAI client',
        }),
    });

    // Helper to map OpenAI errors to our tagged errors
    const mapLLMError = (error: unknown): LLMServiceError | AnalysisError => {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
        return new LLMTimeoutError({
          duration: 30_000,
          operation: 'OpenAI API call',
        });
      }

      if (
        errorMsg.includes('rate limit') ||
        errorMsg.includes('429') ||
        errorMsg.includes('quota')
      ) {
        // Try to extract retry-after from error message
        const retryMatch = errorMsg.match(RETRY_AFTER_REGEX);
        const retryAfter = retryMatch
          ? Number.parseInt(retryMatch[1], 10)
          : undefined;

        return new LLMRateLimitError({
          retryAfter,
          message: 'OpenAI rate limit exceeded',
        });
      }

      if (
        errorMsg.includes('auth') ||
        errorMsg.includes('401') ||
        errorMsg.includes('API key')
      ) {
        return new LLMAuthenticationError({
          message: 'OpenAI authentication failed - check API key',
        });
      }

      return new AnalysisError({
        stage: 'llm_invocation',
        message: `LLM invocation failed: ${errorMsg}`,
        cause: error,
      });
    };

    // Retry policy: exponential backoff with max 3 attempts for retryable errors
    const retryPolicy = Schedule.exponential('1 second').pipe(
      Schedule.intersect(Schedule.recurs(2)), // Max 3 total attempts (original + 2 retries)
      Schedule.whileInput(
        (error: LLMServiceError | AnalysisError) =>
          error._tag === 'LLMTimeoutError' ||
          error._tag === 'LLMRateLimitError',
      ),
    );

    return LLMService.of({
      analyzeChunk: (chunk: Message[]) => {
        // Build Effect-TS specific prompt for chunk analysis
        const prompt = `You are an expert in Effect-TS, a TypeScript library for building robust applications with functional programming patterns.

Analyze this chunk of Discord Q&A messages about Effect-TS and extract:

1. **Common Questions**: What questions are people asking about Effect-TS?
2. **Effect Patterns**: Which Effect-TS patterns are discussed? (Services, Layers, Errors, Schema, HTTP/RPC, etc.)
3. **Pain Points**: What concepts are users struggling with?
4. **Best Practices**: What solutions or patterns are recommended?
5. **Code Examples**: Any code snippets demonstrating patterns

Messages (${chunk.length} total):
${JSON.stringify(chunk, null, 2)}

Return your analysis in JSON format with these fields:
- commonQuestions: string[]
- effectPatterns: string[]
- painPoints: string[]
- bestPractices: string[]
- codeExamples: Array<{pattern: string, code: string, explanation: string}>`;

        return Effect.tryPromise({
          try: () => llm.invoke(prompt).then((res) => res.content as string),
          catch: mapLLMError,
        }).pipe(
          Effect.retry(retryPolicy),
          Effect.tapError((error) =>
            Effect.logError(
              `Chunk analysis failed after retries: ${error._tag} - ${
                'message' in error ? error.message : 'Unknown error'
              }`,
            ),
          ),
        );
      },

      aggregateAnalyses: (analyses: string[]) => {
        // Build Effect-TS specific prompt for aggregation
        const prompt = `You are an expert in Effect-TS. You have received ${analyses.length} partial analyses of Discord Q&A conversations about Effect-TS.

Your task is to synthesize these partial analyses into a comprehensive final report.

Partial Analyses:
${JSON.stringify(analyses, null, 2)}

Create a final report with these sections:

## Executive Summary
A brief overview of the key findings

## Common Questions
The most frequently asked questions about Effect-TS, organized by topic

## Effect-TS Patterns
Patterns discussed (Services, Layers, Errors, Schema, HTTP/RPC, etc.) with examples

## Pain Points
Concepts that users find confusing or difficult, ranked by frequency

## Best Practices
Recommended solutions and patterns from the community

## Code Examples
Key code patterns demonstrated in the discussions, with explanations

## Recommendations
Suggestions for improving documentation, learning resources, or common confusion points

Format the output as well-structured Markdown.`;

        return Effect.tryPromise({
          try: () => llm.invoke(prompt).then((res) => res.content as string),
          catch: mapLLMError,
        }).pipe(
          Effect.retry(retryPolicy),
          Effect.tapError((error) =>
            Effect.logError(
              `Analysis aggregation failed after retries: ${error._tag} - ${
                'message' in error ? error.message : 'Unknown error'
              }`,
            ),
          ),
        );
      },
    });
  }),
);
