import { FileSystem } from "@effect/platform";
import { Console, Effect } from "effect";
import { NodeFileSystem } from "@effect/platform-node"; // Provides FileSystem service
import { OutputHandlerError } from "./errors.js";
export class OutputHandlerService extends Effect.Service()("OutputHandlerService", {
    effect: Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        // Output text content to console or file
        const outputText = (content, options) => {
            return Effect.gen(function* () {
                // If quiet mode is enabled, don't output anything
                if (options.quiet) {
                    return;
                }
                // If output file is specified, write to file
                if (options.outputFile) {
                    // Check if file exists and handle force option
                    const exists = yield* fs.exists(options.outputFile);
                    if (exists && !options.force) {
                        return yield* Effect.fail(new OutputHandlerError(`File ${options.outputFile} already exists. Use --force to overwrite.`));
                    }
                    // Handle file system errors by converting them to OutputHandlerError
                    yield* fs.writeFileString(options.outputFile, content).pipe(Effect.mapError((error) => new OutputHandlerError(`Failed to write file: ${error._tag}`, error)));
                    yield* Console.log(`Output written to ${options.outputFile}`);
                    return;
                }
                // Otherwise, output to console
                yield* Console.log(content);
            });
        };
        // Output JSON data to console or file
        const outputJson = (data, options) => {
            return Effect.gen(function* () {
                const jsonContent = JSON.stringify(data, null, 2);
                // If quiet mode is enabled, don't output anything
                if (options.quiet) {
                    return;
                }
                // If output file is specified, write to file
                if (options.outputFile) {
                    // Check if file exists and handle force option
                    const exists = yield* fs.exists(options.outputFile);
                    if (exists && !options.force) {
                        return yield* Effect.fail(new OutputHandlerError(`File ${options.outputFile} already exists. Use --force to overwrite.`));
                    }
                    // Handle file system errors by converting them to OutputHandlerError
                    yield* fs.writeFileString(options.outputFile, jsonContent).pipe(Effect.mapError((error) => new OutputHandlerError(`Failed to write file: ${error._tag}`, error)));
                    yield* Console.log(`Output written to ${options.outputFile}`);
                    return;
                }
                // Otherwise, output to console
                yield* Console.log(jsonContent);
            });
        };
        return {
            outputText,
            outputJson
        };
    }),
    dependencies: [NodeFileSystem.layer]
}) {
}
