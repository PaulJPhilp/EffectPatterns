import { Args, Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Path } from "@effect/platform/Path";
import { Chunk, Console, Effect, Option, Stream } from "effect";

import { ConfigService } from "../services/config-service/service.js";
import {
  processPromptFromMdx,
  streamText,
} from "../services/llm-service/service.js";
import type { Models, Providers } from "../services/llm-service/types.js";
import { parseMdxFile } from "../services/llm-service/utils.js";
import { MetricsService } from "../services/metrics-service/service.js";
import {
  ModelService,
  make as ModelServiceImpl,
} from "../services/model-service/service.js";
import type { Model as CatalogModel } from "../services/model-service/types.js";
import { OtelService } from "../services/otel-service/service.js";

interface GenerateOptions {
  file: string;
  provider: Option.Option<"openai" | "anthropic" | "google">;
  model: Option.Option<string>;
  output: Option.Option<string>;
  outputFormat: Option.Option<"text" | "json">;
  schemaPrompt: Option.Option<string>;
}

function generateHandler({
  file,
  provider,
  model,
  output,
  outputFormat,
  schemaPrompt,
}: GenerateOptions) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path;
    const metrics = yield* MetricsService;
    const otel = yield* OtelService;
    const config = yield* ConfigService;

    yield* metrics.startCommand("process-prompt");

    const span = yield* otel.startSpan("process-prompt-operation", {
      attributes: { file, provider, model },
    });

    yield* otel.addEvent(span, "starting_process_prompt", { file });

    const providerFromConfig = yield* config.get("defaultProvider");
    const modelFromConfig = yield* config.get("defaultModel");
    const resolvedProvider = Option.getOrElse(provider, () =>
      Option.getOrElse(
        providerFromConfig as Option.Option<"openai" | "anthropic" | "google">,
        () => "google"
      )
    );
    // Resolve provider/model
    const resolvedModel = Option.getOrElse(model, () =>
      Option.getOrElse(
        modelFromConfig as Option.Option<string>,
        () => "gemini-2.5-flash"
      )
    );

    // Validate model using ModelService for all providers
    {
      const service = yield* Effect.provideService(
        ModelService,
        ModelServiceImpl
      )(ModelService);
      const providerName =
        resolvedProvider === "openai"
          ? "OpenAI"
          : resolvedProvider === "anthropic"
          ? "Anthropic"
          : "Google";
      const names = yield* service.getModels(providerName).pipe(
        Effect.map((ms: CatalogModel[]) => ms.map((m) => m.name)),
        Effect.catchAll(() => Effect.succeed<string[]>([]))
      );
      if (names.length > 0 && !names.includes(resolvedModel as string)) {
        yield* Console.log(
          `⚠️ Model '${resolvedModel}' not recognized for ${providerName}. Known: ${names.join(
            ", "
          )}`
        );
      }
    }

    if (
      Option.getOrElse(outputFormat, () => "text") === "json" &&
      Option.isNone(schemaPrompt)
    ) {
      return yield* Effect.fail(
        new Error("Schema prompt file is required when output format is json")
      );
    }

    const fileExtension = file.toLowerCase().split(".").pop();
    let result: unknown;

    if (
      Option.getOrElse(outputFormat, () => "text") === "json" &&
      Option.isSome(schemaPrompt)
    ) {
      if (Option.getOrElse(outputFormat, () => "text") !== "json") {
        yield* Console.log(
          `Processing with structured output format using schema prompt: ${Option.getOrElse(
            schemaPrompt,
            () => ""
          )}`
        );
      }
      const fs2 = yield* FileSystem.FileSystem;
      const schemaPromptContent = yield* fs2.readFileString(
        Option.getOrElse(schemaPrompt, () => "")
      );
      const parsedSchemaPrompt = yield* parseMdxFile(schemaPromptContent);

      if (fileExtension === "mdx") {
        if (Option.getOrElse(outputFormat, () => "text") !== "json") {
          yield* Console.log(`Processing MDX file: ${file}`);
        }
        const mainPromptContent = yield* fs2.readFileString(file);
        const parsedMainPrompt = yield* parseMdxFile(mainPromptContent);
        const combinedPrompt = `${parsedMainPrompt.body}\n\n${parsedSchemaPrompt.body}`;
        result = yield* streamText(
          combinedPrompt,
          resolvedProvider as Providers,
          resolvedModel as Models
        ).pipe(
          Stream.runCollect,
          Effect.map((chunks) => Chunk.toReadonlyArray(chunks).join(""))
        );
      } else {
        if (Option.getOrElse(outputFormat, () => "text") !== "json") {
          yield* Console.log(`Processing text file: ${file}`);
        }
        const promptText = yield* fs2.readFileString(file);
        const combinedPrompt = `${promptText}\n\n${parsedSchemaPrompt.body}`;
        result = yield* streamText(
          combinedPrompt,
          resolvedProvider as Providers,
          resolvedModel as Models
        ).pipe(
          Stream.runCollect,
          Effect.map((chunks) => Chunk.toReadonlyArray(chunks).join(""))
        );
      }
    } else if (fileExtension === "mdx") {
      if (Option.getOrElse(outputFormat, () => "text") !== "json") {
        yield* Console.log(`Processing MDX file: ${file}`);
      }
      result = yield* processPromptFromMdx(
        file,
        resolvedProvider as Providers,
        resolvedModel as Models
      );
    } else {
      if (Option.getOrElse(outputFormat, () => "text") !== "json") {
        yield* Console.log(`Processing text file: ${file}`);
      }
      const fs3 = yield* FileSystem.FileSystem;
      const _path = yield* Path;
      const promptOnly = yield* fs3.readFileString(file);
      result = yield* streamText(
        promptOnly,
        resolvedProvider as Providers,
        resolvedModel as Models
      ).pipe(
        Stream.runCollect,
        Effect.map((chunks) => Chunk.toReadonlyArray(chunks).join(""))
      );
    }

    const textContent = (() => {
      if (typeof result === "string") {
        return result;
      }
      if (result && typeof result === "object") {
        if ("parts" in result) {
          const parts = (result as { parts?: Array<{ text?: unknown }> }).parts;
          const maybeText = parts?.[0]?.text;
          if (typeof maybeText === "string") {
            return maybeText;
          }
        }
        if ("text" in result) {
          const textVal = (result as { text?: unknown }).text;
          if (typeof textVal === "string") {
            return textVal;
          }
        }
      }
      return String(result);
    })();

    const metricsData = yield* metrics.extractLLMUsage(
      result,
      resolvedProvider,
      resolvedModel
    );
    yield* metrics.recordLLMUsage(metricsData);
    yield* metrics.recordResponse(textContent);
    yield* metrics.endCommand();

    if (Option.getOrElse(outputFormat, () => "text") === "json") {
      const parseResponseEffect = Effect.gen(function* () {
        const parseDirect = Effect.try({
          try: () => JSON.parse(textContent),
          catch: () => new Error("Failed to parse JSON directly"),
        });
        const parseFromMarkdown = Effect.try({
          try: () => {
            const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              return JSON.parse(jsonMatch[1]);
            }
            throw new Error("No JSON found in markdown code blocks");
          },
          catch: () => new Error("Failed to parse JSON from markdown"),
        });
        const parseFallback = Effect.succeed({ content: textContent });
        const parseResult = yield* Effect.orElse(parseDirect, () =>
          Effect.orElse(parseFromMarkdown, () => parseFallback)
        );
        const parsed = parseResult as unknown;
        const baseData: Record<string, unknown> =
          typeof parsed === "object" && parsed !== null
            ? (parsed as Record<string, unknown>)
            : { value: parsed };
        const perCommandOutput = {
          ...baseData,
          metrics: {
            inputTokens: metricsData.inputTokens,
            outputTokens: metricsData.outputTokens,
            thinkingTokens: metricsData.thinkingTokens || 0,
            totalTokens: metricsData.totalTokens,
            estimatedCost: metricsData.estimatedCost,
            inputCost: metricsData.inputCost,
            outputCost: metricsData.outputCost,
            totalCost: metricsData.totalCost,
          },
          command: "process-prompt",
          file,
          provider: resolvedProvider,
          model: resolvedModel,
          timestamp: new Date().toISOString(),
        };
        const jsonOutput = JSON.stringify(perCommandOutput, null, 2);
        if (Option.isSome(output)) {
          const outputPath = output.value;
          const fsw = yield* FileSystem.FileSystem;
          yield* fsw.writeFileString(outputPath, jsonOutput);
          return;
        }
        yield* Console.log(jsonOutput);
      });
      return yield* parseResponseEffect;
    }

    if (Option.isSome(output)) {
      const outputPath = Option.getOrThrow(output);
      const fsw = yield* FileSystem.FileSystem;
      yield* fsw.writeFileString(outputPath, textContent);
    } else {
      yield* Console.log(textContent);
    }

    const processedText = textContent;
    const processedResult = processedText;
    yield* otel.endSpan(span);
    return { text: processedResult, outputPath: output };
  });
}

export const generateCommand = Command.make(
  "generate",
  {
    file: Args.text({ name: "file" }),
    provider: Options.optional(
      Options.withAlias(
        Options.choice("provider", ["openai", "anthropic", "google"] as const),
        "p"
      )
    ),
    model: Options.optional(Options.text("model")),
    output: Options.optional(Options.text("output")),
    outputFormat: Options.optional(
      Options.choice("output-format", ["text", "json"] as const)
    ),
    schemaPrompt: Options.optional(Options.text("schema-prompt")),
  },
  (opts) => generateHandler(opts)
);

export const genAliasCommand = Command.make(
  "gen",
  {
    file: Args.text({ name: "file" }),
    provider: Options.optional(
      Options.withAlias(
        Options.choice("provider", ["openai", "anthropic", "google"] as const),
        "p"
      )
    ),
    model: Options.optional(Options.text("model")),
    output: Options.optional(Options.text("output")),
    outputFormat: Options.optional(
      Options.choice("output-format", ["text", "json"] as const)
    ),
    schemaPrompt: Options.optional(Options.text("schema-prompt")),
  },
  (opts) => generateHandler(opts)
);

export const processPromptLegacyCommand = Command.make(
  "process-prompt",
  {
    file: Args.text({ name: "file" }),
    provider: Options.optional(
      Options.withAlias(
        Options.choice("provider", ["openai", "anthropic", "google"] as const),
        "p"
      )
    ),
    model: Options.optional(Options.text("model")),
    output: Options.optional(Options.text("output")),
    outputFormat: Options.optional(
      Options.choice("output-format", ["text", "json"] as const)
    ),
    schemaPrompt: Options.optional(Options.text("schema-prompt")),
  },
  (opts) => generateHandler(opts)
);

// Duplicates were present below; cleaned up to a single export block.
export {
  genAliasCommand as effectPatternsGen,
  generateCommand as effectPatternsGenerate,
  processPromptLegacyCommand as effectPatternsProcessPromptLegacy,
};

// Back-compat export expected by some tests/importers
export const effectPatternsProcessPrompt = processPromptLegacyCommand;
