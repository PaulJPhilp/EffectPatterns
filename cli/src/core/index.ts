import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import { runWithAppropriateRuntime } from "../runtime/runtime-selector.js";

// Use `any` for Name and Config due to variance in @effect/cli Command type,
// which otherwise rejects heterogeneous literal names/config shapes.
// Keep R and E as unknown to avoid widening effectful environment/error types.
type AnyCommand = Command.Command<any, unknown, unknown, any>;

export interface CliPlugin {
  readonly name: string;
  readonly commands: readonly AnyCommand[];
}

export interface CreateCliOptions {
  readonly commands?: readonly AnyCommand[];
  readonly plugins?: readonly CliPlugin[];
  readonly name?: string;
  readonly version?: string;
}

export function createCli(options: CreateCliOptions) {
  const { commands = [], plugins = [] } = options;

  const configs = Options.keyValueMap("c").pipe(Options.optional);
  const version = Options.boolean("version").pipe(Options.withAlias("v"));
  const help = Options.boolean("help").pipe(Options.withAlias("h"));
  const run = Options.text("run").pipe(
    Options.optional,
    Options.withDescription("Enable run mode with optional name prefix")
  );
  const otel = Options.boolean("otel").pipe(
    Options.withDescription("Enable OpenTelemetry tracing and metrics")
  );
  const otelEndpoint = Options.text("otel-endpoint").pipe(
    Options.optional,
    Options.withDescription(
      "OTel collector endpoint (default: http://localhost:4317)"
    )
  );
  const otelServiceName = Options.text("otel-service-name").pipe(
    Options.optional,
    Options.withDescription("OTel service name (default: effect-patterns-cli)")
  );

  const rootBase = Command.make(
    options.name ?? "effect-patterns",
    { configs, version, help, run, otel, otelEndpoint, otelServiceName },
    () => Effect.void
  );

  const all = [
    ...commands,
    ...plugins.flatMap((p) => p.commands),
  ] as readonly AnyCommand[];

  const root = all.length
    ? Command.withSubcommands(all as [AnyCommand, ...AnyCommand[]])(rootBase)
    : rootBase;

  return root;
}

export function runCli(root: AnyCommand, argv = process.argv) {
  const cli = Command.run(root, { name: "Effect CLI", version: "0.0.0" });
  const mainEffect = cli(argv);
  return runWithAppropriateRuntime(
    mainEffect as Effect.Effect<never, unknown, never>,
    argv
  );
}

// Re-export common utilities
export { runWithAppropriateRuntime } from "../runtime/runtime-selector.js";

// Re-export core commands for consumers to compose
export { authCommand } from "../commands/auth.js";
export { configCommand } from "../commands/config.js";
export { dryRun } from "../commands/dry-run.js";
export { echoCommand } from "../commands/echo.js";
export {
  effectPatternsGen as genAliasCommand,
  effectPatternsGenerate as generateCommand,
  effectPatternsProcessPromptLegacy as processPromptLegacyCommand,
} from "../commands/generate.js";
export { health } from "../commands/health.js";
export { effectPatternsList as listCommand } from "../commands/list.js";
export { metricsCommand } from "../commands/metrics.js";
export { planCommand } from "../commands/plan.js";
export { run as runGroup } from "../commands/run.js";
export { systemPromptCommand } from "../commands/system-prompt.js";
export { testCommand } from "../commands/test.js";
export { traceCommand } from "../commands/trace.js";
