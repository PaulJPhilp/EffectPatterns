# Analyzer Test Preparation - Implementation Checklist

## Pre-Implementation

- [ ] Review `PREPARATION_PLAN.md` for full context
- [ ] Review `ARCHITECTURE.md` for system design
- [ ] Ensure `OPENAI_API_KEY` is set in environment
- [ ] Current directory: `scripts/analyzer/`

## Phase 1: Foundation (Estimated: 2-3 hours)

### 1.1 Create Schema Definitions

- [ ] Create `scripts/analyzer/schemas.ts`
- [ ] Define `AuthorSchema`
- [ ] Define `MessageSchema` with seqId, id, content, author, timestamp
- [ ] Define `MessageCollectionSchema`
- [ ] Export type aliases from schemas
- [ ] Add JSDoc comments

**Validation**:
```bash
# Should compile without errors
bun run tsc --noEmit schemas.ts
```

### 1.2 Create Error Types

- [ ] Create `scripts/analyzer/errors.ts`
- [ ] Define `FileNotFoundError`
- [ ] Define `InvalidJSONError`
- [ ] Define `SchemaValidationError`
- [ ] Define `LLMTimeoutError`
- [ ] Define `LLMRateLimitError`
- [ ] Define `InsufficientDataError`
- [ ] Export all error types

**Validation**:
```bash
# Should compile and show no errors
bun run tsc --noEmit errors.ts
```

### 1.3 Create Validation Service

- [ ] Create `scripts/analyzer/validation-service.ts`
- [ ] Import schemas from `schemas.ts`
- [ ] Implement `DataValidationService` with `Effect.Service` pattern
- [ ] Add `validateMessages` method
- [ ] Add `validateMessageCount` method
- [ ] Create `DataValidationServiceLive` layer
- [ ] Add comprehensive error handling

**Validation**:
```typescript
// Test in a scratch file
const result = yield* DataValidationService.validateMessages(testData);
```

### 1.4 Create Configuration Service

- [ ] Create `scripts/analyzer/config-service.ts`
- [ ] Define `AnalyzerConfig` service
- [ ] Add config for: `OPENAI_API_KEY`, `CHUNK_SIZE`, `MODEL_NAME`, etc.
- [ ] Use `Effect.Config` for environment variables
- [ ] Set sensible defaults
- [ ] Create `AnalyzerConfigLive` layer

**Validation**:
```bash
# Test config loading
CHUNK_SIZE=25 bun run test-config.ts
```

### 1.5 Update LLM Service with Error Handling

- [ ] Open `scripts/analyzer/services.ts`
- [ ] Import error types from `errors.ts`
- [ ] Add retry logic with `Effect.retry`
- [ ] Add timeout with `Effect.timeout`
- [ ] Update error types in service signature
- [ ] Add structured logging

**Validation**:
```bash
# Existing tests should still pass
bun test
```

## Phase 2: Optimization (Estimated: 2-3 hours)

### 2.1 Improve LLM Prompts

- [ ] Open `scripts/analyzer/services.ts`
- [ ] Create `CHUNK_ANALYSIS_PROMPT` constant
- [ ] Update prompt to be Effect-TS specific
- [ ] Create `AGGREGATION_PROMPT` constant
- [ ] Update aggregation prompt with structured sections
- [ ] Replace inline prompts with constants

**Validation**:
```bash
# Run with verbose logging to see prompts
DEBUG=* bun run analyzer --input test-data/mock-export.json --output /tmp/test.txt
```

### 2.2 Create Chunking Service

- [ ] Create `scripts/analyzer/chunking-service.ts`
- [ ] Define `ChunkingService` with `Effect.Service` pattern
- [ ] Implement `chunkMessages` method
- [ ] Add smart chunking logic (keep Q&A pairs together)
- [ ] Make chunk size configurable via `AnalyzerConfig`
- [ ] Create `ChunkingServiceLive` layer
- [ ] Add logging for chunk statistics

**Validation**:
```typescript
// Test chunking logic
const chunks = yield* ChunkingService.chunkMessages(messages);
console.log(`Created ${chunks.length} chunks`);
```

### 2.3 Add Structured Logging

- [ ] Update `scripts/analyzer/graph.ts`
- [ ] Add structured logs to `loadAndChunkData`
- [ ] Add structured logs to `analyzeSingleChunk`
- [ ] Add structured logs to `aggregateResults`
- [ ] Include metrics: message count, chunk count, processing time

**Validation**:
```bash
# Should see detailed logs
bun run analyzer --input test-data/mock-export.json --output /tmp/test.txt 2>&1 | grep "chunk"
```

### 2.4 Update Graph to Use New Services

- [ ] Open `scripts/analyzer/graph.ts`
- [ ] Import new services
- [ ] Update `AnalysisLayer` to include all services
- [ ] Update `loadAndChunkData` to use `DataValidationService`
- [ ] Update `loadAndChunkData` to use `ChunkingService`
- [ ] Update error handling in all nodes
- [ ] Replace `z.any()` with proper types from schemas

**Validation**:
```bash
# Full integration test
bun test
```

## Phase 3: Testing & Documentation (Estimated: 1-2 hours)

### 3.1 Add Real Data Test

- [ ] Open `scripts/analyzer/__tests__/graph.test.ts`
- [ ] Add new test: "analyzes real discord-qna.json data"
- [ ] Use `packages/data/discord-qna.json` as input
- [ ] Assert on output structure and content
- [ ] Check for Effect-TS specific terms in output

**Validation**:
```bash
# Run the new test
OPENAI_API_KEY=sk-... bun test --filter "real discord"
```

### 3.2 Create Analyzer README

- [ ] Create `scripts/analyzer/README.md`
- [ ] Add overview and purpose
- [ ] Document prerequisites
- [ ] Add installation instructions
- [ ] Document all environment variables
- [ ] Add usage examples
- [ ] Document output format
- [ ] Add troubleshooting section

**Validation**:
- [ ] Have someone else read it and try to run the analyzer

### 3.3 Create Runnable Example

- [ ] Create `scripts/analyzer/examples/` directory
- [ ] Create `scripts/analyzer/examples/run-discord-analysis.ts`
- [ ] Import necessary services and layers
- [ ] Implement full analysis flow with error handling
- [ ] Add helpful logging
- [ ] Make paths configurable

**Validation**:
```bash
# Should run successfully
OPENAI_API_KEY=sk-... bun run examples/run-discord-analysis.ts
```

## Final Verification

### Code Quality

- [ ] All TypeScript compiles without errors
- [ ] No lint errors (run `bun run lint`)
- [ ] All tests pass
- [ ] Follow Effect-TS patterns from `.github/copilot-instructions.md`
- [ ] Proper use of `Effect.Service` pattern
- [ ] Tagged errors for all error cases
- [ ] Layer-based dependency injection

### Functionality

- [ ] Analyzer processes `packages/data/discord-qna.json` successfully
- [ ] Output contains Effect-TS specific insights
- [ ] Error messages are clear and actionable
- [ ] Configuration works via environment variables
- [ ] Logging provides useful debugging information

### Testing

- [ ] Unit tests pass for schemas
- [ ] Unit tests pass for validation service
- [ ] Unit tests pass for chunking service
- [ ] Integration test with mock data passes
- [ ] Integration test with real data passes
- [ ] Error handling tests cover all error types

### Documentation

- [ ] README is complete and accurate
- [ ] Code has JSDoc comments
- [ ] Example script works
- [ ] Architecture diagrams are accurate

## Post-Implementation

### Quality Review

- [ ] Review generated reports for accuracy
- [ ] Check that Effect-TS patterns are correctly identified
- [ ] Verify Q&A pairs are kept together in chunks
- [ ] Test with malformed input to verify error handling

### Optimization

- [ ] Review LLM token usage
- [ ] Optimize prompts if needed
- [ ] Adjust chunk size based on results
- [ ] Add caching if beneficial

### Integration

- [ ] Document how to integrate into CI/CD (if needed)
- [ ] Add to project's main README (if appropriate)
- [ ] Share results with team

## Estimated Timeline

- **Phase 1 (Foundation)**: 2-3 hours
- **Phase 2 (Optimization)**: 2-3 hours
- **Phase 3 (Testing & Docs)**: 1-2 hours
- **Total**: 5-8 hours

## Getting Help

If you encounter issues:

1. Review error messages carefully
2. Check environment variables are set
3. Review logs with `DEBUG=*`
4. Consult Effect-TS docs: https://effect.website
5. Review project patterns: `.github/copilot-instructions.md`

## Success Criteria

✅ All checkboxes above are checked
✅ `bun test` passes
✅ Analyzer produces meaningful Effect-TS insights
✅ Documentation enables new users to run the tool
✅ Code follows project patterns

---

**Ready to start?** Begin with Phase 1.1 - Create Schema Definitions!
