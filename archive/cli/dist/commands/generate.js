import { Args, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Path } from "@effect/platform/Path";
import { Chunk, Effect, Option, Stream } from "effect";
import { ConfigService } from "../services/config-service/service.js";
import { streamText } from "../services/llm-service/service.js";
import { parseMdxFile } from "../services/llm-service/utils.js";
import { MetricsService } from "../services/metrics-service/service.js";
import { ModelService } from "../services/model-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { makeCommand, printText, printJson, setGlobalJson, setGlobalCompact, setGlobalOutputOptions, getGlobalCompact, getGlobalOutputOptions, } from "./_shared.js";
function generateHandler({ file, provider, model, output, outputFormat, schemaPrompt, stdin, noStream, quiet, json, temperature, maxTokens, topP, seed, }) {
    return Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path;
        const metrics = yield* MetricsService;
        const otel = yield* OtelService;
        const config = yield* ConfigService;
        yield* metrics.startCommand("generate");
        const providerFromConfig = yield* config.get("defaultProvider");
        const modelFromConfig = yield* config.get("defaultModel");
        const resolvedProvider = Option.getOrElse(provider, () => Option.getOrElse(providerFromConfig, () => "google"));
        // Resolve provider/model
        const resolvedModel = Option.getOrElse(model, () => Option.getOrElse(modelFromConfig, () => "gemini-2.5-flash"));
        const span = yield* otel.startSpan("generate-operation", {
            attributes: {
                file: Option.getOrElse(file, () => ""),
                provider: resolvedProvider,
                model: resolvedModel,
            },
        });
        yield* otel.addEvent(span, "starting_process_prompt", {
            file: Option.getOrElse(file, () => ""),
        });
        // Validate model using ModelService for all providers
        {
            const service = yield* ModelService.pipe(Effect.provide(ModelService.Default));
            const providerName = resolvedProvider === "openai"
                ? "OpenAI"
                : resolvedProvider === "anthropic"
                    ? "Anthropic"
                    : "Google";
            const names = yield* service.getModels(providerName).pipe(Effect.map((ms) => ms.map((m) => m.name)), Effect.catchAll(() => Effect.succeed([])));
            if (names.length > 0 && !names.includes(resolvedModel)) {
                yield* Effect.log(`⚠️ Model '${resolvedModel}' not recognized for ${providerName}. Known: ${names.join(", ")}`);
            }
        }
        // Resolve format convenience flag
        const resolvedFormat = json
            ? "json"
            : Option.getOrElse(outputFormat, () => "text");
        // Normalize output options and set shared flags
        const outPathOpt = Option.getOrElse(output, () => undefined);
        const asJson = resolvedFormat === "json" || json || !!outPathOpt;
        setGlobalJson(asJson);
        setGlobalCompact(false);
        setGlobalOutputOptions({
            outputFile: outPathOpt,
            // Quiet behavior for this command relies on boolean quiet flag below when printing
        });
        if (resolvedFormat === "json" && Option.isNone(schemaPrompt)) {
            return yield* Effect.fail(new Error("Schema prompt file is required when output format is json"));
        }
        // Resolve input source: stdin | file path | inline text
        let inputText = "";
        let isMdx = false;
        let result;
        if (stdin) {
            // Read from stdin
            const stdinText = yield* Effect.tryPromise({
                try: () => new Promise((resolve, reject) => {
                    let data = "";
                    process.stdin.setEncoding("utf8");
                    process.stdin.on("data", (chunk) => {
                        data += String(chunk);
                    });
                    process.stdin.on("end", () => resolve(data));
                    process.stdin.on("error", (err) => reject(err));
                }),
                catch: (e) => e,
            });
            inputText = stdinText;
            isMdx = false;
        }
        else if (Option.isSome(file)) {
            const fileVal = file.value;
            const exists = yield* fs.exists(fileVal);
            if (exists) {
                const ext = fileVal.toLowerCase().split(".").pop();
                isMdx = ext === "mdx";
                inputText = yield* fs.readFileString(fileVal);
            }
            else {
                // Treat as inline prompt text
                inputText = fileVal;
            }
        }
        else {
            return yield* Effect.fail(new Error("No input provided. Pass a file path, inline prompt, or --stdin."));
        }
        // Prepare generation parameters
        const parameters = {};
        if (Option.isSome(temperature)) {
            parameters.temperature = temperature.value;
        }
        if (Option.isSome(maxTokens)) {
            parameters.maxTokens = maxTokens.value;
        }
        if (Option.isSome(topP)) {
            parameters.topP = topP.value;
        }
        if (Option.isSome(seed)) {
            parameters.seed = seed.value;
        }
        // Build final prompt (parse MDX if needed)
        let promptBody = inputText;
        if (isMdx) {
            const parsed = yield* parseMdxFile(inputText);
            promptBody = parsed.body;
        }
        if (resolvedFormat === "json" && Option.isSome(schemaPrompt)) {
            const schemaPromptContent = yield* fs.readFileString(Option.getOrElse(schemaPrompt, () => ""));
            const parsedSchemaPrompt = yield* parseMdxFile(schemaPromptContent);
            promptBody = `${promptBody}\n\n${parsedSchemaPrompt.body}`;
            // Always buffer in JSON mode
            result = yield* streamText(promptBody, resolvedProvider, resolvedModel, parameters).pipe(Stream.runCollect, Effect.map((chunks) => Chunk.toReadonlyArray(chunks).join("")));
        }
        else {
            // Text mode: stream by default unless --no-stream
            if (noStream) {
                result = yield* streamText(promptBody, resolvedProvider, resolvedModel, parameters).pipe(Stream.runCollect, Effect.map((chunks) => Chunk.toReadonlyArray(chunks).join("")));
            }
            else {
                let collected = "";
                yield* streamText(promptBody, resolvedProvider, resolvedModel, parameters).pipe(Stream.runForEach((chunk) => Effect.gen(function* () {
                    collected += chunk;
                    if (!quiet) {
                        yield* printText(chunk);
                    }
                })));
                result = collected;
            }
        }
        const textContent = (() => {
            if (typeof result === "string") {
                return result;
            }
            if (result && typeof result === "object") {
                if ("parts" in result) {
                    const parts = result.parts;
                    const maybeText = parts?.[0]?.text;
                    if (typeof maybeText === "string") {
                        return maybeText;
                    }
                }
                if ("text" in result) {
                    const textVal = result.text;
                    if (typeof textVal === "string") {
                        return textVal;
                    }
                }
            }
            return String(result);
        })();
        const metricsData = yield* metrics.extractLLMUsage(result, resolvedProvider, resolvedModel);
        yield* metrics.recordLLMUsage(metricsData);
        yield* metrics.recordResponse(textContent);
        yield* metrics.endCommand();
        if (asJson) {
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
                const parseResult = yield* Effect.orElse(parseDirect, () => Effect.orElse(parseFromMarkdown, () => parseFallback));
                const parsed = parseResult;
                const baseData = typeof parsed === "object" && parsed !== null
                    ? parsed
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
                    command: "generate",
                    file,
                    provider: resolvedProvider,
                    model: resolvedModel,
                    timestamp: new Date().toISOString(),
                };
                const resolvedOutput = getGlobalOutputOptions()?.outputFile;
                yield* printJson(perCommandOutput, getGlobalCompact(), resolvedOutput ? { outputFile: resolvedOutput } : undefined);
            });
            return yield* parseResponseEffect;
        }
        {
            const resolvedOutput = getGlobalOutputOptions()?.outputFile;
            if (resolvedOutput) {
                yield* printText(textContent, { outputFile: resolvedOutput });
            }
            else if (noStream || quiet) {
                if (!quiet) {
                    yield* printText(textContent);
                }
            }
        }
        const processedText = textContent;
        const processedResult = processedText;
        yield* otel.endSpan(span);
        return { text: processedResult, outputPath: output };
    });
}
export const generateCommand = makeCommand("generate", {
    // Positional input is optional and may be a file path or inline text
    file: Args.text({ name: "file" }).pipe(Args.optional),
    provider: Options.optional(Options.withAlias(Options.choice("provider", ["openai", "anthropic", "google"]), "p")),
    model: Options.optional(Options.text("model").pipe(Options.withAlias("m"))),
    output: Options.optional(Options.text("output").pipe(Options.withAlias("o"))),
    outputFormat: Options.optional(Options.choice("output-format", ["text", "json"]).pipe(Options.withAlias("f"))),
    schemaPrompt: Options.optional(Options.text("schema-prompt").pipe(Options.withAlias("s"))),
    stdin: Options.boolean("stdin"),
    noStream: Options.boolean("no-stream"),
    quiet: Options.boolean("quiet"),
    json: Options.boolean("json"),
    temperature: Options.optional(Options.float("temperature")),
    maxTokens: Options.optional(Options.integer("max-tokens")),
    topP: Options.optional(Options.float("top-p")),
    seed: Options.optional(Options.integer("seed")),
}, (opts) => generateHandler(opts), {
    description: "Generate text from a prompt (file, inline, or stdin)",
    errorPrefix: "Error in generate command",
});
export const genAliasCommand = makeCommand("gen", {
    file: Args.text({ name: "file" }).pipe(Args.optional),
    provider: Options.optional(Options.withAlias(Options.choice("provider", ["openai", "anthropic", "google"]), "p")),
    model: Options.optional(Options.text("model").pipe(Options.withAlias("m"))),
    output: Options.optional(Options.text("output").pipe(Options.withAlias("o"))),
    outputFormat: Options.optional(Options.choice("output-format", ["text", "json"]).pipe(Options.withAlias("f"))),
    schemaPrompt: Options.optional(Options.text("schema-prompt").pipe(Options.withAlias("s"))),
    stdin: Options.boolean("stdin"),
    noStream: Options.boolean("no-stream"),
    quiet: Options.boolean("quiet"),
    json: Options.boolean("json"),
    temperature: Options.optional(Options.float("temperature")),
    maxTokens: Options.optional(Options.integer("max-tokens")),
    topP: Options.optional(Options.float("top-p")),
    seed: Options.optional(Options.integer("seed")),
}, (opts) => generateHandler(opts), {
    description: "Alias for generate",
    errorPrefix: "Error in gen command",
});
export const processPromptLegacyCommand = makeCommand("process-prompt", {
    file: Args.text({ name: "file" }).pipe(Args.optional),
    provider: Options.optional(Options.withAlias(Options.choice("provider", ["openai", "anthropic", "google"]), "p")),
    model: Options.optional(Options.text("model").pipe(Options.withAlias("m"))),
    output: Options.optional(Options.text("output").pipe(Options.withAlias("o"))),
    outputFormat: Options.optional(Options.choice("output-format", ["text", "json"]).pipe(Options.withAlias("f"))),
    schemaPrompt: Options.optional(Options.text("schema-prompt").pipe(Options.withAlias("s"))),
    stdin: Options.boolean("stdin"),
    noStream: Options.boolean("no-stream"),
    quiet: Options.boolean("quiet"),
    json: Options.boolean("json"),
    temperature: Options.optional(Options.float("temperature")),
    maxTokens: Options.optional(Options.integer("max-tokens")),
    topP: Options.optional(Options.float("top-p")),
    seed: Options.optional(Options.integer("seed")),
}, (opts) => generateHandler(opts), {
    description: "Legacy alias for generate",
    errorPrefix: "Error in process-prompt command",
});
// Duplicates were present below; cleaned up to a single export block.
export { genAliasCommand as effectPatternsGen, generateCommand as effectPatternsGenerate, processPromptLegacyCommand as effectPatternsProcessPromptLegacy, };
// Back-compat export expected by some tests/importers
export const effectPatternsProcessPrompt = processPromptLegacyCommand;
//# sourceMappingURL=generate.js.map