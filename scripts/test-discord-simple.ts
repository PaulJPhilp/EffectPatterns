import { FileSystem } from "@effect/platform/FileSystem";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer, Config, Secret, LogLevel, Logger } from "effect";
import { NodeRuntime } from "@effect/platform-node";
import {
  Discord,
  DiscordConfig,
} from "../packages/effect-discord/dist/index.js";
import { DiscordLive } from "../packages/effect-discord/dist/layer.js";

// Simple configuration
const ConfigLive = Layer.succeed(DiscordConfig, {
  botToken: Secret.fromString("test-token"),
  exporterPath: "./tools/DiscordChatExporter.Cli",
});

// Main program
const program = Effect.gen(function* () {
  yield* Effect.log("Starting test...");
  const discord = yield* Discord;
  const result = yield* discord.exportChannel("123456");
  yield* Effect.log(`Got ${result.messages.length} messages`);
});

// Compose layers
const MainLayer = DiscordLive.pipe(
  Layer.provide(ConfigLive),
  Layer.provide(NodeContext.layer),
);

// Run
NodeRuntime.runMain(Effect.provide(program, MainLayer));
