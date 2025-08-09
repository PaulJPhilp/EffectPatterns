import * as dotenv from "dotenv";
dotenv.config();
import { Command, Options } from "@effect/cli";
import { Console, Effect } from "effect";
import { applyPromptToDir } from "./commands/apply-prompt-to-dir.js";
import { authCommand } from "./commands/auth.js";
import { configCommand } from "./commands/config.js";
import { dryRun } from "./commands/dry-run.js";
import { echoCommand } from "./commands/echo.js";
import { effectPatternsGen, effectPatternsGenerate, effectPatternsProcessPromptLegacy, } from "./commands/generate.js";
import { health } from "./commands/health.js";
import { effectPatternsList } from "./commands/list.js";
import { metricsCommand } from "./commands/metrics.js";
import { planCommand } from "./commands/plan.js";
import { run as runGroup } from "./commands/run.js";
import { systemPromptCommand } from "./commands/system-prompt.js";
import { testCommand } from "./commands/test.js";
import { traceCommand } from "./commands/trace.js";
import { runWithAppropriateRuntime } from "./runtime/runtime-selector.js";
// effect-patterns [--version] [-h | --help] [-c <name>=<value>] [--run [name_prefix]] [--otel] [--otel-endpoint <url>]
const configs = Options.keyValueMap("c").pipe(Options.optional);
const version = Options.boolean("version").pipe(Options.withAlias("v"));
const help = Options.boolean("help").pipe(Options.withAlias("h"));
const run = Options.text("run").pipe(Options.optional, Options.withDescription("Enable run mode with optional name prefix"));
const otel = Options.boolean("otel").pipe(Options.withDescription("Enable OpenTelemetry tracing and metrics"));
const otelEndpoint = Options.text("otel-endpoint").pipe(Options.optional, Options.withDescription("OTel collector endpoint (default: http://localhost:4317)"));
const otelServiceName = Options.text("otel-service-name").pipe(Options.optional, Options.withDescription("OTel service name (default: effect-patterns-cli)"));
// Create a root command that doesn't execute anything by default
const command = Command.make("effect-patterns", {
    configs,
    version,
    help,
    run,
    otel,
    otelEndpoint,
    otelServiceName,
}, () => Effect.void).pipe(Command.withSubcommands([
    effectPatternsList,
    dryRun,
    configCommand,
    health,
    runGroup,
    metricsCommand,
    planCommand,
    effectPatternsGenerate,
    effectPatternsGen,
    effectPatternsProcessPromptLegacy,
    authCommand,
    traceCommand,
    testCommand,
    applyPromptToDir,
    systemPromptCommand,
    echoCommand,
]));
const cli = Command.run(command, {
    name: "Effect Patterns CLI",
    version: "1.0.0",
});
// Main CLI effect
const mainEffect = cli(process.argv);
// Run the CLI with Effect-based error handling
const main = Effect.gen(function* () {
    yield* Console.info("Starting Effect Patterns CLI...");
    // Run the CLI program
    yield* mainEffect;
    yield* Console.info("CLI completed successfully");
    return yield* Effect.sync(() => process.exit(0));
}).pipe(Effect.catchAll((error) => Effect.gen(function* () {
    // Format the error message
    const errorStr = String(error);
    // Handle FiberFailure wrapper
    let errorMessage = errorStr;
    if (errorStr.includes("FiberFailure")) {
        const match = errorStr.match(/Error:\s*({.*?})/);
        if (match) {
            const parsed = Effect.try({
                try: () => JSON.parse(match[1]),
                catch: () => null,
            });
            const parsedVal = yield* parsed;
            if (parsedVal) {
                errorMessage = parsedVal.error || parsedVal.message || errorStr;
            }
            else {
                errorMessage = errorStr;
            }
        }
    }
    // Log the error with formatting
    yield* Console.error(`\n❌ CLI Error: ${errorMessage}`);
    // Add helpful context based on error type
    if (errorStr.includes("Service not found")) {
        yield* Console.error("\n💡 Hint: This might be a dependency injection issue. Check that all required services are properly configured.");
    }
    else if (errorStr.includes("InvalidFrontmatterError")) {
        yield* Console.error("\n💡 Hint: Check your MDX frontmatter for valid provider and model values.");
    }
    else if (errorStr.includes("api key")) {
        yield* Console.error("\n💡 Hint: Make sure your API keys are properly set in your .env file.");
    }
    return yield* Effect.fail(new Error("Command execution failed"));
})));
// Run the CLI with the appropriate runtime based on command
runWithAppropriateRuntime(main);
