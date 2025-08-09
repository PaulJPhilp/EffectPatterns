import { Args, Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Console, Effect, Option } from "effect";
import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
// effect-patterns list [-v | --verbose] [--json] [-q|--quiet] [--no-color] [-o|--output <file>] [-f|--force] [--] [<pathspec>...]
const pathspec = Args.text({ name: "pathspec" }).pipe(Args.repeated);
const verbose = Options.boolean("verbose").pipe(Options.withAlias("v"), Options.optional);
const json = Options.boolean("json").pipe(Options.optional);
const quiet = Options.boolean("quiet").pipe(Options.withAlias("q"), Options.optional);
const noColor = Options.boolean("no-color").pipe(Options.optional);
const output = Options.file("output").pipe(Options.withAlias("o"), Options.optional);
const force = Options.boolean("force").pipe(Options.withAlias("f"), Options.optional);
export const effectPatternsList = Command.make("list", { pathspec, verbose, json, quiet, noColor, output, force }, ({ pathspec, verbose, json, quiet, noColor, output, force }) => {
    return Effect.gen(function* () {
        const metrics = yield* MetricsService;
        const otel = yield* OtelService;
        const targetPath = pathspec.length === 0 ? "content/published" : pathspec[0];
        const verboseMode = Option.getOrElse(verbose, () => false);
        const jsonMode = Option.getOrElse(json, () => false);
        const quietMode = Option.getOrElse(quiet, () => false);
        const noColorMode = Option.getOrElse(noColor, () => false);
        const shouldLog = !quietMode && !jsonMode;
        if (verboseMode && shouldLog) {
            yield* Console.log("=== DEBUG: Starting list command ===");
            yield* Console.log(`Target path: ${targetPath}`);
            yield* Console.log(`Verbose mode: ${verboseMode}`);
        }
        yield* metrics.startCommand("list");
        // Create OTel span for list operation
        const span = yield* otel.startSpan("list-operation", {
            attributes: { targetPath, verbose: verboseMode },
        });
        yield* otel.addEvent(span, "starting_list_operation", { targetPath });
        const files = yield* Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            if (verboseMode && shouldLog) {
                yield* Console.log(`DEBUG: About to read directory: ${targetPath}`);
            }
            const entries = yield* fs.readDirectory(targetPath).pipe(Effect.catchAll((error) => Effect.gen(function* () {
                if (verboseMode && shouldLog) {
                    yield* Console.log(`DEBUG: Error reading directory: ${error}`);
                }
                return [];
            })));
            if (verboseMode && shouldLog) {
                yield* Console.log(`DEBUG: Found ${entries.length} entries`);
            }
            const filePaths = entries.map((entry) => `${targetPath}/${entry}`);
            if (verboseMode && shouldLog) {
                yield* Console.log(`DEBUG: Mapped to ${filePaths.length} file paths`);
            }
            return filePaths;
        }).pipe(Effect.catchAll((error) => Effect.gen(function* () {
            if (verboseMode && shouldLog) {
                yield* Console.log(`DEBUG: CatchAll error: ${error}`);
            }
            return [];
        })));
        if (verboseMode && shouldLog) {
            yield* Console.log(`DEBUG: Final file count: ${files.length}`);
            yield* Console.log(`Found ${files.length} files in ${targetPath}:`);
        }
        // Handle output
        if (jsonMode) {
            const jsonPayload = {
                command: "list",
                path: targetPath,
                count: files.length,
                files,
                timestamp: new Date().toISOString(),
            };
            const content = JSON.stringify(jsonPayload, null, 2);
            if (Option.isSome(output)) {
                const fs = yield* FileSystem.FileSystem;
                const outPath = output.value;
                if (!Option.getOrElse(force, () => false)) {
                    // best-effort overwrite policy; FileSystem lacks exists on this import, so try/catch write
                }
                yield* fs.writeFileString(outPath, content);
            }
            else {
                yield* Console.log(content);
            }
        }
        else if (!quietMode) {
            for (const file of files) {
                yield* Console.log(`  ${file}`);
            }
            if (Option.isSome(output)) {
                const fs = yield* FileSystem.FileSystem;
                const outPath = output.value;
                yield* fs.writeFileString(outPath, files.join("\n"));
            }
        }
        yield* otel.recordCounter("files_found", files.length);
        yield* otel.endSpan(span);
        yield* metrics.endCommand();
        return files;
    });
});
