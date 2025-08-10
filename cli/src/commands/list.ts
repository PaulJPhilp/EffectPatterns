import { Args, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Effect, Option } from "effect";
import { MetricsService } from "../services/metrics-service/service.js";
import { OtelService } from "../services/otel-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import {
  makeCommand,
  printJson,
  printText,
  setGlobalJson,
  setGlobalCompact,
  setGlobalOutputOptions,
  getGlobalJson,
  getGlobalCompact,
  getGlobalOutputOptions,
  optQuiet,
  optForce,
  optOutput,
} from "./_shared.js";

// effect-patterns list [-v | --verbose] [--json] [-q|--quiet] [--no-color] [-o|--output <file>] [-f|--force] [--] [<pathspec>...]
const pathspec = Args.text({ name: "pathspec" }).pipe(Args.repeated);
const verbose = Options.boolean("verbose").pipe(
  Options.withAlias("v"),
  Options.optional
);
const json = Options.boolean("json").pipe(Options.optional);
const quiet = optQuiet("Suppress normal output (errors still go to stderr)");
const noColor = Options.boolean("no-color").pipe(Options.optional);
const output = optOutput("Write output to file (overwrites if exists)");
const force = optForce("Force overwrite output file if it exists");

export const effectPatternsList = makeCommand(
  "list",
  { pathspec, verbose, json, quiet, noColor, output, force },
  ({ pathspec, verbose, json, quiet, noColor, output, force }) => {
    return Effect.gen(function* () {
      const metrics = yield* MetricsService;
      const otel = yield* OtelService;

      const targetPath =
        pathspec.length === 0 ? "content/published" : pathspec[0];

      const verboseMode = Option.getOrElse(verbose as Option.Option<boolean>, () => false);
      const jsonFlag = Option.getOrElse(json as Option.Option<boolean>, () => false);
      const quietFlag = Option.getOrElse(quiet as Option.Option<boolean>, () => false);
      const noColorMode = Option.getOrElse(noColor as Option.Option<boolean>, () => false);
      const forceFlag = Option.getOrElse(force as Option.Option<boolean>, () => false);
      const localOutput = Option.getOrElse(output as Option.Option<string>, () => undefined);

      // Set global flags for helpers
      setGlobalJson(jsonFlag);
      setGlobalCompact(false);
      setGlobalOutputOptions(
        quietFlag || localOutput || forceFlag
          ? {
              quiet: quietFlag || undefined,
              outputFile: localOutput,
              force: forceFlag || undefined,
            }
          : undefined
      );
      const resolvedOutput = getGlobalOutputOptions()?.outputFile;
      const asJson = getGlobalJson() || !!resolvedOutput;
      const shouldLog = !quietFlag && !asJson;

      if (verboseMode && shouldLog) {
        yield* Effect.log("=== DEBUG: Starting list command ===");
        yield* Effect.log(`Target path: ${targetPath}`);
        yield* Effect.log(`Verbose mode: ${verboseMode}`);
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
          yield* Effect.log(`DEBUG: About to read directory: ${targetPath}`);
        }

        const entries = yield* fs.readDirectory(targetPath).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              if (verboseMode && shouldLog) {
                yield* Effect.log(`DEBUG: Error reading directory: ${error}`);
              }
              return [] as string[];
            })
          )
        );
        if (verboseMode && shouldLog) {
          yield* Effect.log(`DEBUG: Found ${entries.length} entries`);
        }

        const filePaths = entries.map((entry) => `${targetPath}/${entry}`);
        if (verboseMode && shouldLog) {
          yield* Effect.log(`DEBUG: Mapped to ${filePaths.length} file paths`);
        }

        return filePaths;
      }).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            if (verboseMode && shouldLog) {
              yield* Effect.log(`DEBUG: CatchAll error: ${error}`);
            }
            return [];
          })
        )
      );

      if (verboseMode && shouldLog) {
        yield* Effect.log(`DEBUG: Final file count: ${files.length}`);
        yield* Effect.log(`Found ${files.length} files in ${targetPath}:`);
      }

      // Handle output
      if (asJson) {
        const jsonPayload = {
          command: "list",
          path: targetPath,
          count: files.length,
          files,
          timestamp: new Date().toISOString(),
        };
        yield* printJson(
          jsonPayload,
          getGlobalCompact(),
          resolvedOutput ? { outputFile: resolvedOutput } : undefined
        );
      } else if (!quietFlag) {
        const content = files.map((f) => `  ${f}`).join("\n");
        yield* printText(
          content,
          resolvedOutput ? { outputFile: resolvedOutput } : undefined
        );
      }

      yield* otel.recordCounter("files_found", files.length);
      yield* otel.endSpan(span);
      yield* metrics.endCommand();

      return files;
    });
  },
  {
    description: "List files under a content path",
    errorPrefix: "Error in list command",
  }
);
