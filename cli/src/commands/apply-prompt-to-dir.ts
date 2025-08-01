import { Args, Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Path } from "@effect/platform/Path";
import { Chunk, Config, Console, Effect, Layer, Stream } from "effect";

import { AnthropicClient, AnthropicLanguageModel } from "@effect/ai-anthropic";
import { GoogleAiClient, GoogleAiLanguageModel } from "@effect/ai-google";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { streamText } from "../services/llm-service/service.js";
import type { Models, Providers } from "../services/llm-service/types.js";
import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";

// effect-patterns apply-prompt-to-dir -input <input-dir> -output <output-dir> [file-pattern] <prompt-file>
const inputFile = Args.file({ name: "prompt-file", exists: "yes" });
const inputDirOption = Options.text("input").pipe(
  Options.withDescription("Input directory containing files to process")
);
const outputDirOption = Options.text("output").pipe(
  Options.withDescription("Output directory for processed files")
);
const filePatternArg = Args.text({ name: "file-pattern" }).pipe(
  Args.withDefault("*")
);

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

export const applyPromptToDir = Command.make(
  "apply-prompt-to-dir",
  {
    promptFile: inputFile,
    inputDir: inputDirOption,
    outputDir: outputDirOption,
    filePattern: filePatternArg
  },
  ({ promptFile, inputDir, outputDir, filePattern }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path;
      const otel = yield* OtelService;
      const metrics = yield* MetricsService;

      yield* Console.log(`📁 Applying prompt to directory: ${inputDir}`);
      yield* Console.log(`📄 Prompt file: ${promptFile}`);
      yield* Console.log(`📤 Output directory: ${outputDir}`);
      yield* Console.log(`🔍 File pattern: ${filePattern}`);

      // Record command start
      yield* metrics.startCommand("apply-prompt-to-dir");

      // Create a span for tracing
      const span = yield* otel.startSpan("apply_prompt_to_dir");

      // Read the prompt file to get provider and model info
      const promptContent = yield* fs.readFileString(promptFile);

      // Parse provider and model from MDX frontmatter
      let provider: Providers = "google";
      let model: Models = "gemini-2.5-flash";

      const frontmatterMatch = promptContent.match(/^---\s*\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const providerMatch = frontmatter.match(/provider:\s*(\w+)/);
        const modelMatch = frontmatter.match(/model:\s*([\w-]+)/);

        if (providerMatch) {
          provider = providerMatch[1] as Providers;
        }
        if (modelMatch) {
          model = modelMatch[1] as Models;
        }
      }

      yield* Console.log(`Using provider: ${provider}, model: ${model}`);

      // Ensure input directory exists
      const inputDirExists = yield* fs.exists(inputDir);
      if (!inputDirExists) {
        yield* Console.error(`❌ Input directory does not exist: ${inputDir}`);
        yield* otel.endSpan(span);
        yield* metrics.endCommand();
        yield* metrics.reportMetrics("console");
        return yield* Effect.fail(new Error(`Input directory does not exist: ${inputDir}`));
      }

      // Ensure output directory exists
      yield* fs.makeDirectory(outputDir, { recursive: true });

      // Read input directory with robust error handling
      const entries = yield* fs.readDirectory(inputDir).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            const isEnoent =
              typeof error === "object" &&
              error !== null &&
              "code" in error &&
              (error as any).code === "ENOENT";
            const isNotFound =
              typeof error === "object" &&
              error !== null &&
              "name" in error &&
              (error as any).name === "NotFound";
            const isNoSuchDir =
              typeof error?.message === "string" &&
              error.message.includes("no such file or directory");

            if (isEnoent || isNotFound || isNoSuchDir) {
              yield* Console.error(`❌ Input directory does not exist or cannot be read: ${inputDir}`);
              yield* otel.endSpan(span);
              yield* metrics.endCommand();
              yield* metrics.reportMetrics("console");
              return yield* Effect.fail(error);
            }
            return yield* Effect.fail(error);
          })
        )
      );

      // Filter files based on pattern
      const files = entries.filter(entry => {
        if (filePattern === "*") return true;
        return entry.includes(filePattern) || entry.match(new RegExp(filePattern));
      });

      yield* Console.log(`Found ${files.length} files to process`);

      let processedCount = 0;
      for (const file of files) {
        const inputFilePath = path.join(inputDir, file);
        const fileStats = yield* fs.stat(inputFilePath);

        // Skip directories
        if (fileStats.type === "Directory") {
          yield* Console.log(`Skipping directory: ${file}`);
          continue;
        }

        yield* Console.log(`Processing file: ${file}`);

        // Read the input file content
        const fileContent = yield* fs.readFileString(inputFilePath);

        // Create a combined prompt
        const combinedPrompt = `${promptContent}\n\nInput file content:\n${fileContent}`;

        // Process the prompt with the selected provider and model
        const result = yield* Effect.provide(
          streamText(combinedPrompt, provider, model).pipe(
            Stream.runCollect,
            Effect.map((chunks) => Chunk.toReadonlyArray(chunks).join(""))
          ),
          getLayersForProvider(provider, model)
        );

        // Extract text from AI response
        const textContent = (result as any).parts?.[0]?.text ||
          (result as any).text ||
          String(result) ||
          "No text generated";

        // Create output file path using basename
        const baseName = file.split('.').slice(0, -1).join('.');
        const outputFile = baseName ? `${baseName}.md` : `${file}.md`;
        const outputFilePath = path.join(outputDir, outputFile);

        yield* Console.log(`Saving response to: ${outputFilePath}`);

        // Ensure output directory exists
        const outputDirPath = path.dirname(outputFilePath);
        yield* fs.makeDirectory(outputDirPath, { recursive: true });

        // Write the result to the output file
        yield* fs.writeFileString(outputFilePath, textContent).pipe(
          Effect.tap(() => Console.log(`✅ Response saved to: ${outputFilePath}`)),
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* otel.recordException(span, error as Error);
              yield* Console.error(`❌ Failed to save file ${outputFilePath}: ${error}`);
              return yield* Effect.fail(error);
            })
          )
        );

        yield* otel.addEvent(span, "file_processed", { file, outputFile });
        yield* otel.recordCounter("files_processed", 1);
        processedCount++;
      }

      yield* Console.log(`✅ Completed processing ${processedCount} files`);

      yield* otel.endSpan(span);
      yield* metrics.endCommand();
      yield* metrics.reportMetrics("console");

      return { processedFiles: processedCount };
    })
);

