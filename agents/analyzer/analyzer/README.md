# Effect-TS Discord Q&A Analyzer

> **AI-powered analysis of Effect-TS Discord conversations using LangGraph, Effect-TS, and OpenAI GPT-4o**

An intelligent analyzer that processes Discord Q&A messages to extract common questions, identify Effect-TS patterns, discover pain points, and generate actionable insights for improving documentation and learning resources.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Output Format](#output-format)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## Overview

### What It Does

The analyzer processes Discord Q&A data (JSON format) and produces comprehensive analysis reports that include:

- **Common Questions**: Most frequently asked questions about Effect-TS
- **Effect Patterns**: Identified usage patterns (Services, Layers, Errors, Schema, HTTP/RPC)
- **Pain Points**: Areas where users struggle or get confused
- **Best Practices**: Recommended approaches and solutions
- **Code Examples**: Key patterns demonstrated in the discussions
- **Recommendations**: Suggestions for documentation improvements

### Key Features

- ✅ **Schema Validation**: Uses Effect.Schema for runtime validation
- ✅ **Smart Chunking**: Context-aware message grouping (keeps Q&A pairs together)
- ✅ **Retry Logic**: Exponential backoff for LLM API calls
- ✅ **Error Handling**: Tagged errors with detailed error messages
- ✅ **Structured Logging**: Progress tracking with emoji indicators
- ✅ **Effect-TS Native**: Built entirely with Effect-TS patterns

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LangGraph Workflow                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Load & Chunk │─>│ Analyze      │─>│ Aggregate    │     │
│  │ Data         │  │ Chunks       │  │ Results      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────┐
│                      Service Layers                         │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ LLM Service      │  │ Validation       │               │
│  │ - GPT-4o         │  │ Service          │               │
│  │ - Retry Logic    │  │ - Schema Check   │               │
│  │ - Error Mapping  │  │ - Message Count  │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ Chunking         │  │ Config           │               │
│  │ Service          │  │ Service          │               │
│  │ - Smart Q&A      │  │ - Environment    │               │
│  │ - Relationship   │  │ - Defaults       │               │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────┐
│                    Core Components                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Schemas      │  │ Errors       │  │ Types        │     │
│  │ - Message    │  │ - Tagged     │  │ - GraphState │     │
│  │ - Analysis   │  │ - Helpers    │  │ - Config     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites

- **Bun** >= 1.0.0 (or Node.js >= 18)
- **OpenAI API Key** (GPT-4o access)
- **TypeScript** >= 5.0

### Setup

```bash
# 1. Clone repository
cd /path/to/Effect-Patterns

# 2. Install dependencies
bun install

# 3. Navigate to analyzer
cd scripts/analyzer

# 4. Create .env file from template
cp .env.example .env

# 5. Edit .env and add your OpenAI API key
# Open .env in your editor and set:
# OPENAI_API_KEY=sk-your-actual-api-key-here
```

## Configuration

### Environment Variables

Create a `.env` file in `scripts/analyzer/`:

```bash
# ============================================================
# REQUIRED
# ============================================================
OPENAI_API_KEY=sk-...your-api-key-here...

# ============================================================
# OPTIONAL (with defaults)
# ============================================================

# Chunking Configuration
CHUNK_SIZE=50                    # Target messages per chunk
SMART_CHUNKING=true              # Enable Q&A-aware chunking
MIN_RELATIONSHIP_SCORE=75        # Threshold for chunk breaks (0-100)

# LLM Configuration
MODEL_NAME=gpt-4o                # OpenAI model to use
TEMPERATURE=0                    # Creativity (0 = deterministic)
MAX_RETRIES=3                    # Max retry attempts
REQUEST_TIMEOUT=60000            # Timeout in milliseconds

# Output Configuration
OUTPUT_FORMAT=markdown           # Report format (markdown or json)
```

### Configuration Details

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | **required** | Your OpenAI API key with GPT-4o access |
| `CHUNK_SIZE` | `50` | Target number of messages per chunk |
| `SMART_CHUNKING` | `true` | Keep Q&A pairs together using relationship scoring |
| `MIN_RELATIONSHIP_SCORE` | `75` | Minimum score (0-100) to keep messages together |
| `MODEL_NAME` | `gpt-4o` | OpenAI model (supports tool calling) |
| `TEMPERATURE` | `0` | LLM temperature (0 = consistent, 1 = creative) |
| `MAX_RETRIES` | `3` | Maximum retry attempts for failed LLM calls |
| `REQUEST_TIMEOUT` | `60000` | Timeout per request (ms) |
| `OUTPUT_FORMAT` | `markdown` | Output format (markdown/json) |

### Smart Chunking Algorithm

The analyzer uses a multi-signal heuristic to determine message relationships:

- **Sequential ID**: +100/+50 points for consecutive/near messages
- **Q&A Pattern**: +50 points for question→answer pairs
- **Same Author**: +30 points for same user
- **Time Proximity**: +25/+10/-20 points based on message timing

Messages are grouped together when relationship score ≥ `MIN_RELATIONSHIP_SCORE`.

## Usage

### Basic Usage

```bash
# Analyze Discord Q&A data
bun run graph.ts \
  --input ../../packages/data/discord-qna.json \
  --output ./output/analysis.txt
```

### Programmatic Usage

```typescript
import { Effect } from "effect";
import { app } from "./graph.js";
import { AnalysisLayer } from "./graph.js";

const program = Effect.gen(function* () {
  const result = yield* Effect.promise(() =>
    app.invoke({
      inputFile: "/path/to/discord-qna.json",
      outputFile: "/path/to/output/report.txt",
    })
  );
  
  console.log(`Processed ${result.totalMessages} messages`);
  console.log(`Created ${result.chunkCount} chunks`);
  console.log(`Generated ${result.partialAnalyses?.length} analyses`);
  
  return result;
});

Effect.runPromise(Effect.provide(program, AnalysisLayer));
```

### Advanced Usage

```typescript
import { Effect, Layer } from "effect";
import { LLMService } from "./services.js";
import { DataValidationService } from "./validation-service.js";
import { chunkMessagesDefault } from "./chunking-service.js";

// Custom configuration
const customConfig = Layer.succeed(/* ... */);

// Custom layer composition
const customLayer = Layer.mergeAll(
  LLMService.Default,
  DataValidationService.Live,
  customConfig
);

// Run with custom layer
Effect.runPromise(Effect.provide(program, customLayer));
```

## Output Format

### Report Structure

The analyzer generates a comprehensive markdown report:

```markdown
# Effect-TS Discord Q&A Analysis

## Executive Summary
High-level findings and key insights...

## Common Questions
1. How to choose between HttpApi, HttpRouter, and effect/rpc?
2. How to handle multiple error types in Effect?
...

## Effect-TS Patterns

### Services
- Pattern 1: Effect.Service with accessors
- Pattern 2: Layer-based dependency injection
...

### Error Handling
- Tagged errors with Data.TaggedError
- Error unions for multiple error types
...

## Pain Points
1. Confusion around HttpApi vs HttpRouter
2. Type inference with Schema.Type
...

## Best Practices
1. Use HttpRouter for low-level control
2. Use HttpApi for spec-driven REST APIs
...

## Code Examples

### Example 1: Service Definition
\`\`\`typescript
export class MyService extends Effect.Service<MyService>()(
  "MyService",
  { effect: ... }
) {}
\`\`\`

...

## Recommendations
1. Add decision tree for HTTP API options
2. Expand error handling documentation
...
```

### Output Metadata

The `GraphState` includes metadata about the analysis:

```typescript
interface GraphState {
  messages: Message[];           // Validated messages
  chunks?: Message[][];          // Message chunks
  totalMessages?: number;        // Total message count
  chunkCount?: number;           // Number of chunks created
  chunkingStrategy?: string;     // "smart" or "simple"
  partialAnalyses?: PartialAnalysis[];  // Per-chunk analyses
  finalReport?: string;          // Final aggregated report
}
```

## Testing

### Run Tests

```bash
# Make sure .env file is set up with OPENAI_API_KEY
# (Tests will automatically load from .env)

# Run all tests
bun test

# Run specific test
bun test graph.test.ts

# Run with verbose output
VERBOSE=1 bun test

# Skip live tests (no API key needed)
unset OPENAI_API_KEY
bun test
```

### Test Data

- **Mock Data**: `test-data/mock-export.json` (53 messages)
- **Real Data**: `../../packages/data/discord-qna.json` (50 Effect-TS Q&A messages)

### Test Coverage

The test suite validates:

✅ **Data Processing**: File reading, JSON parsing, schema validation  
✅ **Chunking**: Smart chunking algorithm, relationship scoring  
✅ **LLM Integration**: OpenAI API calls, retry logic, error handling  
✅ **Output Generation**: Report structure, content quality, file writing  
✅ **Effect-TS Patterns**: Service layers, error handling, Effect composition  

### Example Test

```typescript
it("processes real Discord Q&A data", async () => {
  const { finalState, reportText, metadata } = await withLiveRuntime(
    Effect.gen(function* () {
      const result = yield* Effect.promise(() =>
        app.invoke({
          inputFile: "../../packages/data/discord-qna.json",
          outputFile: "./output/test-report.txt",
        })
      );
      
      return { finalState: result, reportText: "...", metadata: { ... } };
    })
  );
  
  // Validate metadata
  expect(metadata.totalMessages).toBe(50);
  
  // Validate content
  expect(reportText).toContain("HttpApi");
  expect(reportText).toContain("error");
});
```

## Troubleshooting

### Common Issues

#### 1. **"Cannot find module 'langgraph'"**

**Symptom**: Import warning for langgraph  
**Cause**: Expected - langgraph may not be installed  
**Solution**: This is a non-blocking warning. The code uses dynamic imports and will work when langgraph is available.

```bash
# Optional: Install langgraph if needed
bun add langgraph
```

#### 2. **"Type 'unknown' is not assignable to..."**

**Symptom**: TypeScript error with Schema.Type inference  
**Cause**: Effect.Schema type inference edge case  
**Solution**: Type assertions are used with `@ts-expect-error` comments. This is expected and safe.

#### 3. **"LLMRateLimitError: Rate limit exceeded"**

**Symptom**: 429 errors from OpenAI API  
**Cause**: Too many requests to OpenAI  
**Solution**: The analyzer automatically retries with exponential backoff. For persistent issues:

```bash
# Reduce chunk size to make fewer API calls
export CHUNK_SIZE=100

# Increase retry delay (edit services.ts)
Schedule.exponential("2 seconds")  # instead of "1 second"
```

#### 4. **"ValidationError: Invalid message structure"**

**Symptom**: Schema validation fails  
**Cause**: Input JSON doesn't match expected format  
**Solution**: Verify your JSON structure:

```json
{
  "messages": [
    {
      "seqId": 1,
      "id": "msg_id",
      "content": "message text",
      "author": {
        "id": "user_id",
        "name": "username"
      },
      "timestamp": "2025-10-11T15:00:00.000Z"
    }
  ]
}
```

#### 5. **"Effect version mismatch"**

**Symptom**: Multiple Effect versions detected  
**Cause**: Global Effect installation conflicts with project version  
**Solution**: Remove global installation:

```bash
rm -rf ~/node_modules/effect
bun install  # Reinstall project dependencies
```

### Debug Mode

Enable detailed logging:

```typescript
// In graph.ts, add Effect.tapError for debugging
Effect.gen(function* () {
  // Your code
}).pipe(
  Effect.tapError(error => 
    Effect.sync(() => console.error("Debug:", error))
  )
);
```

### Performance Tips

1. **Optimize Chunk Size**: Larger chunks = fewer API calls but less granular analysis

   ```bash
   export CHUNK_SIZE=100  # Process more messages per chunk
   ```

2. **Disable Smart Chunking**: For faster processing (less accurate)

   ```bash
   export SMART_CHUNKING=false
   ```

3. **Use Cheaper Model**: For testing/development

   ```bash
   export MODEL_NAME=gpt-4o-mini  # Faster, cheaper
   ```

## Development

### Project Structure

```
scripts/analyzer/
├── graph.ts                    # LangGraph workflow
├── services.ts                 # LLM service
├── validation-service.ts       # Data validation
├── config-service.ts           # Configuration
├── chunking-service.ts         # Smart chunking
├── schemas.ts                  # Effect.Schema definitions
├── errors.ts                   # Tagged error types
├── README.md                   # This file
├── __tests__/
│   ├── graph.test.ts          # Integration tests
│   └── runtime.ts             # Test utilities
├── examples/
│   └── run-discord-analysis.ts # Usage example
└── test-data/
    └── mock-export.json       # Mock test data
```

### Adding New Features

1. **New Schema**: Add to `schemas.ts`

   ```typescript
   export const MySchema = Schema.struct({ ... });
   ```

2. **New Error**: Add to `errors.ts`

   ```typescript
   export class MyError extends Data.TaggedError("MyError")<{ ... }> {}
   ```

3. **New Service**: Create service file

   ```typescript
   export class MyService extends Effect.Service<MyService>()(
     "MyService",
     { effect: Effect.gen(function* () { ... }) }
   ) {}
   ```

4. **Update Graph**: Integrate in `graph.ts`

   ```typescript
   const layer = Layer.mergeAll(
     ExistingServices,
     MyService.Default
   );
   ```

### Code Style

- Follow Effect-TS patterns from `.github/copilot-instructions.md`
- Use `Effect.gen` for sequential operations
- Prefer direct imports: `import { Effect } from "effect"`
- Use tagged errors for type-safe error handling
- Add JSDoc comments for public APIs

### Running Examples

```bash
# Run the example script
cd scripts/analyzer
bun run examples/run-discord-analysis.ts
```

## License

Part of the Effect-Patterns project. See repository LICENSE file.

## Resources

- [Effect-TS Documentation](https://effect.website)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Effect-Patterns Repository](https://github.com/PaulJPhilp/Effect-Patterns)
