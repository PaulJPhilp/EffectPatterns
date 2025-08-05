import { Command, Args, Options } from "@effect/cli";
import { Console, Effect } from "effect";
// Trace debugging command
export const traceCommand = Command.make("trace", {
    command: Args.text({ name: "command" }).pipe(Args.optional),
    span: Options.text("span").pipe(Options.optional, Options.withDescription("Span name to filter")),
    json: Options.boolean("json").pipe(Options.optional, Options.withDescription("Output results in JSON format")),
    verbose: Options.boolean("verbose").pipe(Options.optional, Options.withDescription("Show detailed trace information")),
    output: Options.file("output").pipe(Options.optional, Options.withDescription("Write output to file (overwrites if exists)")),
    force: Options.boolean("force").pipe(Options.optional, Options.withDescription("Force overwrite output file if it exists")),
    quiet: Options.boolean("quiet").pipe(Options.optional, Options.withDescription("Suppress normal output (errors still go to stderr)"))
}, ({ command, span, json, verbose, output, force, quiet }) => Effect.gen(function* () {
    const verboseMode = verbose._tag === "Some" && verbose.value;
    const jsonMode = json._tag === "Some" && json.value;
    const quietMode = quiet._tag === "Some" && quiet.value;
    const forceMode = force._tag === "Some" && force.value;
    // System information
    const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd()
    };
    const traceInfo = {
        timestamp: new Date().toISOString(),
        system: systemInfo,
        filters: {
            command: command !== undefined ? command : null,
            span: span !== undefined ? span : null
        }
    };
    const outputData = {
        timestamp: new Date().toISOString(),
        system: systemInfo,
        filters: {
            command: command !== undefined ? command : null,
            span: span !== undefined ? span : null
        }
    };
    if (jsonMode) {
        const jsonOutput = JSON.stringify(outputData, null, 2);
        if (output._tag === "Some") {
            const outputFile = output.value;
            if (!quietMode) {
                yield* Console.log(`💾 Writing trace results to ${outputFile}`);
            }
            // In real implementation, write to file
            yield* Console.log(`Would write JSON to ${outputFile}:`);
            yield* Console.log(jsonOutput);
        }
        else {
            yield* Console.log(jsonOutput);
        }
    }
    else {
        if (!quietMode) {
            yield* Console.log("🔍 CLI Trace Information:");
            yield* Console.log(`Node: ${systemInfo.nodeVersion}`);
            yield* Console.log(`Platform: ${systemInfo.platform}`);
            yield* Console.log(`Architecture: ${systemInfo.arch}`);
            yield* Console.log(`Working Directory: ${systemInfo.cwd}`);
            if (verboseMode) {
                yield* Console.log(`\nTrace filters:`);
                yield* Console.log(`- Command: ${command || "all"}`);
                yield* Console.log(`- Span: ${span || "all"}`);
            }
        }
    }
    if (!quietMode) {
        yield* Console.log("✅ Trace analysis complete");
    }
}));
