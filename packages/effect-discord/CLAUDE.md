# Effect Discord Package - Development Guide

**Package**: `@effect-patterns/effect-discord`
**Status**: ✅ Production Ready
**Last Updated**: 2025-10-10

## Overview

This package provides an Effect-TS service for interacting with Discord via the DiscordChatExporter.Cli tool. It demonstrates best practices for:
- Building Effect services with proper dependency injection
- Handling external CLI tools within Effect programs
- Managing secrets securely with `Effect.Secret`
- Resource cleanup with `Effect.ensuring`
- Comprehensive testing including integration tests

## Architecture

### Service Pattern: `Layer.effect` with Dependency Injection

This package uses the recommended `Layer.effect` pattern for service construction:

```typescript
export const DiscordLive = Layer.effect(
  Discord,
  Effect.gen(function* () {
    // 1. Capture all required dependencies during layer construction
    const config = yield* DiscordConfig;
    const fs = yield* FileSystem;
    const executor = yield* CommandExecutor;

    // 2. Define service methods that use captured dependencies
    const exportChannel = (channelId: string) =>
      Effect.gen(function* () {
        // 3. Inner Effects must receive services via Effect.provideService
        const content = yield* fs.readFileString(tempFile).pipe(
          Effect.provideService(FileSystem, fs), // Critical!
          Effect.mapError(/* ... */),
        );
      });

    // 4. Return the service implementation
    return Discord.of({ exportChannel });
  }),
);
```

**Key Pattern**: Services captured during construction return Effects that still declare service requirements. Use `Effect.provideService` to bridge the captured instance to inner Effects.

### File Structure

```
packages/effect-discord/
├── src/
│   ├── index.ts           # Public API: Service definitions, data models, errors
│   └── layer.ts           # Live implementation using Layer.effect
├── test/
│   └── integration.test.ts # Integration tests with real Discord API
├── INTEGRATION_TESTS.md   # Detailed testing setup guide
├── CLAUDE.md              # This file
├── README.md              # User-facing documentation
└── package.json
```

## Key Implementation Details

### 1. External CLI Tool Integration

The package wraps DiscordChatExporter.Cli using Effect's `Command` API:

```typescript
const command = Command.make(
  config.exporterPath,
  "export",              // Subcommand
  "-t", botToken,        // Arguments
  "-c", channelId,
  "-o", tempFile,
  "-f", "Json",
  "--media", "False",
);

const exitCode = yield* Command.exitCode(command).pipe(
  Effect.provideService(CommandExecutor, executor),
  Effect.mapError(cause => new DiscordExportError({ reason: "CommandFailed", cause })),
);
```

**Important**: DiscordChatExporter uses subcommands (`export`, `guilds`, etc.), not top-level flags.

### 2. Secure Secrets Handling

Bot tokens are wrapped in `Effect.Secret` to prevent accidental logging:

```typescript
export class DiscordConfig extends Context.Tag("DiscordConfig")<
  DiscordConfig,
  {
    readonly botToken: Secret.Secret;  // Not string!
    readonly exporterPath: string;
  }
>() {}

// In layer implementation
const command = Command.make(
  config.exporterPath,
  "export",
  "-t",
  Secret.value(config.botToken),  // Unwrap only when needed
  // ...
);
```

### 3. Resource Cleanup with `Effect.ensuring`

Temporary files are always cleaned up, even on failure:

```typescript
const logic = Effect.gen(function* () {
  // Export, read, parse...
  return channelExport;
});

return yield* Effect.ensuring(
  logic,
  fs.remove(tempFile).pipe(
    Effect.provideService(FileSystem, fs),
    Effect.ignore,  // Don't fail if cleanup fails
  ),
);
```

### 4. Tagged Errors

All failures map to domain-specific errors:

```typescript
export class DiscordExportError extends Data.TaggedError("DiscordExportError")<{
  readonly reason: "CommandFailed" | "FileNotFound" | "JsonParseError";
  readonly cause?: unknown;
}> {}

// Usage
yield* Command.exitCode(command).pipe(
  Effect.mapError(cause =>
    new DiscordExportError({ reason: "CommandFailed", cause })
  ),
);
```

## Testing Strategy

### Integration Tests (`test/integration.test.ts`)

The package includes comprehensive integration tests that connect to the real Discord API:

```typescript
describe("Discord Integration Tests", () => {
  test.skipIf(shouldSkip)("should export messages from real channel", async () => {
    const program = Effect.gen(function* () {
      const discord = yield* Discord;
      return yield* discord.exportChannel(TEST_CHANNEL_ID!);
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(TestLayer),
        Effect.provide(NodeContext.layer),
      )
    );

    expect(result.messages.length).toBeGreaterThan(0);
  }, 30000);
});
```

**Smart Skip Logic**: Tests automatically skip when credentials aren't available, with helpful warning messages.

### Test Setup Requirements

1. **DiscordChatExporter.Cli Tool**: Downloaded to `./tools/` (v2.46.0)
2. **Discord Bot Configuration**:
   - Bot token from Discord Developer Portal
   - **Message Content Intent** enabled (Privileged Gateway Intent)
   - Bot invited to test server
   - Test channel ID
3. **Environment Variables** in `.env`:
   ```env
   DISCORD_BOT_TOKEN="your-token"
   DISCORD_TEST_CHANNEL_ID="channel-id"
   DISCORD_EXPORTER_PATH="./tools/DiscordChatExporter.Cli"
   ```

See [INTEGRATION_TESTS.md](./INTEGRATION_TESTS.md) for complete setup guide.

## Common Issues and Solutions

### Issue 1: FileSystem Service Not Found

**Problem**: Even with `NodeContext.layer` provided, inner Effects can't find FileSystem.

**Solution**: Services captured during layer construction must be provided to inner Effects:

```typescript
const fs = yield* FileSystem;  // Capture during construction

// Later, in service method:
const content = yield* fs.readFileString(path).pipe(
  Effect.provideService(FileSystem, fs),  // Must provide!
);
```

### Issue 2: "Message Content Intent Not Enabled"

**Problem**: DiscordChatExporter fails with intent error.

**Solution**: Enable in Discord Developer Portal:
- Bot → Privileged Gateway Intents → MESSAGE CONTENT INTENT ✅

### Issue 3: "Request Failed: Forbidden"

**Problem**: Bot can't access channel.

**Solution**:
1. Invite bot to server with OAuth2 URL generator
2. Ensure bot has "Read Messages" and "Read Message History" permissions
3. Check channel-specific permission overrides

### Issue 4: Command Exit Code 1

**Problem**: DiscordChatExporter.Cli fails silently.

**Solution**: Run command directly to see error:
```bash
./tools/DiscordChatExporter.Cli export -t "token" -c "channel-id" -o /tmp/test.json -f Json --media False
```

## Usage Examples

### Basic Export

```typescript
import { Discord, DiscordLive, DiscordConfig } from "@effect-patterns/effect-discord";
import { Effect, Layer, Secret } from "effect";
import { NodeContext } from "@effect/platform-node";

const ConfigLive = Layer.succeed(DiscordConfig, {
  botToken: Secret.fromString(process.env.DISCORD_BOT_TOKEN!),
  exporterPath: "./tools/DiscordChatExporter.Cli",
});

const program = Effect.gen(function* () {
  const discord = yield* Discord;
  const result = yield* discord.exportChannel("1234567890");
  console.log(`Exported ${result.messages.length} messages`);
  return result;
});

const runnable = program.pipe(
  Effect.provide(DiscordLive),
  Effect.provide(ConfigLive),
  Effect.provide(NodeContext.layer),
);

await Effect.runPromise(runnable);
```

### With Config from Environment

```typescript
import { Config } from "effect";

const DiscordConfigLive = Layer.effect(
  DiscordConfig,
  Effect.gen(function* () {
    const botToken = yield* Config.secret("DISCORD_BOT_TOKEN");
    const exporterPath = yield* Config.string("DISCORD_EXPORTER_PATH");
    return DiscordConfig.of({ botToken, exporterPath });
  }),
);

const MainLayer = DiscordLive.pipe(
  Layer.provide(DiscordConfigLive),
  Layer.provide(NodeContext.layer),
);
```

### Error Handling

```typescript
const program = Effect.gen(function* () {
  const discord = yield* Discord;
  return yield* discord.exportChannel("invalid-id");
}).pipe(
  Effect.catchTag("DiscordExportError", (error) => {
    console.error(`Export failed: ${error.reason}`);
    return Effect.succeed({ messages: [] });
  })
);
```

## Build and Development

### Build Package

```bash
bun run build  # Compiles TypeScript to dist/
```

### Run Tests

```bash
# From project root (to load .env file)
bun test packages/effect-discord/test/integration.test.ts

# Skip integration tests (unit tests only)
SKIP_INTEGRATION_TESTS=true bun test packages/effect-discord/test/integration.test.ts
```

### Type Check

```bash
bun run typecheck
```

## Layer Composition Patterns

### Pattern 1: Layer.provide Chain

```typescript
const MainLayer = DiscordLive.pipe(
  Layer.provide(DiscordConfigLive),
  Layer.provide(NodeContext.layer),
);
```

### Pattern 2: Separate Program and Layer Provision

```typescript
const program = Effect.gen(function* () {
  const discord = yield* Discord;
  const fs = yield* FileSystem;  // Program can use other services too
  // ...
});

const runnable = program.pipe(
  Effect.provide(MainLayer),      // Provides Discord service
  Effect.provide(NodeContext.layer),  // Provides FileSystem for program
);
```

## Real-World Example

See [scripts/ingest-discord.ts](../../scripts/ingest-discord.ts) for a production example that:
1. Reads configuration from environment
2. Exports Discord channel
3. Anonymizes user data (maps user IDs to pseudonyms)
4. Saves curated dataset to JSON
5. Uses proper logging with Effect.logInfo

## Related Files

- **Implementation**: [src/layer.ts](./src/layer.ts) - Live service implementation
- **API**: [src/index.ts](./src/index.ts) - Service definitions and types
- **Tests**: [test/integration.test.ts](./test/integration.test.ts) - Integration test suite
- **Setup Guide**: [INTEGRATION_TESTS.md](./INTEGRATION_TESTS.md) - Detailed test setup
- **Example Script**: [scripts/ingest-discord.ts](../../scripts/ingest-discord.ts) - Production usage

## Next Steps / Future Enhancements

1. **Additional Operations**:
   - List channels in a guild
   - Export multiple channels in parallel
   - Export threads and forum posts
   - User lookup and profile export

2. **Enhanced Error Handling**:
   - Retry logic for transient failures (rate limits, network errors)
   - More granular error types (RateLimited, NetworkError, etc.)

3. **Data Model Enhancements**:
   - Full DiscordMessage with all fields (attachments, embeds, reactions, etc.)
   - Thread message support
   - Structured user roles and permissions

4. **Performance**:
   - Streaming large exports instead of loading entire file
   - Incremental exports (only new messages since last export)
   - Parallel channel exports with concurrency control

## Lessons Learned

1. **Service Provision in Layers**: Services captured during `Layer.effect` construction still require `Effect.provideService` for inner Effects. This enables testability.

2. **External CLI Tools**: Use `Command.make` with proper subcommand structure. Check tool's help output carefully.

3. **Discord Bot Setup**: Message Content Intent is required and must be explicitly enabled. Not just a permission issue.

4. **Testing Strategy**: Integration tests with skip logic provide confidence without blocking CI when credentials aren't available.

5. **Resource Cleanup**: `Effect.ensuring` guarantees cleanup even on failure. Use `Effect.ignore` on cleanup Effects to avoid masking original errors.

## Contributing

When modifying this package:

1. **Maintain the Layer Pattern**: Keep using `Layer.effect` with proper service capture and provision
2. **Update Tests**: Add test cases for new functionality
3. **Document Errors**: Add new error reasons to `DiscordExportError` as needed
4. **Preserve Type Safety**: Keep all data models readonly and use Data.case for construction
5. **Update Documentation**: Keep README.md, CLAUDE.md, and INTEGRATION_TESTS.md in sync

## Questions?

- Check [INTEGRATION_TESTS.md](./INTEGRATION_TESTS.md) for testing questions
- See [scripts/ingest-discord.ts](../../scripts/ingest-discord.ts) for usage examples
- Review Effect-TS docs: https://effect.website/docs/introduction
- Discord API: https://discord.com/developers/docs
