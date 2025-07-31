import * as dotenv from "dotenv";
dotenv.config();

import { Command, Options } from "@effect/cli";
import { Effect, Layer } from "effect";
import { authCommand } from "./commands/auth.js";
import { configCommand } from "./commands/config.js";
import { dryRun } from "./commands/dry-run.js";
import { health } from "./commands/health.js";
import { effectPatternsList } from "./commands/list.js";
import { modelCommand } from "./commands/model.js";
import { effectPatternsProcessPrompt } from "./commands/process-prompt.js";
import { testCommand } from "./commands/test.js";
import { traceCommand } from "./commands/trace.js";

import { ProductionRuntime } from "./runtime/production-runtime.js";

// effect-patterns [--version] [-h | --help] [-c <name>=<value>] [--run [name_prefix]] [--otel] [--otel-endpoint <url>]
const configs = Options.keyValueMap("c").pipe(Options.optional);
const version = Options.boolean("version").pipe(Options.withAlias("v"));
const help = Options.boolean("help").pipe(Options.withAlias("h"));
const run = Options.text("run").pipe(
  Options.optional,
  Options.withDescription("Enable run mode with optional name prefix")
);
const otel = Options.boolean("otel").pipe(Options.withDescription("Enable OpenTelemetry tracing and metrics"));
const otelEndpoint = Options.text("otel-endpoint").pipe(
  Options.optional,
  Options.withDescription("OTel collector endpoint (default: http://localhost:4317)")
);
const otelServiceName = Options.text("otel-service-name").pipe(
  Options.optional,
  Options.withDescription("OTel service name (default: effect-patterns-cli)")
);

// Create a root command that doesn't execute anything by default
const command = Command.make("effect-patterns", {}, () => Effect.void).pipe(
  Command.withSubcommands([effectPatternsList, modelCommand, dryRun, configCommand, health, effectPatternsProcessPrompt, authCommand, traceCommand, testCommand])
);

const cli = Command.run(command, {
  name: "Effect Patterns CLI",
  version: "1.0.0"
});
// Main CLI effect
const mainEffect = cli(process.argv);

// Run the CLI with the managed runtime
ProductionRuntime.runPromise(mainEffect).then(
  () => process.exit(0),
  (error) => {
    console.error(`❌ CLI Error: ${error}`);
    process.exit(1);
  }
);
