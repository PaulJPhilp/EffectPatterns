# Analyzer Agent Test Preparation - Quick Start

## Summary

Goal: Prepare the analyzer agent to process the Effect-TS Discord Q&A data in
`packages/data/discord-qna.json`.

## Current Status

### ✅ What Works
- Basic LangGraph workflow with Effect-TS
- OpenAI GPT-4 integration
- Mock data test (53 messages)

### ❌ What Needs Work
- No schema validation for messages
- Generic prompts (not Effect-TS specific)
- Fixed chunk size (200) doesn't match real data (50 messages)
- Limited error handling
- No configuration system
- Minimal logging
- Not tested with real discord-qna.json

## Key Issues

1. **Data Schema**: Currently uses `z.any()` - needs proper Effect.Schema
2. **Chunk Size**: Hardcoded at 200, but real data only has 50 messages
3. **Prompts**: Too generic - needs Effect-TS domain expertise
4. **Testing**: Only mock data tested, not real discord-qna.json

## Implementation Checklist

### Phase 1: Foundation (Do First) 🔥

- [x] Create `schemas.ts` with Message/Author/Collection schemas
- [x] Create `validation-service.ts` for data validation
- [x] Create `config-service.ts` for environment-based config
- [x] Create `errors.ts` with proper tagged errors
- [x] Update `services.ts` with retry logic and better error handling

### Phase 2: Optimization

- [x] Update prompts in `services.ts` for Effect-TS Q&A analysis
- [x] Create `chunking-service.ts` with smart chunking
- [x] Add structured logging throughout all services
- [x] Update `graph.ts` to use all new services

### Phase 3: Testing & Docs

- [x] Add real data test to `__tests__/graph.test.ts`
- [x] Create `README.md` for the analyzer
- [x] Create `examples/run-discord-analysis.ts`

## Quick Commands

```bash
# Setup
cd scripts/analyzer
bun install

# Create .env file from template
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Run existing test (automatically loads from .env)
bun test

# Run analyzer
bun run examples/run-discord-analysis.ts

# Or run directly
bun run analyzer \
  --input ../../packages/data/discord-qna.json \
  --output ./output/analysis.txt
```

## Expected Output Structure

The analyzer should produce a report with:

- **Executive Summary**: High-level findings
- **Common Questions**: Most asked questions about Effect-TS
- **Effect Patterns**: Services, Layers, Errors, Schema, HTTP/RPC
- **Pain Points**: Confusing concepts
- **Best Practices**: Recommended solutions
- **Code Examples**: Key patterns demonstrated
- **Recommendations**: Documentation/learning resource suggestions

## Files to Create/Modify

### New Files

```
scripts/analyzer/
  ├── schemas.ts              # Effect.Schema definitions
  ├── validation-service.ts   # Data validation service
  ├── config-service.ts       # Configuration layer
  ├── errors.ts              # Tagged error types
  ├── chunking-service.ts    # Smart chunking logic
  ├── README.md              # Documentation
  └── examples/
      └── run-discord-analysis.ts
```

### Modified Files

```
scripts/analyzer/
  ├── services.ts    # Better prompts, retry logic
  ├── graph.ts       # Use new services, schemas
  └── __tests__/
      └── graph.test.ts  # Add real data test
```

## Success Metrics

- [ ] Processes all 50 messages from discord-qna.json
- [ ] Output mentions Effect-TS specific patterns
- [ ] Report includes common questions (HttpApi, errors, services)
- [ ] Error handling catches validation issues
- [ ] Configurable via environment variables
- [ ] Tests pass with real data

## Next Steps

1. Review full plan in `PREPARATION_PLAN.md`
2. Start with Phase 1 (Foundation)
3. Test incrementally after each phase
4. Iterate on prompts based on output quality

## Resources

- Full Plan: `scripts/analyzer/PREPARATION_PLAN.md`
- Design Decisions: `scripts/analyzer/DESIGN_DECISIONS.md` ⭐ NEW
- Architecture: `scripts/analyzer/ARCHITECTURE.md`
- Implementation Checklist: `scripts/analyzer/IMPLEMENTATION_CHECKLIST.md`
- Effect-TS Patterns: `.github/copilot-instructions.md`
- Current Test: `scripts/analyzer/__tests__/graph.test.ts`
- Real Data: `packages/data/discord-qna.json` (50 messages)
