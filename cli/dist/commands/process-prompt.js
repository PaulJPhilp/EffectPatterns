import { Command, Args, Options } from "@effect/cli";
import { Console, Effect, Chunk, Stream } from "effect";
import { FileSystem } from "@effect/platform";
import { Path } from "@effect/platform/Path";
import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
import { processPromptFromMdx, streamText } from "../services/llm-service/service.js";
import { parseMdxFile } from "../services/llm-service/utils.js";
// effect-patterns process-prompt <file> [--provider <provider>] [--model <model>] [--output <path>] [--output-format <format>]
const promptFile = Args.file({ name: "file", exists: "yes" });
const providerOption = Options.text("provider").pipe(Options.withDefault("google"), Options.withDescription("LLM provider to use (google, openai, anthropic)"));
const modelOption = Options.text("model").pipe(Options.withDefault("gemini-2.5-flash"), Options.withDescription("Model to use with the selected provider"));
const outputOption = Options.text("output").pipe(Options.optional, Options.withDescription("Save AI response to file instead of console"));
export const effectPatternsProcessPrompt = Command.make("process-prompt", {
    file: promptFile,
    provider: providerOption,
    model: modelOption,
    output: outputOption,
}, ({ file, provider, model, output }) => {
    const outputFormat = process.env.OUTPUT_FORMAT || "text";
    const schemaPrompt = process.env.SCHEMA_PROMPT;
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
            // Validate output format options
            if (outputFormat === "json" && !schemaPrompt) {
                return yield* Effect.fail(new Error("Schema prompt file is required when output format is json"));
            }
            // Check file extension to determine which method to use
            const fileExtension = file.toLowerCase().split('.').pop();
            let result;
            if (outputFormat === "json" && schemaPrompt) {
                // For JSON output format, we need to process the schema prompt first
                yield* Console.log(`Processing with structured output format using schema prompt: ${schemaPrompt}`);
                const fs = yield* FileSystem.FileSystem;
                const schemaPromptContent = yield* fs.readFileString(schemaPrompt);
                // Parse the schema prompt to extract schema definition from frontmatter
                const parsedSchemaPrompt = yield* parseMdxFile(schemaPromptContent);
                // Process the main prompt
                if (fileExtension === 'mdx') {
                    yield* Console.log(`Processing MDX file: ${file}`);
                    const mainPromptContent = yield* fs.readFileString(file);
                    const parsedMainPrompt = yield* parseMdxFile(mainPromptContent);
                    // Combine prompts for structured output
                    const combinedPrompt = `${parsedMainPrompt.body}\n\n${parsedSchemaPrompt.body}`;
                    result = yield* streamText(combinedPrompt, provider, model).pipe(Stream.runCollect, Effect.map((chunks) => Chunk.toReadonlyArray(chunks).join("")));
                }
                else {
                    yield* Console.log(`Processing text file: ${file}`);
                    const prompt = yield* fs.readFileString(file);
                    // Combine prompts for structured output
                    const combinedPrompt = `${prompt}\n\n${parsedSchemaPrompt.body}`;
                    result = yield* streamText(combinedPrompt, provider, model).pipe(Stream.runCollect, Effect.map((chunks) => Chunk.toReadonlyArray(chunks).join("")));
                }
            }
            else if (fileExtension === 'mdx') {
                yield* Console.log(`Processing MDX file: ${file}`);
                result = yield* processPromptFromMdx(file, provider, model);
            }
            else {
                yield* Console.log(`Processing text file: ${file}`);
                const fs = yield* FileSystem.FileSystem;
                const path = yield* Path;
                const prompt = yield* fs.readFileString(file);
                result = yield* streamText(prompt, provider, model).pipe(Stream.runCollect, Effect.map((chunks) => Chunk.toReadonlyArray(chunks).join("")));
            }
            // Extract text from AI response - handle any structure
            let textContent = result.parts?.[0]?.text ||
                result.text ||
                String(result) ||
                "No text generated";
            // If output format is JSON, try to parse and reformat the response
            if (outputFormat === "json") {
                try {
                    // Try to parse the response as JSON and reformat it
                    const parsedJson = JSON.parse(textContent);
                    textContent = JSON.stringify(parsedJson, null, 2);
                    yield* Console.log(`Processed structured output (JSON format)`);
                }
                catch (parseError) {
                    // If parsing fails, keep the original text content
                    yield* Console.log(`Warning: Could not parse response as JSON. Returning as text.`);
                }
            }
            else {
                yield* Console.log(`Processed prompt: ${textContent}`);
            }
            yield* otel.recordCounter("prompts_processed", 1, { file, provider, model });
            // Stage 6: Handle output file redirection
            if (output && output._tag === "Some") {
                const outputPath = output.value;
                yield* Console.log(`Saving response to: ${outputPath}`);
                const fs = yield* FileSystem.FileSystem;
                yield* fs.writeFileString(outputPath, textContent).pipe(Effect.tap(() => Console.log(`✅ Response saved to: ${outputPath}`)), Effect.catchAll((error) => Effect.gen(function* () {
                    yield* otel.recordException(span, error);
                    yield* Console.error(`❌ Failed to save file: ${error}`);
                    return yield* Effect.fail(error);
                })));
            }
            else {
                yield* Console.log(`Generated text: ${textContent}`);
            }
            yield* otel.endSpan(span);
            yield* metrics.endCommand();
            yield* metrics.reportMetrics("console");
            return { text: textContent, outputPath: output };
        }
        catch (error) {
            yield* otel.recordException(span, error);
            yield* metrics.recordError(error instanceof Error ? error : new Error(String(error)));
            yield* metrics.endCommand();
            yield* metrics.reportMetrics("console");
            yield* Console.error(`❌ Error processing prompt: ${error}`);
            return yield* Effect.fail(error);
        }
    });
});
