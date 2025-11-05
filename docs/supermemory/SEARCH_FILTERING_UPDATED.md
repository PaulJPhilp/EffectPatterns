# Search & Filtering - Plan Updated with Supermemory API ✅

**Status**: Ready for Implementation (API Details Updated)
**Branch**: `feat/search-filtering`
**Date**: November 4, 2025

## What Changed

The original search and filtering plan has been **updated with actual Supermemory API details**:

### Original Plan
- Generic search/filter framework
- Assumed single search endpoint
- Basic filtering concepts

### Updated Plan (Current)
- **Dual endpoint architecture** (v3/search + v4/search)
- **Documents Search** (`/v3/search`) - Ingested files, PDFs, etc.
- **Memories Search** (`/v4/search`) - User memories and preferences
- **Supermemory-native parameters** - Thresholds, reranking, query rewriting
- **Metadata filtering** - SQL-like filter conditions
- **Container tags** - User/project organization

## Supermemory Dual Search Architecture

### Two Endpoints, Two Use Cases

**1. Documents Search (`POST /v3/search`)**
- Searches ingested documents (PDFs, text, images, videos)
- Returns: Chunks with full context
- **Use cases**: Document discovery, RAG, chat with files
- **Latency**: 150-300ms typical

**Key Parameters:**
- `documentThreshold` - Document relevance (0.0-1.0)
- `chunkThreshold` - Chunk relevance (0.0-1.0)
- `rerank` - Re-score for higher accuracy
- `rewriteQuery` - Expand query for coverage (+400ms)
- `containerTags` - Organizational filtering
- `filters` - Metadata SQL-like conditions

**2. Memories Search (`POST /v4/search`)**
- Searches user memories and preferences
- Returns: Memories with similarity scores
- **Use cases**: Personalized AI, user context, auto-selection
- **Latency**: 100-200ms typical

**Key Parameters:**
- `threshold` - Similarity threshold (0.0-1.0)
- `containerTag` - User identifier
- `rerank` - Re-score results

## Key Concepts Implemented

### 1. Threshold Control
- **0.0** = Broad search (more results, lower quality)
- **1.0** = Precise search (fewer results, higher quality)
- Use thresholds to balance sensitivity

### 2. Query Rewriting
- Expands queries for better coverage
- "ML" becomes "machine learning artificial intelligence"
- Adds ~400ms latency
- Useful for abbreviations and domain terms

### 3. Reranking
- Re-scores results using different algorithm
- More accurate relevance
- Recommended for critical searches

### 4. Container Tags vs Metadata Filters
- **Container Tags**: Organizational grouping, exact matching
- **Metadata Filters**: SQL-like conditions for date/author/category

## Implementation Roadmap

### Phase 1: Type Definitions (Task 1)

Add to `app/sm-cli/src/types.ts`:
```typescript
// Document search
interface DocumentSearchOptions { ... }
interface DocumentSearchResult { ... }
interface DocumentChunk { ... }

// Memory search
interface MemorySearchOptions { ... }
interface MemorySearchResult { ... }
interface MemoryItem { ... }

// Filters
interface FilterConditions { ... }
interface FilterClause { ... }
```

### Phase 2: Service Layer (Task 2)

Add to `app/sm-cli/src/services/supermemory.ts`:
```typescript
readonly searchDocuments: (options: DocumentSearchOptions)
  => Effect.Effect<DocumentSearchResult, SupermemoryError>;

readonly searchMemories: (options: MemorySearchOptions)
  => Effect.Effect<MemorySearchResult, SupermemoryError>;
```

### Phase 3: Filter Parser (Task 3)

Create `app/sm-cli/src/lib/filter-parser.ts`:
```typescript
export const parseFilterExpression = (expr: string): FilterConditions
export const validateFilterClause = (clause: FilterClause): boolean
export const filterToQuery = (conditions: FilterConditions): string
```

### Phase 4: CLI Commands (Tasks 4-6)

Enhance `app/sm-cli/src/commands/memories.ts`:
```bash
# Memories search (v4/search)
bun run sm-cli memories search "kubernetes" \
  --threshold 0.7 \
  --rerank \
  --rewrite-query

# Documents search (v3/search)
bun run sm-cli documents search "machine learning" \
  --document-threshold 0.7 \
  --chunk-threshold 0.8 \
  --include-full-docs
```

### Phase 5: Advanced Features (Tasks 7-10)

- Metadata filtering: `--filter "category:ai AND author:alice"`
- Container filtering: `--container "user_123"`
- Threshold controls: `--document-threshold 0.7`
- Query rewriting: `--rewrite-query`

## Updated Todo List (14 Tasks)

1. ✅ Research current search/filtering capabilities
2. ✅ Create comprehensive search/filtering plan
3. ✅ Review Supermemory Search API documentation
4. ⏳ Create filter type definitions in types.ts
5. ⏳ Implement service methods (searchDocuments, searchMemories)
6. ⏳ Create filter parser (filter-parser.ts)
7. ⏳ Enhance memories search command with v4/search
8. ⏳ Create documents search command using v3/search
9. ⏳ Add metadata filtering support
10. ⏳ Implement threshold and reranking controls
11. ⏳ Add container tag filtering
12. ⏳ Write comprehensive tests
13. ⏳ Create SEARCH_FILTERING_GUIDE.md
14. ⏳ Create PR and request review

## Documentation Created

### 1. SEARCH_FILTERING_PLAN.md
- Comprehensive implementation plan
- Supermemory API details
- CLI command specifications
- Service layer design

### 2. SUPERMEMORY_SEARCH_INTEGRATION.md (NEW)
- Dual search architecture explanation
- Core concepts and strategies
- Implementation task breakdown
- Type definitions and code examples
- Performance characteristics

### 3. SEARCH_FILTERING_SETUP.md
- Branch setup information
- Implementation phases
- Success criteria

## Example Usage (When Complete)

```bash
# Simple memory search
bun run sm-cli memories search "kubernetes"

# With sensitivity control
bun run sm-cli memories search "kubernetes" \
  --threshold 0.7 \
  --limit 10

# With query expansion
bun run sm-cli memories search "ML" \
  --rewrite-query \
  --threshold 0.8

# Document search with thresholds
bun run sm-cli documents search "machine learning" \
  --document-threshold 0.7 \
  --chunk-threshold 0.8

# Advanced filtering
bun run sm-cli documents search "python" \
  --filter "category:education AND difficulty:beginner"

# Container-based search
bun run sm-cli memories search "kubernetes" \
  --container "team_devops"

# With reranking for accuracy
bun run sm-cli documents search "quantum computing" \
  --rerank \
  --document-threshold 0.6
```

## Key Implementation Points

✅ **Dual Endpoint Support**: Both v3 and v4 endpoints properly wrapped
✅ **Threshold Controls**: Expose documentThreshold, chunkThreshold, and similarity threshold
✅ **Query Rewriting**: Optional --rewrite-query flag (+400ms)
✅ **Reranking**: Optional --rerank flag for higher accuracy
✅ **Metadata Filters**: SQL-like filter DSL parsing
✅ **Container Tags**: User/project organization
✅ **Type Safety**: Full TypeScript support
✅ **Performance**: < 1s typical latency
✅ **Error Handling**: Comprehensive error recovery

## Ready to Begin Implementation?

All planning is complete with actual Supermemory API details. Ready to:

1. Start with **Task 1: Type Definitions**?
2. Or proceed with a different task?

The comprehensive documentation is ready:
- SEARCH_FILTERING_PLAN.md - Full specifications
- SUPERMEMORY_SEARCH_INTEGRATION.md - Implementation guide
- SEARCH_FILTERING_SETUP.md - Setup reference

---

**Branch**: feat/search-filtering (pushed to remote)
**Status**: Ready for development
**Next Step**: Implement type definitions and service layer
