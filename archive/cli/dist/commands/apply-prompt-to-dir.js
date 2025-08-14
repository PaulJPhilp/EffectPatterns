import { Args, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
import { Chunk, Effect, Option, Stream } from "effect";
import { ConfigService } from "../services/config-service/service.js";
import { streamText } from "../services/llm-service/service.js";
import { ModelService } from "../services/model-service/service.js";
import { TemplateService } from "../services/prompt-template/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { makeCommand, printText, printJson, setGlobalJson, setGlobalCompact, setGlobalOutputOptions, getGlobalJson, getGlobalOutputOptions, optQuiet, optForce, optOutput, } from "./_shared.js";
// effect-patterns apply-prompt-to-dir -input <input-dir> -output <output-dir> [file-pattern] <prompt-file>
const promptFileArg = Args.file({ name: "prompt-file", exists: "yes" });
const inputDirOption = Options.text("input").pipe(Options.withDescription("Input directory containing files to process"), Options.withAlias("i"));
const outputDirOption = Options.text("output").pipe(Options.withDescription("Output directory for processed files"), Options.withAlias("o"));
const filePatternArg = Args.text({ name: "file-pattern" }).pipe(Args.withDefault("*"));
const parametersOption = Options.keyValueMap("parameter").pipe(Options.withDescription("Template parameters as key=value pairs"), Options.withAlias("p"));
export const applyPromptToDir = makeCommand("apply-prompt-to-dir", {
    input: inputDirOption,
    output: outputDirOption,
    filePattern: filePatternArg,
    promptFile: promptFileArg,
    parameters: parametersOption,
    json: Options.boolean("json").pipe(Options.optional),
    quiet: optQuiet("Suppress normal output (errors still go to stderr)"),
    outFile: optOutput("Write output summary to file"),
    force: optForce("Force overwrite output file if it exists"),
}, ({ input, output, filePattern, promptFile, parameters, json, quiet, outFile, force }) => Effect.gen(function* () {
    const fs = yield* FileSystem;
    const path = yield* Path;
    const templateService = yield* TemplateService;
    const config = yield* ConfigService;
    const providerFromConfig = yield* config.get("defaultProvider");
    const modelFromConfig = yield* config.get("defaultModel");
    const provider = Option.getOrElse(providerFromConfig, () => "google");
    const model = Option.getOrElse(modelFromConfig, () => "gemini-2.5-flash");
    // Validate provider/model via ModelService (all providers)
    {
        const service = yield* ModelService.pipe(Effect.provide(ModelService.Default));
        const providerName = provider === "openai"
            ? "OpenAI"
            : provider === "anthropic"
                ? "Anthropic"
                : "Google";
        const result = yield* Effect.either(service.getModels(providerName));
        if (result._tag === "Right") {
            const names = result.right.map((m) => m.name);
            if (!names.includes(model)) {
                yield* Effect.log(`⚠️ Model '${model}' not recognized for ${providerName}. Known: ${names.join(", ")}`);
            }
        }
    }
    // Load and process prompt template
    const ext = path.extname(promptFile);
    const promptContent = yield* ext === ".mdx"
        ? Effect.flatMap(templateService.loadTemplate(promptFile), (template) => templateService.renderTemplate(template, parameters ? Object.fromEntries(parameters) : {}))
        : fs.readFileString(promptFile);
    const jsonFlag = Option.getOrElse(json, () => false);
    const quietFlag = Option.getOrElse(quiet, () => false);
    const forceFlag = Option.getOrElse(force, () => false);
    const localOutFile = Option.getOrElse(outFile, () => undefined);
    setGlobalJson(jsonFlag);
    setGlobalCompact(false);
    setGlobalOutputOptions(quietFlag || localOutFile || forceFlag
        ? {
            quiet: quietFlag || undefined,
            outputFile: localOutFile,
            force: forceFlag || undefined,
        }
        : undefined);
    const resolvedOutput = getGlobalOutputOptions()?.outputFile;
    const asJson = getGlobalJson() || !!resolvedOutput;
    if (!quietFlag && !asJson) {
        yield* printText([
            `📁 Applying prompt to directory: ${input}`,
            `📄 Prompt file: ${promptFile}`,
            `📊 File pattern: ${filePattern}`,
            `📄 Parameters: ${parameters ? "provided" : "none"}`,
        ].join("\n"));
    }
    // Get files to process
    const files = yield* fs.readDirectory(input);
    const matchingFiles = yield* Effect.succeed(files.filter((file) => new RegExp(filePattern).test(file)));
    const fileCount = matchingFiles.length;
    if (!quietFlag && !asJson) {
        yield* printText(fileCount === 0
            ? "⚠️ No files found matching the pattern"
            : `📊 Found ${fileCount} files to process`);
    }
    yield* Effect.if(fileCount > 0, {
        onTrue: () => Effect.gen(function* () {
            // Process each file
            const processedFiles = yield* Effect.forEach(matchingFiles, (file) => Effect.gen(function* () {
                const inputPath = path.join(input, file);
                const outputPath = path.join(output, file);
                if (!quietFlag && !asJson) {
                    yield* printText(`🔄 Processing: ${file}`);
                }
                // Read file content
                const content = yield* fs.readFileString(inputPath);
                // Create prompt with file content
                const fullPrompt = `${promptContent}\n\nFile: ${file}\n\nContent:\n${content}`;
                // Get AI response using streamText
                const response = yield* streamText(fullPrompt, provider, model).pipe(Stream.runCollect, Effect.map((chunk) => Chunk.join(chunk, "")));
                // Ensure output directory exists
                yield* fs.makeDirectory(output, { recursive: true });
                // Write response to output file
                yield* fs.writeFileString(outputPath, response);
                if (!quietFlag && !asJson) {
                    yield* printText(`✅ Processed: ${file}`);
                }
                return file;
            })).pipe(Effect.map((results) => results.length));
            const summary = {
                processedFiles,
                inputDir: input,
                outputDir: output,
                filePattern,
                parametersProvided: !!parameters,
                timestamp: new Date().toISOString(),
            };
            if (asJson) {
                yield* printJson(summary, false, resolvedOutput ? { outputFile: resolvedOutput } : undefined);
            }
            else if (!quietFlag) {
                yield* printText(`🎉 Completed processing ${processedFiles} files`, resolvedOutput ? { outputFile: resolvedOutput } : undefined);
            }
            return yield* Effect.succeed(summary);
        }),
        onFalse: () => Effect.succeed({ processedFiles: 0 }),
    });
}), {
    description: "Apply a prompt template to files in a directory",
    errorPrefix: "Error in apply-prompt-to-dir",
});
//# sourceMappingURL=apply-prompt-to-dir.js.map