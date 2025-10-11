import { Context, Data, Effect, Layer } from "effect";
import { ChatOpenAI } from "@langchain/openai";

export class LLMError extends Data.TaggedError("LLMError")<{
  cause?: unknown;
}> {}

export class LLMService extends Context.Tag("LLMService")<
  LLMService,
  {
    readonly analyzeChunk: (
      chunk: unknown[],
    ) => Effect.Effect<string, LLMError>;
    readonly aggregateAnalyses: (
      analyses: string[],
    ) => Effect.Effect<string, LLMError>;
  }
>() {}

export const LLMServiceLive = Layer.effect(
  LLMService,
  Effect.try({
    try: () => new ChatOpenAI({ model: "gpt-4o", temperature: 0 }),
    catch: (cause) => new LLMError({ cause }),
  }).pipe(
    Effect.map((llm) =>
      LLMService.of({
        analyzeChunk: (chunk) =>
          Effect.tryPromise({
            try: () =>
              llm
                .invoke(
                  `Perform a thematic analysis on this chunk of messages: ${JSON.stringify(
                    chunk,
                  )}`,
                )
                .then((res) => res.content as string),
            catch: (cause) => new LLMError({ cause }),
          }),
        aggregateAnalyses: (analyses) =>
          Effect.tryPromise({
            try: () =>
              llm
                .invoke(
                  `Synthesize these partial analyses into a final report: ${JSON.stringify(
                    analyses,
                  )}`,
                )
                .then((res) => res.content as string),
            catch: (cause) => new LLMError({ cause }),
          }),
      }),
    ),
  ),
);
