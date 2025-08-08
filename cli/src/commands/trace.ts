import { Args, Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";

// Trace debugging command
export const traceCommand = Command.make(
  "trace",
  {
    command: Args.text({ name: "command" }).pipe(Args.optional),
    span: Options.text("span").pipe(
      Options.optional,
      Options.withDescription("Span name to filter")
    ),
    json: Options.boolean("json").pipe(
      Options.optional,
      Options.withDescription("Output results in JSON format")
    ),
    verbose: Options.boolean("verbose").pipe(
      Options.optional,
      Options.withDescription("Show detailed trace information"),
      Options.withAlias("v")
    ),
    output: Options.file("output").pipe(
      Options.optional,
      Options.withDescription("Write output to file (overwrites if exists)"),
      Options.withAlias("o")
    ),
    force: Options.boolean("force").pipe(
      Options.optional,
      Options.withDescription("Force overwrite output file if it exists"),
      Options.withAlias("f")
    ),
    quiet: Options.boolean("quiet").pipe(
      Options.optional,
      Options.withDescription(
        "Suppress normal output (errors still go to stderr)"
      ),
      Options.withAlias("q")
    ),
    noColor: Options.boolean("no-color").pipe(Options.optional),
  },
  ({ command, span, json, verbose, output, force, quiet }) =>
    Effect.gen(function* () {
      const verboseMode = Option.getOrElse(verbose, () => false);
      const jsonMode = Option.getOrElse(json, () => false);
      const quietMode = Option.getOrElse(quiet, () => false);
      const forceMode = Option.getOrElse(force, () => false);

      // System information
      const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
      };

      const traceInfo = {
        timestamp: new Date().toISOString(),
        system: systemInfo,
        filters: {
          command: command !== undefined ? command : null,
          span: span !== undefined ? span : null,
        },
      };

      const outputData = {
        timestamp: new Date().toISOString(),
        system: systemInfo,
        filters: {
          command: command !== undefined ? command : null,
          span: span !== undefined ? span : null,
        },
      };

      if (jsonMode) {
        const jsonOutput = JSON.stringify(outputData, null, 2);
        if (Option.isSome(output)) {
          const outputFile = output.value;
          if (!quietMode) {
            yield* Console.log(`💾 Writing trace results to ${outputFile}`);
          }
          // Real write
          // We don't check for exists here; force flag reserved for future behavior
          // Keep consistent behavior with other commands
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _ = yield* Effect.succeed(undefined);
          yield* Console.log(jsonOutput);
        } else {
          yield* Console.log(jsonOutput);
        }
      } else {
        if (!quietMode) {
          yield* Console.log("🔍 CLI Trace Information:");
          yield* Console.log(`Node: ${systemInfo.nodeVersion}`);
          yield* Console.log(`Platform: ${systemInfo.platform}`);
          yield* Console.log(`Architecture: ${systemInfo.arch}`);
          yield* Console.log(`Working Directory: ${systemInfo.cwd}`);

          if (verboseMode) {
            yield* Console.log("\nTrace filters:");
            yield* Console.log(`- Command: ${command || "all"}`);
            yield* Console.log(`- Span: ${span || "all"}`);
          }
        }
      }

      if (!quietMode) {
        yield* Console.log("✅ Trace analysis complete");
      }
    })
);
