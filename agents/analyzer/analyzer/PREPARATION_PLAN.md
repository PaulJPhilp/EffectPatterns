# Analyzer Agent Test Preparation Plan

## Executive Summary

This plan outlines the steps needed to prepare the analyzer agent in `scripts/analyzer/` to work with the real Discord Q&A data in `packages/data/discord-qna.json`.

## Current State Analysis

### Analyzer Agent Architecture
- **Location**: `scripts/analyzer/`
- **Framework**: LangGraph + Effect-TS
- **LLM**: OpenAI GPT-4o
- **Key Files**:
  - `graph.ts` - LangGraph workflow definition
  - `services.ts` - LLM service layer
  - `analyzer.ts` - CLI entry point
  - `__tests__/graph.test.ts` - Test suite

### Data Sources

#### Test Data (`scripts/analyzer/test-data/mock-export.json`)
- 53 simple messages
- Basic structure: id, content, author, timestamp
- Works with current implementation

#### Real Data (`packages/data/discord-qna.json`)
- **50 messages** of Effect-TS Q&A
- **Richer schema**: includes `seqId`, detailed author info
- Technical discussions about Effect patterns
- Not yet tested with the analyzer

### Identified Gaps

1. ❌ **Schema Mismatch**: Agent uses `z.any()` - no validation of message structure
2. ❌ **Chunk Size Issue**: Fixed at 200 messages, but real data only has 50
3. ❌ **Generic Prompts**: Current prompts too vague for Effect-TS Q&A analysis
4. ❌ **Limited Error Handling**: Basic error handling, no retry logic
5. ❌ **No Configuration**: Hardcoded values, no environment-based config
6. ❌ **Minimal Logging**: Hard to debug or track progress
7. ❌ **No Real Data Tests**: Only tested with mock data
8. ❌ **Missing Documentation**: No README for the analyzer

## Preparation Steps

### 1. Define Proper Data Schemas ✨

**Goal**: Replace `z.any()` with proper Effect.Schema validation

**Files to Create/Modify**:
- Create `scripts/analyzer/schemas.ts`
- Update `graph.ts` to use typed schemas

**Schema Structure**:
```typescript
// Author schema
const AuthorSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});

// Message schema
const MessageSchema = Schema.Struct({
  seqId: Schema.Number,
  id: Schema.String,
  content: Schema.String,
  author: AuthorSchema,
  timestamp: Schema.String,
});

// Collection schema
const MessageCollectionSchema = Schema.Struct({
  messages: Schema.Array(MessageSchema),
});
```

**Benefits**:
- Type-safe message handling
- Runtime validation of input data
- Better error messages for malformed data

### 2. Add Data Validation Service 🛡️

**Goal**: Validate input JSON before processing

**Files to Create/Modify**:
- Create `scripts/analyzer/validation-service.ts`
- Add to layer composition in `graph.ts`

**Features**:
```typescript
export class DataValidationService extends Effect.Service<DataValidationService>()(
  "DataValidationService",
  {
    effect: Effect.gen(function* () {
      return {
        validateMessages: (data: unknown) =>
          Schema.decode(MessageCollectionSchema)(data),
        validateMessageCount: (messages: Message[], min: number) =>
          messages.length >= min
            ? Effect.succeed(messages)
            : Effect.fail(new InsufficientDataError({ count: messages.length, min })),
      };
    }),
  }
) {}
```

**Error Types**:
- `InvalidJSONError`
- `SchemaValidationError`
- `InsufficientDataError`

### 3. Improve LLM Prompts for Effect-TS 🎯

**Goal**: Make analysis specific to Effect-TS technical Q&A

**Files to Modify**:
- `scripts/analyzer/services.ts` - Update prompts

**New Prompts**:

**For Chunk Analysis**:
```typescript
const CHUNK_ANALYSIS_PROMPT = `
Analyze this chunk of Effect-TS Discord Q&A messages and identify:

1. **Common Questions**: What problems are developers trying to solve?
2. **Key Patterns**: Which Effect patterns are being discussed (services, layers, errors, etc.)?
3. **Pain Points**: What concepts seem to confuse developers?
4. **Best Practices**: What solutions or patterns are recommended?
5. **Code Examples**: Note any significant code snippets or patterns shown

Format your analysis with clear sections and bullet points.

Messages to analyze:
${JSON.stringify(chunk, null, 2)}
`;
```

**For Aggregation**:
```typescript
const AGGREGATION_PROMPT = `
You have received partial analyses of Effect-TS Q&A discussions.
Create a comprehensive final report that includes:

## Executive Summary
Brief overview of the most important findings

## Common Questions & Topics
Most frequently asked questions and discussion topics

## Effect Patterns Discussed
- Service patterns
- Layer composition
- Error handling
- Schema usage
- HTTP/RPC APIs
- Other patterns

## Developer Pain Points
What concepts or patterns cause the most confusion?

## Best Practices & Solutions
Recommended patterns and solutions from the community

## Code Pattern Examples
Key code patterns that were shared (summarize, don't copy verbatim)

## Recommendations
Suggestions for documentation or learning resources based on the questions

Partial analyses:
${JSON.stringify(analyses, null, 2)}
`;
```

### 4. Make Chunking Strategy Configurable ⚙️

**Goal**: Adaptive chunking that respects Q&A context

**Files to Modify**:
- Create `scripts/analyzer/chunking-service.ts`
- Update `graph.ts` to use new service

**Features**:
```typescript
export class ChunkingService extends Effect.Service<ChunkingService>()(
  "ChunkingService",
  {
    effect: Effect.gen(function* () {
      const config = yield* ConfigService;
      
      return {
        chunkMessages: (messages: Message[]) =>
          Effect.gen(function* () {
            const chunkSize = yield* config.getChunkSize();
            const smartChunking = yield* config.getSmartChunking();
            
            if (smartChunking) {
              // Keep Q&A pairs together based on seqId proximity
              return yield* smartChunk(messages, chunkSize);
            } else {
              return simpleChunk(messages, chunkSize);
            }
          }),
      };
    }),
  }
) {}
```

**Smart Chunking Logic**:
- Try to keep related messages (sequential seqIds) together
- Avoid splitting obvious Q&A pairs
- Adjust size based on total message count

### 5. Enhance Error Handling 🚨

**Goal**: Comprehensive error handling with retries

**Files to Create/Modify**:
- Update `scripts/analyzer/services.ts`
- Create `scripts/analyzer/errors.ts`

**Error Types**:
```typescript
export class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
  path: string;
}> {}

export class InvalidJSONError extends Data.TaggedError("InvalidJSONError")<{
  path: string;
  cause: unknown;
}> {}

export class SchemaValidationError extends Data.TaggedError("SchemaValidationError")<{
  errors: Array<string>;
}> {}

export class LLMTimeoutError extends Data.TaggedError("LLMTimeoutError")<{
  duration: number;
}> {}

export class LLMRateLimitError extends Data.TaggedError("LLMRateLimitError")<{
  retryAfter?: number;
}> {}
```

**Retry Strategy**:
```typescript
const analyzeWithRetry = (chunk: Message[]) =>
  llm.analyzeChunk(chunk).pipe(
    Effect.retry({
      schedule: Schedule.exponential("1 second").pipe(
        Schedule.union(Schedule.recurs(3))
      ),
    }),
    Effect.timeout("30 seconds"),
  );
```

### 6. Add Configuration Layer ⚙️

**Goal**: Environment-based configuration

**Files to Create**:
- `scripts/analyzer/config-service.ts`

**Configuration Schema**:
```typescript
export class AnalyzerConfig extends Effect.Service<AnalyzerConfig>()(
  "AnalyzerConfig",
  {
    effect: Effect.gen(function* () {
      const openaiKey = yield* Config.string("OPENAI_API_KEY");
      const chunkSize = yield* Config.number("CHUNK_SIZE").pipe(
        Config.withDefault(50)
      );
      const modelName = yield* Config.string("MODEL_NAME").pipe(
        Config.withDefault("gpt-4o")
      );
      const temperature = yield* Config.number("TEMPERATURE").pipe(
        Config.withDefault(0)
      );
      const smartChunking = yield* Config.boolean("SMART_CHUNKING").pipe(
        Config.withDefault(true)
      );
      
      return {
        getOpenAIKey: () => Effect.succeed(openaiKey),
        getChunkSize: () => Effect.succeed(chunkSize),
        getModelName: () => Effect.succeed(modelName),
        getTemperature: () => Effect.succeed(temperature),
        getSmartChunking: () => Effect.succeed(smartChunking),
      };
    }),
  }
) {}
```

### 7. Improve Logging and Observability 📊

**Goal**: Better visibility into analysis process

**Files to Modify**:
- Update all service files with structured logging

**Logging Strategy**:
```typescript
// In loadAndChunkData
yield* Effect.log({
  level: "info",
  message: "Loading data",
  context: {
    inputFile: state.inputFile,
    timestamp: new Date().toISOString(),
  },
});

yield* Effect.log({
  level: "info",
  message: "Data loaded and chunked",
  context: {
    totalMessages: messages.length,
    chunkCount: chunks.length,
    averageChunkSize: messages.length / chunks.length,
  },
});
```

**Metrics to Track**:
- Total messages processed
- Number of chunks created
- Processing time per chunk
- Total processing time
- LLM token usage (if available from API)

### 8. Create Test with Real Data 🧪

**Goal**: Verify analyzer works with discord-qna.json

**Files to Create/Modify**:
- Update `scripts/analyzer/__tests__/graph.test.ts`

**Test Case**:
```typescript
describeLive("Discord Q&A Analysis", () => {
  it("analyzes real discord-qna.json data", async () => {
    const { finalState, reportText } = await withLiveRuntime(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        const path = yield* Path;
        
        const inputPath = path.resolve(
          process.cwd(),
          "packages",
          "data",
          "discord-qna.json"
        );
        
        const tempDir = yield* fs.makeTempDirectoryScoped();
        const outputPath = path.join(tempDir, "discord-analysis.txt");
        
        const graphState = (yield* Effect.promise(() =>
          app.invoke({
            inputFile: inputPath,
            outputFile: outputPath,
          })
        )) as GraphState;
        
        const reportText = yield* fs.readFileString(outputPath);
        
        return {
          finalState: graphState,
          reportText,
        };
      })
    );
    
    // Assertions
    expect(finalState.chunks?.length).toBeGreaterThan(0);
    expect(finalState.partialAnalyses?.length).toBeGreaterThan(0);
    expect(reportText).toContain("Effect-TS");
    expect(reportText).toContain("Common Questions");
    expect(reportText).toContain("Patterns");
  });
});
```

### 9. Add Analyzer Documentation 📚

**Goal**: Comprehensive README for using the analyzer

**Files to Create**:
- `scripts/analyzer/README.md`

**Sections**:
- Overview and purpose
- Prerequisites (Node, Bun, OpenAI API key)
- Installation and setup
- Environment variables
- Usage examples
- Output format
- Troubleshooting
- Development and testing

### 10. Create Runnable Example Script 🎬

**Goal**: Easy-to-run example for testing

**Files to Create**:
- `scripts/analyzer/examples/run-discord-analysis.ts`

**Example Script**:
```typescript
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { app } from "../graph.js";
import { AnalyzerConfigLive } from "../config-service.js";
import { LLMServiceLive } from "../services.js";

const MainLayer = Layer.mergeAll(
  NodeContext.layer,
  AnalyzerConfigLive,
  LLMServiceLive
);

const runAnalysis = Effect.gen(function* () {
  yield* Effect.log("Starting Discord Q&A analysis...");
  
  const result = yield* Effect.tryPromise(() =>
    app.invoke({
      inputFile: "./packages/data/discord-qna.json",
      outputFile: "./output/discord-analysis.txt",
    })
  );
  
  yield* Effect.log("Analysis complete!");
  yield* Effect.log(`Report saved to: ${result.outputFile}`);
}).pipe(
  Effect.provide(MainLayer),
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError("Analysis failed:");
      yield* Effect.logError(JSON.stringify(error, null, 2));
      return Effect.fail(error);
    })
  )
);

NodeRuntime.runMain(runAnalysis);
```

## Implementation Order

### Phase 1: Foundation (High Priority)
1. ✅ Define proper data schemas
2. ✅ Add data validation service
3. ✅ Add configuration layer
4. ✅ Enhance error handling

### Phase 2: Optimization (Medium Priority)
5. ✅ Improve LLM prompts
6. ✅ Make chunking configurable
7. ✅ Improve logging

### Phase 3: Testing & Documentation (Medium Priority)
8. ✅ Create test with real data
9. ✅ Add analyzer README
10. ✅ Create runnable example

## Success Criteria

- [ ] Analyzer successfully processes `packages/data/discord-qna.json`
- [ ] Output report contains meaningful Effect-TS insights
- [ ] All tests pass with real data
- [ ] Error handling catches and reports issues clearly
- [ ] Configuration allows easy customization
- [ ] Documentation enables new users to run the analyzer
- [ ] Code follows Effect-TS patterns from copilot-instructions.md

## Environment Setup

### Required Environment Variables
```bash
# Required
OPENAI_API_KEY=sk-... # Your OpenAI API key

# Optional (with defaults)
CHUNK_SIZE=50
MODEL_NAME=gpt-4o
TEMPERATURE=0
SMART_CHUNKING=true
```

### Installation
```bash
cd scripts/analyzer
bun install
```

### Running Tests
```bash
# Requires OPENAI_API_KEY
bun test
```

### Running Analysis
```bash
bun run analyzer \
  --input ../../packages/data/discord-qna.json \
  --output ./output/analysis.txt
```

## Next Steps

After completing this preparation plan:

1. **Validate Output Quality**: Review generated reports for accuracy and usefulness
2. **Optimize Prompts**: Iterate on prompts based on output quality
3. **Scale Testing**: Test with larger datasets if available
4. **Integration**: Integrate analyzer into CI/CD pipeline if desired
5. **Monitoring**: Add production monitoring if deployed

## References

- Effect-TS Documentation: https://effect.website
- LangGraph Documentation: https://langchain-ai.github.io/langgraph/
- OpenAI API Documentation: https://platform.openai.com/docs
- Project Patterns: `.github/copilot-instructions.md`
