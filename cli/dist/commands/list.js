import { Args, Command, Options } from "@effect/cli";
import { Console, Effect } from "effect";
import { FileSystem } from "@effect/platform";
import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
// effect-patterns list [-v | --verbose] [--] [<pathspec>...]
const pathspec = Args.text({ name: "pathspec" }).pipe(Args.repeated);
const verbose = Options.boolean("verbose").pipe(Options.withAlias("v"));
export const effectPatternsList = Command.make("list", { pathspec, verbose }, ({ pathspec, verbose }) => {
    return Effect.gen(function* () {
        const metrics = yield* MetricsService;
        const otel = yield* OtelService;
        const targetPath = pathspec.length === 0 ? "content/published" : pathspec[0];
        yield* Console.log(`=== DEBUG: Starting list command ===`);
        yield* Console.log(`Target path: ${targetPath}`);
        yield* Console.log(`Verbose mode: ${verbose}`);
        yield* metrics.startCommand("list");
        // Create OTel span for list operation
        const span = yield* otel.startSpan("list-operation", {
            attributes: { targetPath, verbose }
        });
        yield* otel.addEvent(span, "starting_list_operation", { targetPath });
        const files = yield* Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            yield* Console.log(`DEBUG: About to read directory: ${targetPath}`);
            try {
                const entries = yield* fs.readDirectory(targetPath);
                yield* Console.log(`DEBUG: Found ${entries.length} entries`);
                const filePaths = entries.map(entry => `${targetPath}/${entry}`);
                yield* Console.log(`DEBUG: Mapped to ${filePaths.length} file paths`);
                return filePaths;
            }
            catch (error) {
                yield* Console.log(`DEBUG: Error reading directory: ${error}`);
                return [];
            }
        }).pipe(Effect.catchAll((error) => Effect.gen(function* () {
            yield* Console.log(`DEBUG: CatchAll error: ${error}`);
            return [];
        })));
        yield* Console.log(`DEBUG: Final file count: ${files.length}`);
        yield* Console.log(`Found ${files.length} files in ${targetPath}:`);
        for (const file of files) {
            yield* Console.log(`  ${file}`);
        }
        yield* otel.recordCounter("files_found", files.length);
        yield* otel.endSpan(span);
        yield* metrics.endCommand();
        return files;
    });
});
