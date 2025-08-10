import { BadArgument, SystemError } from "@effect/platform/Error";
import type { PlatformError } from "@effect/platform/Error";
import { FileSystem } from "@effect/platform"
import { Console, Data, Effect } from "effect";
import { NodeFileSystem } from "@effect/platform-node"; // Provides FileSystem service
import { OutputHandlerError } from "./errors.js";
import { OutputOptions } from "./types.js";

export class OutputHandlerService extends Effect.Service<OutputHandlerService>()(
	"OutputHandlerService",
	{
		effect: Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;

			// Output text content to console or file
			const outputText = (content: string, options: OutputOptions): Effect.Effect<void, OutputHandlerError | BadArgument | SystemError> => {
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
						yield* fs.writeFileString(options.outputFile, content).pipe(
							Effect.mapError((error: PlatformError) =>
								new OutputHandlerError(`Failed to write file: ${error._tag}`, error)
							)
						);
						yield* Effect.log(`Output written to ${options.outputFile}`);
						return;
					}

					// Otherwise, output to console
					yield* Effect.log(content);
				});
			};

			// Output JSON data to console or file
			const outputJson = (data: unknown, options: OutputOptions): Effect.Effect<void, OutputHandlerError | BadArgument | SystemError> => {
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
						yield* fs.writeFileString(options.outputFile, jsonContent).pipe(
							Effect.mapError((error: PlatformError) =>
								new OutputHandlerError(`Failed to write file: ${error._tag}`, error)
							)
						);
						yield* Effect.log(`Output written to ${options.outputFile}`);
						return;
					}

					// Otherwise, output to console
					yield* Effect.log(jsonContent);
				});
			};

			return {
				outputText,
				outputJson
			};
		}),
		dependencies: [NodeFileSystem.layer]
	}
) { }