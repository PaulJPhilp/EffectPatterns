import { Args, Options } from "@effect/cli";
import { Effect, Option } from "effect";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import {
  makeCommand,
  printText,
  printJson,
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

// Trace debugging command
export const traceCommand = makeCommand(
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
    compact: Options.boolean("compact").pipe(Options.optional),
    verbose: Options.boolean("verbose").pipe(
      Options.optional,
      Options.withDescription("Show detailed trace information"),
      Options.withAlias("v")
    ),
    quiet: optQuiet(
      "Suppress normal output (errors still go to stderr)"
    ),
    output: optOutput("Write output to file (overwrites if exists)"),
    force: optForce("Force overwrite output file if it exists"),
  },
  ({ command, span, json, compact, verbose, output, force, quiet }) =>
    Effect.gen(function* () {
      // Normalize options
      const jsonFlag = Option.getOrElse(json as Option.Option<boolean>, () => false);
      const compactFlag = Option.getOrElse(compact as Option.Option<boolean>, () => false);
      const verboseMode = Option.getOrElse(verbose as Option.Option<boolean>, () => false);
      const quietFlag = Option.getOrElse(quiet as Option.Option<boolean>, () => false);
      const forceFlag = Option.getOrElse(force as Option.Option<boolean>, () => false);
      const localOutput = Option.getOrElse(output as Option.Option<string>, () => undefined);

      // Set shared flags so helpers can merge
      setGlobalJson(jsonFlag);
      setGlobalCompact(compactFlag);
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
      const useCompact = getGlobalCompact();

      // System information
      const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
      };

      const filters = {
        command: command !== undefined ? command : null,
        span: span !== undefined ? span : null,
      } as const;

      if (asJson) {
        const payload = {
          timestamp: new Date().toISOString(),
          system: systemInfo,
          filters,
        };
        yield* printJson(payload, useCompact, resolvedOutput ? { outputFile: resolvedOutput } : undefined);
        return;
      }

      // Text output
      const lines: string[] = [];
      lines.push("🔍 CLI Trace Information:");
      lines.push(`Node: ${systemInfo.nodeVersion}`);
      lines.push(`Platform: ${systemInfo.platform}`);
      lines.push(`Architecture: ${systemInfo.arch}`);
      lines.push(`Working Directory: ${systemInfo.cwd}`);
      if (verboseMode) {
        lines.push("");
        lines.push("Trace filters:");
        lines.push(`- Command: ${command || "all"}`);
        lines.push(`- Span: ${span || "all"}`);
      }
      lines.push("✅ Trace analysis complete");

      yield* printText(lines.join("\n"), resolvedOutput ? { outputFile: resolvedOutput } : undefined);
    }),
  {
    description: "Debug CLI/runtime environment and optional span filters",
    errorPrefix: "Error in trace command",
  }
);
