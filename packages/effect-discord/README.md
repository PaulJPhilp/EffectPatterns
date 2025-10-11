# @effect-patterns/effect-discord

An Effect-TS service for interacting with Discord, providing a high-level, Effect-native API for Discord operations.

## Status

✅ **Implementation Complete** - Production-ready Effect-TS service for Discord channel exports with comprehensive integration tests.

## Overview

This package provides an Effect-based service for Discord operations. The initial focus is on exporting channel data using the [DiscordChatExporter.Cli](https://github.com/Tyrrrz/DiscordChatExporter) tool.

### Features

- 🎯 **Effect-native API** - Full integration with Effect-TS patterns
- 🔒 **Type-safe errors** - Tagged errors with specific failure reasons
- 🧹 **Resource management** - Automatic cleanup with `Effect.ensuring`
- 🔐 **Secrets handling** - Secure bot token management with `Effect.Secret`
- 🧪 **Comprehensive tests** - Unit tests and integration tests with real Discord API
- 📦 **Layer-based DI** - Proper dependency injection with Effect layers

## Installation

This is a workspace package within the Effect-Patterns monorepo.

```bash
bun install
```

## Architecture

### Service Definition (`src/index.ts`)

- **Discord Service**: Context.Tag-based service definition
- **DiscordMessage**: Data model for individual Discord messages
- **ChannelExport**: Data model for channel export results
- **DiscordExportError**: Tagged error for export operations

### Implementation (`src/layer.ts`)

- **DiscordLive**: Layer providing the live implementation
- Uses `Layer.effect` for proper dependency injection
- Requires: `FileSystem`, `Path`, `CommandExecutor`, and `DiscordConfig`
- Executes DiscordChatExporter.Cli command
- Guarantees cleanup with `Effect.ensuring`

## Usage

```typescript
import { Discord, DiscordLive, DiscordConfig } from "@effect-patterns/effect-discord";
import { Effect, Layer, Secret } from "effect";
import { NodeContext } from "@effect/platform-node";

// 1. Create a configuration layer
const ConfigLive = Layer.succeed(DiscordConfig, {
  botToken: Secret.fromString(process.env.DISCORD_BOT_TOKEN!),
  exporterPath: "DiscordChatExporter.Cli",
});

// 2. Compose all required layers
const AppLayer = Layer.mergeAll(
  ConfigLive,
  DiscordLive,
).pipe(Layer.provide(NodeContext.layer));

// 3. Use the Discord service
const program = Effect.gen(function* () {
  const discord = yield* Discord;
  const channelExport = yield* discord.exportChannel("channel-id-here");
  console.log(`Exported ${channelExport.messages.length} messages`);
  return channelExport;
});

// 4. Run with all dependencies
const runnable = Effect.provide(program, AppLayer);
Effect.runPromise(runnable);
```

## API

### Discord Service

```typescript
interface Discord {
  exportChannel(channelId: string): Effect.Effect<ChannelExport, DiscordExportError>
}
```

### Data Models

```typescript
interface DiscordMessage {
  readonly id: string;
  readonly content: string;
  readonly author: {
    readonly id: string;
    readonly name: string;
  };
}

interface ChannelExport {
  readonly messages: readonly DiscordMessage[];
}
```

### Errors

```typescript
class DiscordExportError extends Data.TaggedError("DiscordExportError")<{
  readonly reason: "CommandFailed" | "FileNotFound" | "JsonParseError";
  readonly cause?: unknown;
}>
```

## Testing

### Prerequisites

1. **Download DiscordChatExporter.Cli** (v2.46.0+):
   ```bash
   # macOS
   curl -L -o /tmp/DiscordChatExporter.Cli.osx-x64.zip \
     https://github.com/Tyrrrz/DiscordChatExporter/releases/download/2.46/DiscordChatExporter.Cli.osx-x64.zip
   unzip -o /tmp/DiscordChatExporter.Cli.osx-x64.zip -d ./tools/
   chmod +x ./tools/DiscordChatExporter.Cli
   ```

2. **Configure Discord Bot** (for integration tests):
   - Create a bot at [Discord Developer Portal](https://discord.com/developers/applications)
   - Enable **Message Content Intent** under "Bot" → "Privileged Gateway Intents"
   - Invite bot to a test server
   - Add to `.env`:
     ```env
     DISCORD_BOT_TOKEN="your-bot-token"
     DISCORD_TEST_CHANNEL_ID="your-channel-id"
     DISCORD_EXPORTER_PATH="./tools/DiscordChatExporter.Cli"
     ```

See [INTEGRATION_TESTS.md](./INTEGRATION_TESTS.md) for detailed setup instructions.

### Run Tests

```bash
# All tests (from project root to load .env)
bun test packages/effect-discord/test/integration.test.ts

# Skip integration tests
SKIP_INTEGRATION_TESTS=true bun test packages/effect-discord/test/integration.test.ts
```

**Test Coverage:**
- ✅ Export messages from real Discord channel
- ✅ Handle invalid channel IDs gracefully
- ✅ Verify message data structure
- ✅ Service interface validation
- ✅ Error type construction
- ✅ Data model creation

## Development

### Build

```bash
bun run build
```

### Type Check

```bash
bun run typecheck
```

## Implementation Details

### Dependency Injection

The `DiscordLive` layer uses `Layer.effect` to properly declare its dependencies:

- **FileSystem**: For reading exported JSON files
- **Path**: For constructing temp file paths
- **CommandExecutor**: For executing the DiscordChatExporter.Cli command
- **DiscordConfig**: For bot token and exporter path configuration

### Error Handling

All potential failure points are mapped to `DiscordExportError` with specific reasons:

- `CommandFailed`: DiscordChatExporter.Cli execution failed
- `FileNotFound`: Exported JSON file not found
- `JsonParseError`: Invalid JSON in exported file

### Resource Management

Uses `Effect.ensuring` to guarantee temp file cleanup, even if the export fails.

## Example: Discord Data Ingestion Script

See [scripts/ingest-discord.ts](../../scripts/ingest-discord.ts) for a complete example of:
- Configuring the Discord service with environment variables
- Exporting channel messages
- Anonymizing user data for privacy
- Saving curated datasets to JSON

## Next Steps

1. ✅ ~~Add tests for the Discord service~~ - Complete with integration tests
2. Add additional Discord operations as needed (e.g., channel listing, user lookup)
3. Enhance DiscordMessage model with more fields from DiscordChatExporter output
4. Add retry logic for transient failures
5. Support for exporting threads and forum posts

## License

MIT
