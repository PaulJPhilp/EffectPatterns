# Discord Service & Data Analysis Engine

Integration with Discord for pattern discovery and AI-powered community insights.

---

## Overview

The Data Analysis Engine combines Discord data export with AI-powered thematic analysis to:
- Export Discord channel conversations
- Anonymize user data
- Analyze themes and pain points
- Generate pattern recommendations
- Guide content strategy

---

## Architecture

### Components

**Discord Exporter** (`@effect-patterns/effect-discord`)
- Effect-native Discord integration service
- Wraps DiscordChatExporter.Cli for channel data export
- Secure token handling with Effect.Secret
- Tagged errors and resource cleanup

**Analysis Agent** (`scripts/analyzer/`)
- LangGraph workflow for thematic analysis
- Uses Effect services for all I/O
- Chunks Discord messages for analysis
- Aggregates themes across chunks

**LLM Service** (`scripts/analyzer/services/llm.ts`)
- Effect service wrapping Anthropic Claude
- Streaming support for real-time feedback
- Error handling and retry logic

**File Service** (`scripts/analyzer/services/file.ts`)
- Effect service for reading/writing analysis results
- Handles report generation and storage

---

## Working with the Discord Service

### The @effect-patterns/effect-discord Package

Location: `packages/effect-discord/`

**Purpose:**
Export Discord channel data for pattern discovery and curation (e.g., common questions from the Effect-TS Discord community).

**Key Features:**
- Effect.Service pattern with Layer.effect
- Wraps DiscordChatExporter.Cli tool
- Secure token handling with Effect.Secret
- Tagged errors: CommandFailed, FileNotFound, JsonParseError
- Resource cleanup with Effect.ensuring
- Comprehensive integration tests with real Discord API

### Usage Example

```typescript
import {
  Discord,
  DiscordLive,
  DiscordConfig,
} from "@effect-patterns/effect-discord";
import { Effect, Layer, Secret } from "effect";
import { NodeContext } from "@effect/platform-node";

const ConfigLive = Layer.succeed(DiscordConfig, {
  botToken: Secret.fromString(process.env.DISCORD_BOT_TOKEN!),
  exporterPath: "./tools/DiscordChatExporter.Cli",
});

const program = Effect.gen(function* () {
  const discord = yield* Discord;
  const result = yield* discord.exportChannel("channel-id");
  console.log(`Exported ${result.messages.length} messages`);
  return result;
});

await Effect.runPromise(
  program.pipe(
    Effect.provide(DiscordLive),
    Effect.provide(ConfigLive),
    Effect.provide(NodeContext.layer)
  )
);
```

### Data Export Process

**Command:**
```bash
bun run ingest:discord
```

**Process:**
1. Reads `DISCORD_BOT_TOKEN` from environment
2. Exports channel messages using DiscordChatExporter.Cli
3. Anonymizes user data:
   - Replaces usernames with MD5 hashes
   - Replaces user IDs with numeric identifiers
   - Preserves message content and timestamps
4. Saves to `/tmp/discord-exports/` directory
5. Returns structured `ChannelExport` data

**Output:**
```json
{
  "channelId": "1125094089281511474",
  "channelName": "effect-ts-help",
  "exportDate": "2025-12-13T10:30:00Z",
  "messageCount": 2500,
  "messages": [
    {
      "id": "hash_abc123",
      "authorId": "user_001",
      "authorName": "hash_author_xyz",
      "timestamp": "2025-12-13T09:15:00Z",
      "content": "How do I handle errors in Effect?",
      "attachmentCount": 0
    },
    // ... more messages
  ]
}
```

### Testing

```bash
# Run integration tests (requires Discord bot setup)
bun test packages/effect-discord/test/integration.test.ts

# Skip integration tests
SKIP_INTEGRATION_TESTS=true bun test packages/effect-discord/test/integration.test.ts
```

### Setup

See these files for detailed setup:
- [`packages/effect-discord/README.md`](../packages/effect-discord/README.md) - User documentation
- [`packages/effect-discord/INTEGRATION_TESTS.md`](../packages/effect-discord/INTEGRATION_TESTS.md) - Test setup guide
- [`packages/effect-discord/CLAUDE.md`](../packages/effect-discord/CLAUDE.md) - Development guide

---

## Working with the Data Analysis Engine

### Architecture

The analysis workflow uses LangGraph for orchestration:

```
Export Discord Data
      ↓
Chunk Messages (1000-2000 chars per chunk)
      ↓
Send Chunks to Claude (parallel)
      ↓
Extract Themes from Each Analysis
      ↓
Aggregate Themes Across All Chunks
      ↓
Generate Report with Recommendations
      ↓
Save to data/analysis/analysis-report-{timestamp}.md
```

### Complete Example

```bash
# Step 1: Export Discord data
export DISCORD_BOT_TOKEN="your-bot-token"
bun run ingest:discord
# Output: /tmp/discord-exports/channel-{id}-{timestamp}.json

# Step 2: Run analysis
export ANTHROPIC_API_KEY="your-api-key"
bun run analyze
# Output: data/analysis/analysis-report-{timestamp}.md
```

### Output Report

Analysis report includes:

**Themes & Pain Points**
- Most common themes in community conversations
- Specific pain points and blockers
- Frequency and impact assessment

**Code Examples**
- Code patterns mentioned in conversations
- Common use cases
- Problem scenarios

**Pattern Recommendations**
- Patterns that could address identified pain points
- Priority ranking
- Implementation guidance

**Community Insights**
- Learning curves and challenges
- Common misconceptions
- Best practices consensus

**Report Format:**
```markdown
# Discord Analysis Report
Generated: 2025-12-13T10:30:00Z

## Themes

### Most Common Themes
1. Error Handling & Recovery (245 mentions)
   - Specific pain point: Understanding effect error types
   - Impact: High (affects 80% of new developers)

2. Concurrency Patterns (189 mentions)
   - Specific pain point: Race conditions in parallel effects
   - Impact: Medium

...

## Recommendations

### High Priority Patterns
- handle-errors-with-catch (addresses error handling pain point)
- retry-with-exponential-backoff (addresses recovery scenarios)

### Medium Priority Patterns
- parallel-effect-composition
- resource-cleanup-with-finally

...
```

### Analysis Agent Structure

Location: `scripts/analyzer/`

**Key Files:**
- `graph.ts` - Main workflow orchestration using LangGraph
- `nodes.ts` - Analysis workflow nodes (chunk, analyze, aggregate)
- `state.ts` - Workflow state management
- `services/llm.ts` - LLM service (Claude via Anthropic API)
- `services/file.ts` - File I/O service
- `__tests__/` - Integration tests

**LangGraph Workflow:**
```typescript
const workflow = new StateGraph<AnalysisState>()
  .addNode("chunk", chunkNode)         // Split data into chunks
  .addNode("analyze", analyzeNode)     // Analyze each chunk
  .addNode("aggregate", aggregateNode) // Combine results
  .addEdge(START, "chunk")
  .addEdge("chunk", "analyze")
  .addEdge("analyze", "aggregate")
  .addEdge("aggregate", END);

// Effect services provide dependencies
const program = Effect.gen(function* () {
  const llm = yield* LLMService;
  const file = yield* FileService;

  // Run LangGraph workflow
  const result = await workflow.invoke({
    messages: exportedData.messages,
    chunks: [],
    analyses: [],
    finalReport: null,
  });

  // Save report
  yield* file.writeReport(result.finalReport);
});
```

### Key Features

**Effect-First Architecture**
- All I/O operations use Effect services
- Type-safe dependency injection
- Error handling with tagged errors

**Type-Safe State Management**
- LangGraph state is fully typed with TypeScript
- Compiler catches state shape errors
- Clear data flow through workflow

**Streaming Support**
- LLM responses can be streamed
- Real-time feedback during analysis
- Progressive result generation

**Error Handling**
- Tagged errors throughout: DiscordError, LLMError, FileError
- Specific recovery strategies
- Detailed error messages

**Testability**
- Mock services for unit tests
- Live tests for integration
- Parameterized for different scenarios

**Observability**
- Structured logging
- OpenTelemetry integration
- Performance metrics

---

## Configuration

### Environment Variables

**Required:**
- `DISCORD_BOT_TOKEN` - Discord bot authentication (for export)
- `ANTHROPIC_API_KEY` - Claude API key (for analysis)

**Optional:**
- `ANALYSIS_OUTPUT_DIR` - Output directory (default: `data/analysis/`)
- `DISCORD_EXPORT_DIR` - Export directory (default: `/tmp/discord-exports/`)
- `CHUNK_SIZE` - Message chunk size (default: 1500 chars)
- `ANALYSIS_PARALLELISM` - Parallel analysis threads (default: 4)

### Discord Bot Setup

To use Discord export:

1. Create Discord app at https://discord.com/developers/applications
2. Create bot user for the app
3. Grant permissions: Read Messages, Read Message History
4. Copy bot token to `DISCORD_BOT_TOKEN`
5. Add bot to your Discord server

---

## Testing

### Unit Tests

Test with mock services:
```bash
bun test scripts/analyzer/__tests__/nodes.test.ts
```

Tests individual nodes with mocked LLM/File services.

### Integration Tests

Test with real Discord + Claude APIs:
```bash
bun test scripts/analyzer/__tests__/graph.test.ts
```

⚠️ Requires valid `DISCORD_BOT_TOKEN` and `ANTHROPIC_API_KEY`

### Skip Integration Tests

```bash
SKIP_INTEGRATION_TESTS=true bun test scripts/analyzer/
```

---

## Production Usage

### Data Export Script

Location: `scripts/ingest-discord.ts`

Example of how to use Discord service in production:
```typescript
// Demonstrates:
// - Setting up DiscordLive layer
// - Error handling
// - File operations
// - Proper resource cleanup
```

See file for complete implementation.

### Analysis Entry Point

Location: `scripts/analyzer.ts`

Entry point for running analysis workflow:
```bash
bun scripts/analyzer.ts

# Or via npm script:
bun run analyze
```

---

## Workflow Diagrams

### Data Export Flow
```
Discord API
    ↓
DiscordChatExporter.Cli (binary tool)
    ↓
Raw JSON export
    ↓
Anonymization (user data hashing)
    ↓
Structured ChannelExport
    ↓
Saved to /tmp/discord-exports/
```

### Analysis Flow
```
ChannelExport JSON
    ↓
Chunk into segments (1000-2000 chars)
    ↓
Send chunks to Claude (parallel)
    ↓
Extract themes from each analysis
    ↓
Aggregate across all chunks
    ↓
Generate final report
    ↓
Save markdown report
```

---

## Limitations & Future Work

### Current Limitations
- Analysis may not capture nuanced community sentiment
- Chunking may lose context across message boundaries
- Rate limiting with Claude API (handle with retry logic)

### Future Improvements
- Multi-channel analysis combining multiple Discord channels
- Sentiment analysis alongside thematic analysis
- Pattern usage tracking across community
- Automated pattern generation from discovered themes

---

## See Also

- [`packages/effect-discord/INTEGRATION_TESTS.md`](../packages/effect-discord/INTEGRATION_TESTS.md) - Discord bot setup
- [`scripts/analyzer/README.md`](../scripts/analyzer/README.md) - Analysis engine documentation
- [`scripts/analyzer/services/`](../scripts/analyzer/services/) - Effect services
- [Architecture & Monorepo Structure](./ARCHITECTURE.md)
