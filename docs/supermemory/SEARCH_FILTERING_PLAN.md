# Search and Filtering Commands - Implementation Plan

**Status**: Planning Phase
**Branch**: `feat/search-filtering`
**Date**: November 4, 2025
**API Reference**: [Supermemory Search Docs](https://supermemory.ai/docs/search/overview)

## Overview

Complete and enhance search and filtering capabilities across SM-CLI commands to leverage Supermemory's dual search endpoints (`/v3/search` for documents, `/v4/search` for memories) with advanced filtering, scoring, and result control.

## Current State Analysis

### Existing Commands

**memories search**
- ✅ Basic text search
- ❌ No advanced filtering (by type, date, tags)
- ❌ No sorting options
- ❌ No result highlighting
- ❌ Limited pagination options

**memories list**
- ✅ Pagination (page, limit)
- ✅ Type filtering
- ❌ No date range filtering
- ❌ No tag filtering
- ❌ No sorting

**profiles search**
- ✅ Query with profile context
- ✅ Search results included
- ❌ No advanced filtering

**patterns search** (if exists)
- Need to verify current state

**queue list**
- ✅ Status display
- ❌ No status filtering
- ❌ No date filtering
- ❌ No sorting

## Supermemory Search API

### Two Search Endpoints

**1. Documents Search (`POST /v3/search`)**
- Search through ingested documents (PDFs, text, images, etc.)
- Returns matching document chunks with full context
- **Use cases**: Legal/finance documents, documentation search, chat with files

**Key Parameters:**
- `q` - Search query
- `limit` - Results per request (default: 10)
- `documentThreshold` - Document relevance threshold (0.0-1.0)
- `chunkThreshold` - Chunk relevance threshold (0.0-1.0)
- `rerank` - Enable reranking for higher accuracy (+time)
- `rewriteQuery` - Rewrite query for better coverage (+400ms)
- `includeFullDocs` - Include full document context
- `includeSummary` - Include document summaries
- `onlyMatchingChunks` - Return exact matches only (vs context)
- `containerTags` - Filter by organizational tags
- `filters` - Metadata filters (SQL-like conditions)

**Example:**
```typescript
const results = await client.search.documents({
  q: "machine learning accuracy",
  limit: 10,
  documentThreshold: 0.7,
  chunkThreshold: 0.8,
  rerank: true,
  containerTags: ["research"],
  filters: {
    AND: [{ key: "category", value: "ai", negate: false }]
  }
});
```

**2. Memories Search (`POST /v4/search`)**
- Search through user memories and preferences
- Optimized for conversational AI and personalization
- **Use cases**: Personalized chatbots, understanding user context, auto-selection

**Key Parameters:**
- `q` - Search query
- `limit` - Results per request (default: 5)
- `containerTag` - User/container identifier
- `threshold` - Similarity threshold (0.0-1.0)
- `rerank` - Enable reranking

**Example:**
```typescript
const results = await client.search.memories({
  q: "machine learning accuracy",
  limit: 5,
  containerTag: "research",
  threshold: 0.7,
  rerank: true
});
```

### Key Search Concepts

**Thresholds** (Control sensitivity):
- 0.0 = Least sensitive (more results, lower quality)
- 1.0 = Most sensitive (fewer results, higher quality)
- Use lower thresholds for broad searches
- Use higher thresholds for precise searches

**Container Tags vs Metadata Filters:**
- **Container Tags**: Organizational grouping, exact matching, forms user understanding graph
- **Metadata Filters**: Flexible conditions (SQL-like), useful for date/author/category filtering

**Query Rewriting:**
- Expands queries to find more relevant results
- "ML" becomes "machine learning artificial intelligence"
- Adds ~400ms latency
- Useful for abbreviations and domain-specific terms

**Reranking:**
- Re-scores results with a different algorithm
- More accurate but slower
- Recommended for critical searches

## Planned Enhancements

### Phase 1: Core Search & Filter Library (Priority: High)

Create a reusable search and filtering framework:

```typescript
// Search filters interface
interface SearchFilters {
  query?: string;
  type?: string[];
  status?: string[];
  tags?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  sortBy?: 'recent' | 'oldest' | 'relevance' | 'alphabetical';
  sortOrder?: 'asc' | 'desc';
}

interface SearchOptions {
  filters: SearchFilters;
  limit?: number;
  offset?: number;
  highlight?: boolean;
}

// Result wrapper
interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  filters: SearchFilters;
  executionTime: number;
}
```

**Files to Create:**
- `app/sm-cli/src/lib/search-filters.ts` - Filter definitions
- `app/sm-cli/src/lib/search-parser.ts` - Parse filter strings

### Phase 2: memories Command Enhancements (Priority: High)

Enhance the existing memories commands:

#### 2.1 memories search - Advanced Search
```bash
# Basic search
bun run sm-cli memories search "query"

# Search with filters
bun run sm-cli memories search "query" \
  --type "pattern,note" \
  --status "active" \
  --tags "effect,typescript" \
  --from "2025-10-01" \
  --to "2025-11-04" \
  --sort recent \
  --limit 20

# Filter syntax
bun run sm-cli memories search \
  --filter "type:pattern AND tags:effect OR tags:typescript" \
  --sort relevance
```

**Features:**
- Multi-type filtering
- Tag filtering
- Date range filtering
- Relevance sorting
- Result highlighting
- Execution time display

#### 2.2 memories list - Enhanced Listing
```bash
# Filter by type with sorting
bun run sm-cli memories list \
  --type "pattern" \
  --sort recent \
  --order desc

# Date range filtering
bun run sm-cli memories list \
  --from "2025-10-01" \
  --to "2025-11-04" \
  --limit 100

# Combined filters
bun run sm-cli memories list \
  --type "pattern" \
  --tags "effect" \
  --sort alphabetical
```

**Features:**
- Advanced date filtering
- Multiple type selection
- Tag filtering
- Flexible sorting
- Enhanced pagination

### Phase 3: profiles Command Enhancements (Priority: Medium)

Enhance profile search and filtering:

#### 3.1 profiles search - Advanced Search
```bash
# Search by skill level
bun run sm-cli profiles search --user alice_123 \
  --query "kubernetes" \
  --include-static \
  --include-dynamic

# Filter by topic
bun run sm-cli profiles search --user alice_123 \
  --query "deployment" \
  --sort relevance
```

#### 3.2 profiles list - Container Filtering
```bash
# List with topic filters
bun run sm-cli profiles list --container team_backend \
  --limit 50 \
  --sort "by-static-facts"

# Search across multiple containers
bun run sm-cli profiles search --query "kubernetes" \
  --container "team_backend" \
  --search-profiles
```

### Phase 4: queue Command Enhancements (Priority: Medium)

Add filtering to queue management:

#### 4.1 queue list - Status Filtering
```bash
# Filter by status
bun run sm-cli queue list --status failed
bun run sm-cli queue list --status "queued,extracting"

# Filter by date range
bun run sm-cli queue list \
  --from "2025-11-04 10:00" \
  --to "2025-11-04 12:00"

# Combined filters
bun run sm-cli queue list \
  --status failed \
  --from "2025-11-04" \
  --sort "recent"
```

**Features:**
- Multi-status filtering
- Date/time filtering
- Sorting by created/updated time
- Filter combinations

### Phase 5: patterns Command Enhancements (Priority: Low)

If patterns command exists, enhance it:

```bash
# Search with filters
bun run sm-cli patterns search "query" \
  --skill-level "intermediate,advanced" \
  --tags "error-handling,concurrency" \
  --use-case "error-management"

# Advanced filtering
bun run sm-cli patterns search \
  --filter "skill:intermediate AND use-case:error-management"
```

## Technical Implementation

### Search Filter Types

```typescript
type FilterType =
  | 'query'
  | 'type'
  | 'status'
  | 'tags'
  | 'date-range'
  | 'skill-level'
  | 'use-case'
  | 'metadata';

interface FilterDefinition {
  name: string;
  type: FilterType;
  parser: (value: string) => any;
  validate: (value: any) => boolean;
  description: string;
  examples: string[];
}
```

### Command Option Patterns

Consistent option naming across commands:

```typescript
// All search commands support:
--query / -q          // Search query
--limit / -l          // Result limit
--offset / -o         // Pagination offset
--sort / -s           // Sort field
--order               // asc/desc
--format / -f         // human/json
--highlight           // Highlight matches

// Filtering options:
--filter              // Complex filter string
--type               // Type filtering
--status             // Status filtering
--tags               // Tag filtering
--from               // Date range start
--to                 // Date range end
```

### CLI Option Architecture

```typescript
// Reusable option definitions
const queryOption = Options.text('query').pipe(
  Options.withDescription('Search query'),
);

const limitOption = Options.integer('limit').pipe(
  Options.optional,
  Options.withDefault(50),
  Options.withDescription('Result limit'),
);

const sortOption = Options.choice('sort',
  ['recent', 'oldest', 'relevance', 'alphabetical']
).pipe(
  Options.optional,
  Options.withDefault('relevance'),
);

const dateRangeOptions = {
  from: Options.text('from').pipe(Options.optional),
  to: Options.text('to').pipe(Options.optional),
};
```

## Service Layer Enhancements

### SupermemoryService Extensions

Based on Supermemory's actual API, add these methods:

```typescript
// Documents search with full parameter control
readonly searchDocuments: (options: {
  q: string;
  limit?: number;
  documentThreshold?: number;
  chunkThreshold?: number;
  rerank?: boolean;
  rewriteQuery?: boolean;
  includeFullDocs?: boolean;
  includeSummary?: boolean;
  onlyMatchingChunks?: boolean;
  containerTags?: string[];
  filters?: FilterConditions;
}) => Effect.Effect<DocumentSearchResult, SupermemoryError>;

// Memories search (conversational AI optimized)
readonly searchMemories: (options: {
  q: string;
  limit?: number;
  containerTag?: string;
  threshold?: number;
  rerank?: boolean;
}) => Effect.Effect<MemorySearchResult, SupermemoryError>;

// Advanced document filtering with metadata
readonly searchDocumentsWithMetadata: (options: {
  q: string;
  filters: FilterConditions;
  threshold?: number;
  limit?: number;
}) => Effect.Effect<DocumentSearchResult, SupermemoryError>;

// Container-based queries
readonly searchByContainer: (options: {
  q: string;
  containerTag: string;
  limit?: number;
  threshold?: number;
}) => Effect.Effect<MemorySearchResult, SupermemoryError>;
```

### Filter Conditions Interface

```typescript
interface FilterConditions {
  AND?: FilterClause[];
  OR?: FilterClause[];
}

interface FilterClause {
  key: string;
  value: string | number | boolean;
  negate?: boolean;
}

// Usage:
const filters = {
  AND: [
    { key: "category", value: "ai", negate: false },
    { key: "difficulty", value: "beginner", negate: false }
  ]
};
```

## UI/UX Enhancements

### Result Display

```
📊 Search Results: "kubernetes" (1.2s)
Showing 1-20 of 487 results

┌──────┬────────────────────────────────────┬───────────┬───────────┐
│ Rel. │ Title                              │ Type      │ Updated   │
├──────┼────────────────────────────────────┼───────────┼───────────┤
│ 0.98 │ Kubernetes deployment automation   │ pattern   │ 2 weeks   │
│ 0.95 │ Container orchestration guide      │ tutorial  │ 1 month   │
│ 0.92 │ K8s best practices                 │ note      │ 5 days    │
└──────┴────────────────────────────────────┴───────────┴───────────┘

Filters Applied: type=pattern, tags=devops, from=2025-10-01
```

### Filter Status Display

```
Active Filters:
- Query: "kubernetes"
- Types: pattern, tutorial
- Tags: devops, infrastructure
- Date Range: Oct 1 - Nov 4, 2025
- Sort: Recent (desc)

Results: 487 total | 20 per page | Page 1 of 25
```

### Highlight Matches

```
Title: Kubernetes deployment automation
       ^^^^^^^^^^^ (match highlighted in color)
```

## Documentation Plan

### User Guide Sections

1. **Basic Searching**
   - Simple text search
   - Search syntax
   - Result interpretation

2. **Advanced Filtering**
   - Filter types
   - Complex queries
   - Filter combinations

3. **Sorting and Pagination**
   - Sort options
   - Sort order
   - Pagination examples

4. **Command Reference**
   - All filter options
   - Examples for each
   - Common use cases

5. **Performance Tips**
   - Efficient filtering
   - Index usage
   - Query optimization

## Implementation Roadmap

### Week 1: Core Infrastructure
- [ ] Create search filters library
- [ ] Create search parser
- [ ] Add filter type definitions
- [ ] Create reusable CLI options

### Week 2: memories Commands
- [ ] Enhance memories search
- [ ] Enhance memories list
- [ ] Add advanced filtering
- [ ] Add sorting options

### Week 3: profiles and queue
- [ ] Enhance profiles search
- [ ] Enhance profiles list
- [ ] Add queue filtering
- [ ] Add queue sorting

### Week 4: Documentation & Testing
- [ ] Write comprehensive guides
- [ ] Create examples
- [ ] Interactive testing
- [ ] Performance validation

## Success Criteria

✅ All search commands support advanced filters
✅ Consistent filter syntax across commands
✅ Proper error handling for invalid filters
✅ Performance acceptable (< 1s for typical queries)
✅ Beautiful result display with formatting
✅ Complete documentation with examples
✅ Zero breaking changes to existing commands
✅ 100% type-safe implementation

## Files to Create/Modify

### New Files
- `app/sm-cli/src/lib/search-filters.ts`
- `app/sm-cli/src/lib/search-parser.ts`
- `app/sm-cli/src/lib/date-parser.ts`
- `app/sm-cli/SEARCH_FILTERING_GUIDE.md`

### Modified Files
- `app/sm-cli/src/commands/memories.ts` - Search/list enhancements
- `app/sm-cli/src/commands/profiles.ts` - Search enhancements (if needed)
- `app/sm-cli/src/commands/queue.ts` - Filter additions
- `app/sm-cli/src/services/supermemory.ts` - Advanced search methods
- `app/sm-cli/src/types.ts` - Filter type definitions

## Performance Considerations

| Operation | Target | Notes |
|-----------|--------|-------|
| Simple search | < 200ms | Single API call |
| Advanced filter | < 500ms | Client-side filtering |
| Large result set | < 1s | 1000+ results |
| Date range query | < 300ms | Optimized query |

## Related Features

- User Profiles management (completed PR #87)
- Queue Management (completed)
- Pattern Discovery (existing)

## Future Enhancements

- [ ] Saved search filters
- [ ] Search history
- [ ] Filter suggestions/autocomplete
- [ ] Scheduled searches
- [ ] Email search results
- [ ] Export search results
- [ ] Advanced query DSL
- [ ] Search aggregations

## Testing Strategy

### Unit Tests
- Filter parsing logic
- Date range calculations
- Sort option handling
- Filter validation

### Integration Tests
- End-to-end search workflows
- Multi-filter combinations
- Result accuracy
- Performance benchmarks

### Manual Testing
- Interactive command testing
- Filter combination testing
- Edge case handling
- UI/output verification

---

## Next Steps

1. Create search filters library
2. Define filter types and parsers
3. Add CLI options
4. Implement memories search enhancements
5. Implement memories list enhancements
6. Test and iterate
7. Add profiles/queue filtering
8. Complete documentation
9. Performance testing
10. Create PR and merge

