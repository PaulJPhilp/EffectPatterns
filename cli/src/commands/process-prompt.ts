import { Command, Args, Options } from "@effect/cli";
import { Console, Effect, Chunk, Stream, Layer } from "effect";
import { FileSystem } from "@effect/platform";
import { Path } from "@effect/platform/Path";

import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
import { processPromptFromMdx, streamText } from "../services/llm-service/service.js";
import type { Providers, Models } from "../services/llm-service/types.js";
import { selectModel } from "../services/llm-service/types.js";
import { GoogleAiClient, GoogleAiLanguageModel } from "@effect/ai-google";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { AnthropicClient, AnthropicLanguageModel } from "@effect/ai-anthropic";
import { Config } from "effect";

// effect-patterns process-prompt <file> [--provider <provider>] [--model <model>] [--output <path>]
const promptFile = Args.file({ name: "file", exists: "yes" });
const providerOption = Options.text("provider").pipe(
  Options.withDefault("google"),
  Options.withDescription("LLM provider to use (google, openai, anthropic)")
);
const modelOption = Options.text("model").pipe(
  Options.withDefault("gemini-2.5-flash"),
  Options.withDescription("Model to use with the selected provider")
);
const outputOption = Options.text("output").pipe(
  Options.optional,
  Options.withDescription("Save AI response to file instead of console")
);

export const effectPatternsProcessPrompt = Command.make(
  "process-prompt",
  {
    file: promptFile,
    provider: providerOption,
    model: modelOption,
    output: outputOption,
  },
  ({ file, provider, model, output }) => {
    // Create the specific AI client layer and model layer for the selected provider
    // This provides the AiLanguageModel service that streamText expects
    const getLayersForProvider = (provider: Providers, model: Models) => {
      switch (provider) {
        case "google":
          return Layer.provide(
            GoogleAiLanguageModel.layer({ model }),
            GoogleAiClient.layerConfig({ apiKey: Config.redacted("GOOGLE_AI_API_KEY") })
          );
        case "openai":
          return Layer.provide(
            OpenAiLanguageModel.layer({ model }),
            OpenAiClient.layerConfig({ apiKey: Config.redacted("OPENAI_API_KEY") })
          );
        case "anthropic":
          return Layer.provide(
            AnthropicLanguageModel.layer({ model }),
            AnthropicClient.layerConfig({ apiKey: Config.redacted("ANTHROPIC_API_KEY") })
          );
      }
    };
    
    // Get the AI layers but don't provide them yet to avoid eager construction
    const aiLayers = getLayersForProvider(provider as Providers, model as Models);

    // Provide the AI layers along with the main effect to ensure HttpClient is available
    return Effect.gen(function* () {
      const metrics = yield* MetricsService;
      const otel = yield* OtelService;
      
      yield* metrics.startCommand("process-prompt");
      
      // Create OTel span for process-prompt operation
      const span = yield* otel.startSpan("process-prompt-operation", {
        attributes: { file, provider, model }
      });
      
      yield* otel.addEvent(span, "starting_process_prompt", { file });
      yield* Console.log(`Processing prompt from file: ${file}`);
      yield* Console.log(`Using provider: ${provider}, model: ${model}`);

      try {
        // Check file extension to determine which method to use
        const fileExtension = file.toLowerCase().split('.').pop();
        let result;

        if (fileExtension === 'mdx') {
          yield* Console.log(`Processing MDX file: ${file}`);
          result = yield* processPromptFromMdx(file, provider as Providers, model as Models);
        } else {
          yield* Console.log(`Processing text file: ${file}`);
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path;
          const prompt = yield* fs.readFileString(file);
          result = yield* streamText(prompt, provider as Providers, model as Models).pipe(
            Stream.runCollect,
            Effect.map((chunks) => Chunk.toReadonlyArray(chunks).join(""))
          );
        }

        // Extract text from AI response - handle any structure
        const textContent = (result as any).parts?.[0]?.text ||
          (result as any).text ||
          String(result) ||
          "No text generated";

        yield* Console.log(`Processed prompt: ${textContent}`);
        yield* otel.recordCounter("prompts_processed", 1, { file, provider, model });

        // Stage 6: Handle output file redirection
        if (output && output._tag === "Some") {
          const outputPath = output.value;
          yield* Console.log(`Saving response to: ${outputPath}`);
          const fs = yield* FileSystem.FileSystem;
          yield* fs.writeFileString(outputPath, textContent).pipe(
            Effect.tap(() => Console.log(`✅ Response saved to: ${outputPath}`)),
            Effect.catchAll((error) =>
              Effect.gen(function* () {
                yield* otel.recordException(span, error as Error);
                yield* Console.error(`❌ Failed to save file: ${error}`);
                return yield* Effect.fail(error);
              })
            )
          );
        } else {
          yield* Console.log(`Generated text: ${textContent}`);
        }

        yield* otel.endSpan(span);
        yield* metrics.endCommand();
        yield* metrics.reportMetrics("console");
        
        return { text: textContent, outputPath: output };
      } catch (error) {
        yield* otel.recordException(span, error as Error);
        yield* metrics.recordError(error instanceof Error ? error : new Error(String(error)));
        yield* metrics.endCommand();
        yield* metrics.reportMetrics("console");
        yield* Console.error(`❌ Error processing prompt: ${error}`);
        return yield* Effect.fail(error);
      }
    }).pipe(
      // Provide the AI layers for this specific command
      // The HttpClient service will be available from the main runtime context
      Effect.provide(aiLayers)
    );
  }
);
