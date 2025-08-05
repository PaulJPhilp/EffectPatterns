import * as dotenv from "dotenv";
dotenv.config();
import { Command, Options } from "@effect/cli";
import { Effect, Console } from "effect";
import { authCommand } from "./commands/auth.js";
import { configCommand } from "./commands/config.js";
import { dryRun } from "./commands/dry-run.js";
import { health } from "./commands/health.js";
import { effectPatternsList } from "./commands/list.js";
import { modelCommand } from "./commands/model.js";
import { effectPatternsProcessPrompt } from "./commands/process-prompt.js";
import { testCommand } from "./commands/test.js";
import { traceCommand } from "./commands/trace.js";
import { applyPromptToDir } from "./commands/apply-prompt-to-dir.js";
import { systemPromptCommand } from "./commands/system-prompt.js";
import { ProductionRuntime } from "./runtime/production-runtime.js";
// effect-patterns [--version] [-h | --help] [-c <name>=<value>] [--run [name_prefix]] [--otel] [--otel-endpoint <url>]
const configs = Options.keyValueMap("c").pipe(Options.optional);
const version = Options.boolean("version").pipe(Options.withAlias("v"));
const help = Options.boolean("help").pipe(Options.withAlias("h"));
const run = Options.text("run").pipe(Options.optional, Options.withDescription("Enable run mode with optional name prefix"));
const otel = Options.boolean("otel").pipe(Options.withDescription("Enable OpenTelemetry tracing and metrics"));
const otelEndpoint = Options.text("otel-endpoint").pipe(Options.optional, Options.withDescription("OTel collector endpoint (default: http://localhost:4317)"));
const otelServiceName = Options.text("otel-service-name").pipe(Options.optional, Options.withDescription("OTel service name (default: effect-patterns-cli)"));
// Create a root command that doesn't execute anything by default
const command = Command.make("effect-patterns", {}, () => Effect.void).pipe(Command.withSubcommands([effectPatternsList, modelCommand, dryRun, configCommand, health, effectPatternsProcessPrompt, authCommand, traceCommand, testCommand, applyPromptToDir, systemPromptCommand]));
const cli = Command.run(command, {
    name: "Effect Patterns CLI",
    version: "1.0.0"
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
    if (errorStr.includes('FiberFailure')) {
        const match = errorStr.match(/Error:\s*({.*?})/);
        if (match) {
            try {
                const parsed = JSON.parse(match[1]);
                errorMessage = parsed.error || parsed.message || errorStr;
            }
            catch {
                errorMessage = errorStr;
            }
        }
    }
    // Log the error with formatting
    yield* Console.error(`\n❌ CLI Error: ${errorMessage}`);
    // Add helpful context based on error type
    if (errorStr.includes('Service not found')) {
        yield* Console.error('\n💡 Hint: This might be a dependency injection issue. Check that all required services are properly configured.');
    }
    else if (errorStr.includes('InvalidFrontmatterError')) {
        yield* Console.error('\n💡 Hint: Check your MDX frontmatter for valid provider and model values.');
    }
    else if (errorStr.includes('api key')) {
        yield* Console.error('\n💡 Hint: Make sure your API keys are properly set in your .env file.');
    }
    return yield* Effect.fail(new Error("Command execution failed"));
})));
// Run the CLI with the managed runtime
ProductionRuntime.runPromise(main);
