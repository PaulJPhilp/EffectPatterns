import { FileSystem } from "@effect/platform/FileSystem";
import * as Command from "@effect/platform/Command";
import { CommandExecutor } from "@effect/platform/CommandExecutor";
import { Effect, Layer, Secret } from "effect";
import { Discord, DiscordConfig, DiscordExportError, } from "./index.js";
// The live implementation of the Discord service.
// It requires FileSystem, CommandExecutor, and DiscordConfig services from its context.
export const DiscordLive = Layer.effect(Discord, Effect.gen(function* () {
    const config = yield* DiscordConfig;
    const fs = yield* FileSystem;
    const executor = yield* CommandExecutor;
    const exportChannel = (channelId) => Effect.scoped(Effect.gen(function* () {
        // 1. Create a temporary file path for the JSON output.
        const tempFile = `/tmp/ep-discord-export-${Date.now()}.json`;
        // 2. Construct the CLI command to run the exporter.
        const command = Command.make(config.exporterPath, "export", // The subcommand
        "-t", Secret.value(config.botToken), // Securely unwrap the secret
        "-c", channelId, "-o", tempFile, "-f", "Json", "--media", // Do not download media files
        "False");
        // 3. Define the core logic: execute, read, parse, and clean up.
        const logic = Effect.gen(function* () {
            // 3a. Execute the command. Map errors to our domain error.
            const exitCode = yield* Command.exitCode(command).pipe(Effect.provideService(CommandExecutor, executor), Effect.mapError((cause) => new DiscordExportError({ reason: "CommandFailed", cause })));
            if (exitCode !== 0) {
                return yield* Effect.fail(new DiscordExportError({
                    reason: "CommandFailed",
                    cause: new Error(`Command exited with code ${exitCode}`),
                }));
            }
            // 3b. Read the file contents. Map errors.
            const content = yield* fs.readFileString(tempFile).pipe(Effect.provideService(FileSystem, fs), Effect.mapError((cause) => new DiscordExportError({ reason: "FileNotFound", cause })));
            // 3c. Parse the JSON. Map errors.
            return yield* Effect.try({
                try: () => JSON.parse(content),
                catch: (cause) => new DiscordExportError({ reason: "JsonParseError", cause }),
            });
        });
        // 4. Use `Effect.ensuring` to guarantee that the temp file is deleted,
        // whether the logic succeeds or fails.
        return yield* Effect.ensuring(logic, fs.remove(tempFile).pipe(Effect.provideService(FileSystem, fs), Effect.ignore));
    }));
    // 5. Return the service implementation.
    return Discord.of({ exportChannel });
}));
//# sourceMappingURL=layer.js.map