# Analyzer Agent Architecture

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Analyzer CLI                            │
│                    (analyzer.ts)                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   LangGraph Workflow                         │
│                     (graph.ts)                               │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Load & Chunk │─▶│ Analyze Chunk│─▶│  Aggregate   │     │
│  │     Data     │  │  (per chunk) │  │   Results    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Effect Services                           │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │           LLMService (services.ts)                │       │
│  │  - analyzeChunk(chunk)                            │       │
│  │  - aggregateAnalyses(analyses)                    │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │        FileSystem (from @effect/platform)         │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               OpenAI GPT-4 API                               │
└─────────────────────────────────────────────────────────────┘
```

## Proposed Architecture (After Improvements)

```
┌─────────────────────────────────────────────────────────────┐
│                      Analyzer CLI                            │
│                    (analyzer.ts)                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Configuration Layer                          │
│              (config-service.ts)                             │
│  - OPENAI_API_KEY, chunk size, model, temperature           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   LangGraph Workflow                         │
│                     (graph.ts)                               │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Validate   │  │  Load & Chunk│  │ Analyze Chunk│     │
│  │    Input     │─▶│     Data     │─▶│  (per chunk) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                │              │
│                                                ▼              │
│                                       ┌──────────────┐       │
│                                       │  Aggregate   │       │
│                                       │   Results    │       │
│                                       └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Effect Services                           │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │     DataValidationService (validation-service.ts) │       │
│  │  - validateMessages(data)                         │       │
│  │  - validateMessageCount(messages, min)            │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │      ChunkingService (chunking-service.ts)        │       │
│  │  - chunkMessages(messages)                        │       │
│  │  - smartChunk() // keeps Q&A pairs together       │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │           LLMService (services.ts)                │       │
│  │  - analyzeChunk(chunk) // with retry logic        │       │
│  │  - aggregateAnalyses(analyses)                    │       │
│  │  - Effect-TS specific prompts                     │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │        FileSystem (from @effect/platform)         │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               OpenAI GPT-4 API                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Input: discord-qna.json
```json
{
  "messages": [
    {
      "seqId": 1,
      "id": "msg_id",
      "content": "How do I use HttpApi?",
      "author": { "id": "user1", "name": "alice" },
      "timestamp": "2025-10-11T15:00:00.000Z"
    },
    // ... 49 more messages
  ]
}
```

### Processing Steps

1. **Validation** (NEW)
   ```
   Raw JSON → MessageCollectionSchema → Validated Messages
   └─ Catches: Invalid JSON, missing fields, wrong types
   ```

2. **Chunking** (IMPROVED)
   ```
   50 messages → Smart Chunking → [Chunk1, Chunk2, ...]
   └─ Keeps Q&A pairs together
   └─ Configurable size (default: 50)
   ```

3. **Analysis** (IMPROVED)
   ```
   Each Chunk → LLM Analysis → Partial Analysis
   └─ Effect-TS specific prompts
   └─ Retry on failure (3x with exponential backoff)
   └─ 30s timeout
   ```

4. **Aggregation** (IMPROVED)
   ```
   [Analysis1, Analysis2, ...] → Final Report
   └─ Structured sections
   └─ Effect-TS insights
   ```

### Output: analysis.txt
```
# Effect-TS Discord Q&A Analysis

## Executive Summary
...

## Common Questions & Topics
- HttpApi vs HttpRouter usage
- Error handling with multiple error types
- Service composition and layers
...

## Effect Patterns Discussed
### Services
- Effect.Service pattern
- Dependency injection
...

### Error Handling
- TaggedError pattern
- catchTags usage
...
```

## Error Handling Flow

```
┌─────────────────┐
│  File Read      │
└────┬────────────┘
     │
     ▼ (catch)
┌─────────────────┐
│FileNotFoundError│──▶ Log & Exit
└─────────────────┘

┌─────────────────┐
│  JSON Parse     │
└────┬────────────┘
     │
     ▼ (catch)
┌─────────────────┐
│InvalidJSONError │──▶ Log & Exit
└─────────────────┘

┌─────────────────┐
│ Schema Validate │
└────┬────────────┘
     │
     ▼ (catch)
┌─────────────────────┐
│SchemaValidationError│──▶ Log Details & Exit
└─────────────────────┘

┌─────────────────┐
│  LLM Call       │
└────┬────────────┘
     │
     ▼ (catch & retry 3x)
┌─────────────────┐
│  LLMTimeout     │──▶ Retry or Exit
│  LLMRateLimit   │
└─────────────────┘
```

## Service Dependencies

```
AnalyzerConfig
    │
    ├──▶ LLMService
    │       └──▶ OpenAI Client
    │
    ├──▶ DataValidationService
    │       └──▶ MessageSchema
    │
    ├──▶ ChunkingService
    │       └──▶ AnalyzerConfig
    │
    └──▶ FileSystem
            └──▶ NodeContext
```

## Layer Composition

```typescript
const AnalyzerLayers = Layer.mergeAll(
  NodeContext.layer,
  AnalyzerConfigLive,      // NEW
  DataValidationLive,      // NEW
  ChunkingServiceLive,     // NEW
  LLMServiceLive,
);

const program = Effect.gen(function* () {
  // Your analyzer logic
}).pipe(Effect.provide(AnalyzerLayers));
```

## Testing Strategy

### Unit Tests
- Schema validation (valid/invalid messages)
- Chunking logic (various sizes, Q&A pairing)
- Error handling (each error type)

### Integration Tests
- Mock data test (existing)
- Real data test (NEW)
  - Input: packages/data/discord-qna.json
  - Verify: Output structure and content

### Manual Testing
- Run with various chunk sizes
- Test with missing API key
- Test with malformed JSON
- Verify output quality

## Performance Considerations

### Current
- 50 messages → ~1 chunk → 1 LLM call → ~5-10s
- No batching or parallel processing

### Future Optimizations
- Parallel chunk processing (if multiple chunks)
- Streaming responses for large reports
- Caching LLM responses for repeated runs
- Token usage tracking and optimization
