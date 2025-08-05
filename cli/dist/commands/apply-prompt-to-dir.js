import { Args, Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
import { Chunk, Effect, Stream } from "effect";
import { streamText } from "../services/llm-service/service.js";
import { TemplateService } from "../services/prompt-template/service.js";
// effect-patterns apply-prompt-to-dir -input <input-dir> -output <output-dir> [file-pattern] <prompt-file>
const promptFileArg = Args.file({ name: "prompt-file", exists: "yes" });
const inputDirOption = Options.text("input").pipe(Options.withDescription("Input directory containing files to process"));
const outputDirOption = Options.text("output").pipe(Options.withDescription("Output directory for processed files"));
const filePatternArg = Args.text({ name: "file-pattern" }).pipe(Args.withDefault("*"));
const parametersOption = Options.keyValueMap("parameter").pipe(Options.withDescription("Template parameters as key=value pairs"), Options.withAlias("p"));
export const applyPromptToDir = Command.make("apply-prompt-to-dir", {
    input: inputDirOption,
    output: outputDirOption,
    filePattern: filePatternArg,
    promptFile: promptFileArg,
    parameters: parametersOption,
}, ({ input, output, filePattern, promptFile, parameters }) => Effect.gen(function* () {
    const fs = yield* FileSystem;
    const path = yield* Path;
    const templateService = yield* TemplateService;
    // Load and process prompt template
    const ext = path.extname(promptFile);
    const promptContent = yield* (ext === ".mdx"
        ? Effect.flatMap(templateService.loadTemplate(promptFile), (template) => templateService.renderTemplate(template, parameters ? Object.fromEntries(parameters) : {}))
        : fs.readFileString(promptFile));
    yield* Effect.log(`📁 Applying prompt to directory: ${input}`);
    yield* Effect.log(`📄 Prompt file: ${promptFile}`);
    yield* Effect.log(`📊 File pattern: ${filePattern}`);
    yield* Effect.log(`📄 Parameters: ${parameters ? "provided" : "none"}`);
    // Get files to process
    const files = yield* fs.readDirectory(input);
    const matchingFiles = yield* Effect.succeed(files.filter(file => new RegExp(filePattern).test(file)));
    const fileCount = matchingFiles.length;
    yield* (fileCount === 0 ?
        Effect.log("⚠️ No files found matching the pattern") :
        Effect.log(`📊 Found ${fileCount} files to process`));
    yield* Effect.if(fileCount > 0, {
        onTrue: () => Effect.gen(function* () {
            // Process each file
            const processedFiles = yield* Effect.forEach(matchingFiles, (file) => Effect.gen(function* () {
                const inputPath = path.join(input, file);
                const outputPath = path.join(output, file);
                yield* Effect.log(`🔄 Processing: ${file}`);
                // Read file content
                const content = yield* fs.readFileString(inputPath);
                // Create prompt with file content
                const fullPrompt = `${promptContent}\n\nFile: ${file}\n\nContent:\n${content}`;
                // Get AI response using streamText
                const response = yield* streamText(fullPrompt, "openai", "gpt-4o-mini").pipe(Stream.runCollect, Effect.map(chunk => Chunk.join(chunk, "")));
                // Ensure output directory exists
                yield* fs.makeDirectory(output, { recursive: true });
                // Write response to output file
                yield* fs.writeFileString(outputPath, response);
                yield* Effect.log(`✅ Processed: ${file}`);
                return file;
            })).pipe(Effect.map(results => results.length));
            yield* Effect.log(`🎉 Completed processing ${processedFiles} files`);
            return yield* Effect.succeed({ processedFiles });
        }),
        onFalse: () => Effect.succeed({ processedFiles: 0 })
    });
}));
