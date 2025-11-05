# Patterns Chat App - Implementation Guide

**Status**: Infrastructure Complete (Ready for UI Integration)
**Last Updated**: November 4, 2025

## Overview

The Patterns Chat App has been successfully renamed and refactored from `code-assistant` to create a specialized AI chat application for Effect-TS learning. The app uses retrieval-augmented generation (RAG) to provide intelligent pattern-based guidance to users.

## Completed Tasks

### ✅ 1. Application Rename
- **Renamed**: `app/code-assistant` → `app/patterns-chat-app`
- **Git History**: Preserved using `git mv`
- **Package Name**: Updated to `patterns-chat-app` in `package.json`
- **Workspace**: Automatically recognized via `app/*` glob in root `package.json`

### ✅ 2. CI/CD & Deployment Updates
- **Updated**: `.github/workflows/deploy.yml`
  - Job name: `deploy-code-assistant` → `deploy-patterns-chat-app`
  - Working directory: `app/code-assistant` → `app/patterns-chat-app`
  - Secret: `VERCEL_CODE_ASSISTANT_PROJECT_ID` → `VERCEL_PATTERNS_CHAT_APP_PROJECT_ID`
  - Health check URL updated
  - Dependencies updated in `health-check` job

### ✅ 3. Documentation Updates
- **README.md**: Completely rewritten with Pattern Chat App focus
  - Architecture section explaining RAG workflow
  - Pattern loading instructions using `sm-cli`
  - Environment setup guide
  - Development workflow
  - Deployment instructions
  
- **.env.example**: Refined for pattern-specific requirements
  - Added `SUPERMEMORY_API_KEY` (required)
  - Added `SUPERMEMORY_PROJECT_ID` (defaults to "effect-patterns")
  - Simplified auth-related variables (being replaced soon)
  - Added clear pattern loading instructions
  - Removed unnecessary AI model keys

### ✅ 4. PatternsService (Backend Integration)
**File**: `app/patterns-chat-app/lib/services/patterns-service.ts`

Core features:
- **Memory Router API Integration**: Queries Supermemory's `https://api.supermemory.ai/v1/memory-router` endpoint
- **Pattern Search**: Semantic search with configurable thresholds and reranking
- **Metadata Parsing**: Converts Supermemory memories into typed `Pattern` objects
- **Caching**: 5-minute cache with TTL to reduce API calls
- **Error Handling**: Comprehensive error messages and logging

Key methods:
```typescript
searchPatterns(query, options)           // Main search entry point
getPatternsBySkillLevel(level, query)    // Filter by difficulty
getPatternsByUseCase(useCase)            // Filter by use case
clearCache()                              // Testing/refresh support
getCacheStats()                           // Debug cache status
```

### ✅ 5. PatternScorer (Relevance Detection)
**File**: `app/patterns-chat-app/lib/services/pattern-scorer.ts`

Implements intelligent query scoring with three factors:
- **Effect-TS Specificity** (40% weight): Keywords like "effect", "layer", "service"
- **Topic Matching** (35% weight): Keywords for specific topics (error-handling, dependency-injection, etc.)
- **Learning Indicators** (25% weight): Phrases like "how to", "best practice", "help"

Supported topics:
- error-handling
- dependency-injection
- async-programming
- type-safety
- testing
- performance
- composition
- context-propagation

Key methods:
```typescript
scoreQuery(query)              // Main scoring method (returns 0-1 score + decision)
getDetailedScore(query)        // Debug-friendly detailed breakdown
setMinimumThreshold(threshold) // Tune sensitivity
```

Default threshold: `0.5` (only queries scoring ≥50% trigger pattern retrieval)

### ✅ 6. React Hook for Pattern Retrieval
**File**: `app/patterns-chat-app/hooks/usePatternRetrieval.ts`

Three complementary hooks:

**usePatternRetrieval(query, options)**
- Main hook for RAG implementation
- Auto-scores queries and fetches relevant patterns
- Built-in caching with abort signal support
- Options: `enabled`, `minRelevanceScore`, `maxPatterns`, `cacheEnabled`

**usePatternContext(patterns)**
- Formats patterns into markdown string for system prompt
- Useful for LLM context enrichment

**usePatternDisplay(patterns, options)**
- UI helper for displaying patterns
- Filtering, sorting, and grouping capabilities
- Expandable pattern cards state management

API Endpoints (to be implemented):
- `POST /api/patterns/score` - Returns scoring result
- `POST /api/patterns/search` - Returns retrieved patterns

## Architecture Diagram

```
User Query
    ↓
usePatternRetrieval Hook
    ↓
[Score Query] ← PatternScorer (min threshold check)
    ↓
If Score ≥ Threshold:
    ├→ [Search Patterns] ← PatternsService
    │    ↓
    │  Supermemory Memory Router API
    │    ↓
    │  Parse & Cache Results
    ↓
Return Pattern List + Score
    ↓
Chat Component
    ├→ Include patterns in System Prompt (via usePatternContext)
    ├→ Render Pattern Cards (via usePatternDisplay)
    ↓
LLM Response (enhanced with pattern knowledge)
```

## Next Steps (Task 5 & Beyond)

### Immediate (Task 5)
**Update Chat Interface** - Integrate pattern retrieval into the chat component:

1. **API Routes to Create**:
   ```
   app/patterns-chat-app/app/api/patterns/score/route.ts
   app/patterns-chat-app/app/api/patterns/search/route.ts
   ```

2. **Chat Component Updates**:
   - Import `usePatternRetrieval` hook
   - Import `usePatternContext` for system prompt enrichment
   - Import `usePatternDisplay` for UI state
   - Add pattern cards section below chat messages
   - Update system prompt to include pattern context

3. **UI Components to Create**:
   - `PatternCard.tsx` - Display individual pattern
   - `PatternsList.tsx` - Container for pattern cards
   - `PatternBadge.tsx` - Skill level / tag badges

### Future Improvements

1. **Streaming Pattern Retrieval**
   - Fetch patterns in parallel with LLM response
   - Display patterns as they arrive

2. **User Feedback Loop**
   - Track which patterns users find helpful
   - Use feedback to improve scoring

3. **Pattern Analytics**
   - Log pattern usage for insights
   - Identify most-used patterns by topic

4. **Advanced RAG**
   - Multi-stage retrieval (semantic + keyword)
   - Query expansion for better coverage
   - Reranking with LLM scorer

5. **Auth.js Replacement**
   - Implement custom auth solution
   - Simplify deployment configuration

## Environment Setup Checklist

- [ ] Set `SUPERMEMORY_API_KEY` in `.env.local`
- [ ] Verify `SUPERMEMORY_PROJECT_ID` is `"effect-patterns"`
- [ ] Load patterns: `cd app/sm-cli && pnpm run dev -- patterns upload --all`
- [ ] Verify patterns loaded: `pnpm run dev -- memories list --type pattern`
- [ ] Set other required env vars (DATABASE_URL, BLOB_READ_WRITE_TOKEN)
- [ ] Update Vercel secrets with `VERCEL_PATTERNS_CHAT_APP_PROJECT_ID`

## File Structure

```
app/patterns-chat-app/
├── lib/
│   ├── services/
│   │   ├── patterns-service.ts      ✅ NEW
│   │   └── pattern-scorer.ts        ✅ NEW
│   ├── semantic-search/             (existing)
│   ├── memory.ts                    (existing, can coexist)
│   └── ...
├── hooks/
│   ├── usePatternRetrieval.ts       ✅ NEW
│   └── ...
├── app/
│   ├── api/
│   │   ├── patterns/
│   │   │   ├── score/route.ts       📝 TO DO
│   │   │   └── search/route.ts      📝 TO DO
│   │   └── ...
│   └── ...
├── components/
│   ├── PatternCard.tsx              📝 TO DO
│   ├── PatternsList.tsx             📝 TO DO
│   └── ...
├── .env.example                     ✅ UPDATED
├── package.json                     ✅ UPDATED
├── README.md                        ✅ UPDATED
└── ...
```

## Testing the Implementation

### Unit Testing
```bash
# Create test files in __tests__ directories
app/patterns-chat-app/lib/services/__tests__/patterns-service.test.ts
app/patterns-chat-app/lib/services/__tests__/pattern-scorer.test.ts
app/patterns-chat-app/hooks/__tests__/usePatternRetrieval.test.ts
```

### Integration Testing
```bash
# Test pattern loading workflow
cd app/sm-cli
pnpm test

# Test chat app with patterns
cd app/patterns-chat-app
pnpm test
```

### Manual Testing
1. Start app: `pnpm dev`
2. Open chat interface
3. Send Effect-related query (e.g., "How do I handle errors in Effect?")
4. Verify patterns appear below chat
5. Verify scoring in browser DevTools (API responses)

## Deployment Notes

- Rename triggers automatic redeployment via GitHub Actions
- Ensure `VERCEL_PATTERNS_CHAT_APP_PROJECT_ID` secret exists
- Health check endpoint: `/api/health`
- Pattern loading happens at release time via CI/CD pipeline
- No runtime pattern updates needed (static data)

## References

- Supermemory Documentation: https://supermemory.ai/docs
- Memory Router API: https://supermemory.ai/docs/memory-router/overview
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Effect-TS: https://effect.website

## Contacts & Questions

- Pattern loading: See `app/sm-cli/README.md`
- Deployment: Check `.github/workflows/deploy.yml`
- Architecture: Review this document and code comments
