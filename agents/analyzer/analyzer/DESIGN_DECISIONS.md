# Design Decisions & Clarifications

## Overview

This document addresses specific design questions and implementation details raised
during the planning review. These decisions provide clarity for the implementation
phase.

---

## 1. Validation Failure Behavior

### Question
What is the intended behavior for the graph if validation fails? Does a validation
failure (e.g., `SchemaValidationError` or `InsufficientDataError`) immediately
terminate the graph and exit the process, or will it flow to a dedicated
error-handling node?

### Decision: Fail Fast with Clear Error Messages

**Approach:** Validation failures should **immediately terminate** the graph and
exit with a clear error message.

**Rationale:**
- **Data Quality First**: If the input data doesn't match the expected schema,
  continuing would produce unreliable results
- **Effect-TS Philosophy**: Explicit error handling - fail fast and fail clearly
- **User Experience**: Better to get immediate feedback about data issues than to
  discover problems after expensive LLM calls

**Implementation:**

```typescript
// In graph.ts - loadAndChunkData node
const nodes = {
  loadAndChunkData: async (state: GraphState) => {
    const program = Effect.gen(function* () {
      const fs = yield* FileSystem;
      const validation = yield* DataValidationService;
      
      // Read file
      const content = yield* fs.readFileString(state.inputFile).pipe(
        Effect.mapError(cause => new FileNotFoundError({ 
          path: state.inputFile,
          cause 
        }))
      );
      
      // Parse JSON
      const data = yield* Effect.try({
        try: () => JSON.parse(content),
        catch: (cause) => new InvalidJSONError({ 
          path: state.inputFile,
          cause 
        })
      });
      
      // Validate schema - FAIL FAST HERE
      const validated = yield* validation.validateMessages(data).pipe(
        Effect.mapError(errors => new SchemaValidationError({ 
          errors: Array.isArray(errors) 
            ? errors.map(e => e.message) 
            : [String(errors)]
        }))
      );
      
      // Check minimum message count
      const messages = yield* validation.validateMessageCount(
        validated.messages,
        1 // Minimum 1 message required
      );
      
      // If we get here, data is valid - proceed with chunking
      const chunking = yield* ChunkingService;
      const chunks = yield* chunking.chunkMessages(messages);
      
      yield* Effect.log({
        message: "Data validated and chunked successfully",
        messageCount: messages.length,
        chunkCount: chunks.length
      });
      
      return { chunks } satisfies Partial<GraphState>;
    });
    
    return await runEffect(program);
  },
};

// Error handling at the top level (CLI)
const runAnalysis = Effect.gen(function* () {
  const result = yield* Effect.tryPromise(() => app.invoke(initialState));
  return result;
}).pipe(
  Effect.catchTags({
    FileNotFoundError: (error) => 
      Effect.gen(function* () {
        yield* Effect.logError(`File not found: ${error.path}`);
        yield* Effect.logError("Please check the input file path.");
        return Effect.fail(error);
      }),
    
    InvalidJSONError: (error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Invalid JSON in: ${error.path}`);
        yield* Effect.logError("Please ensure the file contains valid JSON.");
        return Effect.fail(error);
      }),
    
    SchemaValidationError: (error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Data validation failed:");
        error.errors.forEach(err => 
          Effect.logError(`  - ${err}`).pipe(Effect.runSync)
        );
        yield* Effect.logError("\nExpected structure:");
        yield* Effect.logError("{ messages: [{ seqId, id, content, author, timestamp }] }");
        return Effect.fail(error);
      }),
    
    InsufficientDataError: (error) =>
      Effect.gen(function* () {
        yield* Effect.logError(
          `Insufficient data: found ${error.count} messages, need at least ${error.min}`
        );
        return Effect.fail(error);
      }),
  })
);
```

**Error Flow Diagram:**

```
Input File
    ↓
Read File ──[FileNotFoundError]──→ Log & Exit(1)
    ↓
Parse JSON ──[InvalidJSONError]──→ Log & Exit(1)
    ↓
Validate Schema ──[SchemaValidationError]──→ Log Details & Exit(1)
    ↓
Check Min Count ──[InsufficientDataError]──→ Log & Exit(1)
    ↓
Continue to Chunking
```

**Benefits:**
- Clear error messages guide users to fix data issues
- No wasted LLM API calls on invalid data
- Follows Effect-TS error handling best practices
- Easy to test error paths

---

## 2. Smart Chunking Logic for Q&A Pairs

### Question
How will the agent determine what constitutes a Q&A "pair"? Will it be based on
`seqId` proximity, author IDs, timestamps, or some combination?

### Decision: Multi-Signal Heuristic Approach

**Approach:** Use a **heuristic scoring system** that combines multiple signals to
identify Q&A relationships and keep them together.

**Signals to Consider:**

1. **Sequential `seqId`** (Primary Signal)
   - Messages with consecutive seqIds are likely related
   - Weight: HIGH

2. **Author Pattern** (Secondary Signal)
   - Question-Answer pattern: Different authors for consecutive messages
   - Same author in sequence: Likely continuation/clarification
   - Weight: MEDIUM

3. **Timestamp Proximity** (Tertiary Signal)
   - Messages within 5-10 minutes likely part of same discussion
   - Large gaps (>30 min) suggest topic change
   - Weight: LOW

4. **Content Pattern** (Bonus Signal)
   - Look for question indicators: "?", "how to", "is there"
   - Look for answer indicators: "you can", "try this", code blocks
   - Weight: LOW (nice-to-have)

**Implementation:**

```typescript
// chunking-service.ts

interface MessageWithMetadata {
  message: Message;
  isLikelyQuestion: boolean;
  isLikelyAnswer: boolean;
  relationshipScore: number;
}

export class ChunkingService extends Effect.Service<ChunkingService>()(
  "ChunkingService",
  {
    effect: Effect.gen(function* () {
      const config = yield* AnalyzerConfig;
      
      const analyzeMessage = (msg: Message): MessageWithMetadata => ({
        message: msg,
        isLikelyQuestion: msg.content.includes("?") || 
                          /how (do|to|can)|is there|what('s| is)|can i/i.test(msg.content),
        isLikelyAnswer: msg.content.length > 100 || // Longer responses
                        msg.content.includes("```") || // Code examples
                        /^(yes|no|you can|try|use|the answer)/i.test(msg.content),
        relationshipScore: 0
      });
      
      const calculateRelationshipScore = (
        current: MessageWithMetadata,
        previous: MessageWithMetadata
      ): number => {
        let score = 0;
        
        // Sequential seqId (strongest signal)
        if (current.message.seqId === previous.message.seqId + 1) {
          score += 100;
        } else if (current.message.seqId === previous.message.seqId + 2) {
          score += 50; // Allow for one intermediate message
        }
        
        // Q&A author pattern
        if (previous.isLikelyQuestion && current.isLikelyAnswer) {
          if (current.message.author.id !== previous.message.author.id) {
            score += 50; // Different author answering = strong relationship
          }
        }
        
        // Same author continuing
        if (current.message.author.id === previous.message.author.id) {
          score += 30; // Likely a continuation
        }
        
        // Timestamp proximity
        const prevTime = new Date(previous.message.timestamp).getTime();
        const currTime = new Date(current.message.timestamp).getTime();
        const minutesDiff = (currTime - prevTime) / (1000 * 60);
        
        if (minutesDiff <= 5) {
          score += 25; // Very close in time
        } else if (minutesDiff <= 15) {
          score += 10; // Moderately close
        } else if (minutesDiff > 30) {
          score -= 20; // Likely different conversation
        }
        
        return score;
      };
      
      const smartChunk = (messages: Message[], targetSize: number): Message[][] => {
        if (messages.length === 0) return [];
        if (messages.length <= targetSize) return [messages];
        
        const analyzed = messages.map(analyzeMessage);
        const chunks: Message[][] = [];
        let currentChunk: Message[] = [analyzed[0].message];
        
        for (let i = 1; i < analyzed.length; i++) {
          const relationshipScore = calculateRelationshipScore(
            analyzed[i],
            analyzed[i - 1]
          );
          
          analyzed[i].relationshipScore = relationshipScore;
          
          // Decision logic
          const shouldBreakChunk = 
            currentChunk.length >= targetSize && relationshipScore < 75;
          
          if (shouldBreakChunk) {
            // Start new chunk
            chunks.push(currentChunk);
            currentChunk = [analyzed[i].message];
          } else {
            // Add to current chunk (even if over target size, to keep pairs together)
            currentChunk.push(analyzed[i].message);
            
            // But if we're WAY over, and score is low, break anyway
            if (currentChunk.length > targetSize * 1.5 && relationshipScore < 50) {
              chunks.push(currentChunk);
              currentChunk = [];
            }
          }
        }
        
        // Add final chunk
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
        }
        
        return chunks;
      };
      
      return ChunkingService.of({
        chunkMessages: (messages: Message[]) =>
          Effect.gen(function* () {
            const chunkSize = yield* config.getChunkSize();
            const useSmartChunking = yield* config.getSmartChunking();
            
            const chunks = useSmartChunking
              ? smartChunk(messages, chunkSize)
              : simpleChunk(messages, chunkSize);
            
            yield* Effect.log({
              message: "Chunking complete",
              totalMessages: messages.length,
              chunkCount: chunks.length,
              averageChunkSize: Math.round(messages.length / chunks.length),
              strategy: useSmartChunking ? "smart" : "simple"
            });
            
            return chunks;
          })
      });
    }),
    dependencies: [AnalyzerConfig.Default]
  }
) {}

const simpleChunk = (messages: Message[], chunkSize: number): Message[][] => {
  const chunks: Message[][] = [];
  for (let i = 0; i < messages.length; i += chunkSize) {
    chunks.push(messages.slice(i, i + chunkSize));
  }
  return chunks;
};
```

**Configuration:**

```typescript
// In config-service.ts
const AnalyzerConfigLive = Layer.effect(
  AnalyzerConfig,
  Effect.gen(function* () {
    const chunkSize = yield* Config.number("CHUNK_SIZE").pipe(
      Config.withDefault(50)
    );
    const smartChunking = yield* Config.boolean("SMART_CHUNKING").pipe(
      Config.withDefault(true)
    );
    const minRelationshipScore = yield* Config.number("MIN_RELATIONSHIP_SCORE").pipe(
      Config.withDefault(75)
    );
    
    return AnalyzerConfig.of({
      getChunkSize: () => Effect.succeed(chunkSize),
      getSmartChunking: () => Effect.succeed(smartChunking),
      getMinRelationshipScore: () => Effect.succeed(minRelationshipScore),
      // ... other config
    });
  })
);
```

**Testing Strategy:**

```typescript
// Test cases for chunking
describe("ChunkingService", () => {
  it("keeps consecutive seqIds together", () => {
    const messages = [
      { seqId: 1, content: "How do I use layers?", author: { id: "u1" } },
      { seqId: 2, content: "You can use Layer.provide", author: { id: "u2" } },
      { seqId: 3, content: "Thanks!", author: { id: "u1" } },
    ];
    // Should create 1 chunk with all 3 messages
  });
  
  it("splits on low relationship scores", () => {
    const messages = [
      { seqId: 1, content: "Question A?", author: { id: "u1" }, timestamp: "10:00" },
      { seqId: 2, content: "Answer A", author: { id: "u2" }, timestamp: "10:01" },
      { seqId: 10, content: "Unrelated topic", author: { id: "u3" }, timestamp: "11:30" },
    ];
    // Should create 2 chunks (seqId gap + time gap)
  });
});
```

**Benefits:**
- Preserves conversation context
- Flexible and tunable via environment variables
- Gracefully degrades to simple chunking if disabled
- Testable with clear scoring logic

---

## 3. Structured JSON Output from LLM

### Question
Have you considered using function/tool calling to enforce a structured JSON output?

### Decision: Yes - Use Structured Outputs with Zod Schema

**Approach:** Use OpenAI's **structured outputs** feature (or function calling) to
enforce a JSON schema for partial analyses.

**Rationale:**
- More reliable parsing (no markdown parsing errors)
- Type-safe aggregation
- Easier to test and validate
- Better composability

**Implementation:**

```typescript
// schemas.ts - Add analysis schemas
import { Schema } from "@effect/schema";

export const PartialAnalysisSchema = Schema.Struct({
  chunkId: Schema.Number,
  messageCount: Schema.Number,
  commonQuestions: Schema.Array(Schema.String),
  effectPatterns: Schema.Array(Schema.Struct({
    pattern: Schema.String,
    description: Schema.String,
    exampleMessageIds: Schema.Array(Schema.String),
  })),
  painPoints: Schema.Array(Schema.String),
  bestPractices: Schema.Array(Schema.String),
  codeExamples: Schema.Array(Schema.Struct({
    pattern: Schema.String,
    code: Schema.String,
    context: Schema.String,
  })),
});

export type PartialAnalysis = Schema.Schema.Type<typeof PartialAnalysisSchema>;

// services.ts - Update LLM service
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const PartialAnalysisZod = z.object({
  chunkId: z.number(),
  messageCount: z.number(),
  commonQuestions: z.array(z.string()),
  effectPatterns: z.array(z.object({
    pattern: z.string(),
    description: z.string(),
    exampleMessageIds: z.array(z.string()),
  })),
  painPoints: z.array(z.string()),
  bestPractices: z.array(z.string()),
  codeExamples: z.array(z.object({
    pattern: z.string(),
    code: z.string(),
    context: z.string(),
  })),
});

export const LLMServiceLive = Layer.effect(
  LLMService,
  Effect.gen(function* () {
    const config = yield* AnalyzerConfig;
    const modelName = yield* config.getModelName();
    const temperature = yield* config.getTemperature();
    
    const llm = new ChatOpenAI({ 
      model: modelName,
      temperature 
    });
    
    return LLMService.of({
      analyzeChunk: (chunk: Message[], chunkId: number) =>
        Effect.tryPromise({
          try: async () => {
            const response = await llm.invoke(
              [
                {
                  role: "system",
                  content: `You are an expert in Effect-TS analyzing Discord Q&A.
Extract structured information about Effect patterns, questions, and solutions.`
                },
                {
                  role: "user",
                  content: `Analyze these Effect-TS messages (chunk ${chunkId}):
                  
${JSON.stringify(chunk, null, 2)}

Identify:
1. Common questions being asked
2. Effect patterns discussed (services, layers, errors, schema, http/rpc)
3. Developer pain points
4. Best practices and solutions
5. Code examples with context`
                }
              ],
              {
                response_format: zodResponseFormat(
                  PartialAnalysisZod,
                  "partial_analysis"
                )
              }
            );
            
            const parsed = JSON.parse(response.content as string);
            return { ...parsed, chunkId, messageCount: chunk.length };
          },
          catch: (cause) => new LLMError({ cause }),
        }).pipe(
          Effect.retry({
            schedule: Schedule.exponential("1 second").pipe(
              Schedule.union(Schedule.recurs(3))
            ),
          }),
          Effect.timeout("30 seconds")
        ),
      
      aggregateAnalyses: (analyses: PartialAnalysis[]) =>
        Effect.tryPromise({
          try: async () => {
            const response = await llm.invoke([
              {
                role: "system",
                content: "You are synthesizing Effect-TS Q&A analysis into a final report."
              },
              {
                role: "user",
                content: `Create a comprehensive markdown report from these partial analyses:

${JSON.stringify(analyses, null, 2)}

Structure the report with:
# Effect-TS Discord Q&A Analysis

## Executive Summary
(High-level findings)

## Common Questions & Topics
(Aggregate all commonQuestions)

## Effect Patterns Discussed
(Organize by pattern type: Services, Layers, Errors, Schema, HTTP/RPC)

## Developer Pain Points
(Aggregate painPoints)

## Best Practices & Solutions
(Aggregate bestPractices)

## Code Pattern Examples
(Select the most illustrative codeExamples)

## Recommendations
(Suggestions for documentation improvements)`
              }
            ]);
            
            return response.content as string;
          },
          catch: (cause) => new LLMError({ cause }),
        })
    });
  })
);
```

**Benefits:**
- **Type Safety**: Structured data from chunk analysis
- **Reliability**: No markdown parsing errors
- **Composability**: Easy to add new fields
- **Validation**: Automatic via Zod schema
- **Testing**: Easy to mock structured responses

**Trade-offs:**
- Requires OpenAI's structured output (GPT-4 or newer)
- Slightly more complex setup
- **Worth it** for production reliability

---

## Summary of Decisions

| Question | Decision | Key Benefit |
|----------|----------|-------------|
| **Validation Failure** | Fail fast with clear errors | Data quality first, better UX |
| **Smart Chunking** | Multi-signal heuristic (seqId + author + time) | Preserves Q&A context |
| **LLM Output** | Structured JSON with Zod schema | Type-safe, reliable, testable |

## Next Steps

With these decisions clarified:

1. **Start with Phase 1.1** - Create schemas (now including `PartialAnalysisSchema`)
2. **Implement validation** with fail-fast error handling
3. **Build chunking service** with the multi-signal heuristic
4. **Update LLM service** to use structured outputs

All design decisions are documented and ready for implementation!
