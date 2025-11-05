# Supermemory Search Integration Guide

**Status**: Ready for Implementation
**Date**: November 4, 2025
**API Version**: Supermemory v4 with dual search endpoints
**Reference**: https://supermemory.ai/docs/search/overview

## Dual Search Architecture

Supermemory provides two complementary search endpoints optimized for different use cases:

### Endpoint 1: Documents Search (`POST /v3/search`)

**Purpose**: Search ingested documents (PDFs, text, images, videos)
**Optimized for**: Document discovery, RAG, document-centric use cases
**Latency**: 150-300ms typical
**Returns**: Document chunks with context

**Use Cases:**
- Legal/finance document search
- Chat with documentation
- Document discovery
- Knowledge base search

**Key Parameters:**
```typescript
{
  q: string;                          // Search query
  limit?: number;                     // Results (default: 10)
  documentThreshold?: number;         // Document relevance 0.0-1.0
  chunkThreshold?: number;            // Chunk relevance 0.0-1.0
  rerank?: boolean;                   // Re-score results
  rewriteQuery?: boolean;             // Expand query (+400ms)
  includeFullDocs?: boolean;          // Full document context
  includeSummary?: boolean;           // Document summaries
  onlyMatchingChunks?: boolean;       // Exact vs contextual
  containerTags?: string[];           // Organizational filtering
  filters?: FilterConditions;         // Metadata SQL-like filters
}
```

### Endpoint 2: Memories Search (`POST /v4/search`)

**Purpose**: Search user memories and preferences
**Optimized for**: Conversational AI, personalization, user context
**Latency**: 100-200ms typical
**Returns**: Memories with similarity scores

**Use Cases:**
- Personalized chatbots
- Understanding user preferences
- Auto-selection based on user context
- User preference discovery

**Key Parameters:**
```typescript
{
  q: string;              // Search query
  limit?: number;         // Results (default: 5)
  containerTag?: string;  // User/container identifier
  threshold?: number;     // Similarity 0.0-1.0
  rerank?: boolean;       // Re-score results
}
```

## Core Concepts

### 1. Threshold Control

**Definition**: Controls result sensitivity (quality vs quantity)

**Range**: 0.0 (least sensitive) to 1.0 (most sensitive)

**Strategies**:
```typescript
// Broad search - cast wide net
const broadSearch = {
  documentThreshold: 0.2,   // Many documents
  chunkThreshold: 0.2        // Many chunks per document
};

// Balanced search - good tradeoff
const balancedSearch = {
  documentThreshold: 0.5,
  chunkThreshold: 0.5
};

// Precise search - high quality only
const preciseSearch = {
  documentThreshold: 0.8,
  chunkThreshold: 0.8
};
```

### 2. Query Rewriting

**What it does**: Expands queries to find more relevant results

**Example**:
- Input: "ML"
- Rewritten: "machine learning artificial intelligence deep learning"

**Cost**: +400ms latency
**When to use**: Abbreviations, domain-specific terms, synonyms needed

### 3. Reranking

**What it does**: Re-scores results using a different algorithm

**Benefits**:
- More accurate relevance scoring
- Better semantic understanding
- Catches results standard ranking misses

**Cost**: Additional processing time
**When to use**: Critical searches where accuracy matters

### 4. Container Tags vs Metadata Filters

**Container Tags**:
- Organizational grouping (exact matching)
- Forms user understanding graph
- Use for user/project segmentation
- Example: containerTags: ["user_123", "research"]

**Metadata Filters**:
- SQL-like conditions on document metadata
- Flexible range queries and comparisons
- Use for date ranges, categories, authors
- Example: `{ key: "date", value: "2025-11-04", negate: false }`

## SM-CLI Integration Strategy

### Phase 1: Core Service Layer

Extend SupermemoryService with Supermemory API wrappers:

```typescript
interface SupermemoryService {
  // ... existing methods ...

  // Documents search with full control
  readonly searchDocuments: (options: DocumentSearchOptions)
    => Effect.Effect<DocumentSearchResult, SupermemoryError>;

  // Memories search (conversational optimized)
  readonly searchMemories: (options: MemorySearchOptions)
    => Effect.Effect<MemorySearchResult, SupermemoryError>;

  // Metadata-aware document search
  readonly searchDocumentsWithMetadata: (options: MetadataSearchOptions)
    => Effect.Effect<DocumentSearchResult, SupermemoryError>;

  // Container-based memory queries
  readonly searchByContainer: (options: ContainerSearchOptions)
    => Effect.Effect<MemorySearchResult, SupermemoryError>;
}
```

### Phase 2: CLI Commands

Enhance memory commands with Supermemory search parameters:

```bash
# Basic memories search (v4/search)
bun run sm-cli memories search "kubernetes"

# With threshold control
bun run sm-cli memories search "kubernetes" \
  --threshold 0.7 \
  --rerank true

# Document search (v3/search)
bun run sm-cli documents search "kubernetes" \
  --document-threshold 0.7 \
  --chunk-threshold 0.8 \
  --include-full-docs

# Metadata filtering
bun run sm-cli documents search "kubernetes" \
  --filter "category:devops AND author:alice"

# Query rewriting for better coverage
bun run sm-cli memories search "ML" \
  --rewrite-query \
  --limit 20
```

### Phase 3: Advanced Filtering

Implement metadata filter DSL:

```typescript
// Filter parsing
type FilterExpression =
  | { AND: FilterExpression[] }
  | { OR: FilterExpression[] }
  | FilterClause;

interface FilterClause {
  key: string;
  value: string | number | boolean;
  negate?: boolean;
}

// CLI syntax: --filter "category:ai AND difficulty:beginner"
// Converts to:
{
  AND: [
    { key: "category", value: "ai", negate: false },
    { key: "difficulty", value: "beginner", negate: false }
  ]
}
```

## Implementation Tasks

### Task 1: Service Layer (Type Definitions)

Create types in `app/sm-cli/src/types.ts`:

```typescript
// Document Search
interface DocumentSearchOptions {
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
}

interface DocumentSearchResult {
  results: DocumentChunk[];
  timing: number;
  total: number;
}

interface DocumentChunk {
  documentId: string;
  title: string;
  type: string;
  score: number;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Memory Search
interface MemorySearchOptions {
  q: string;
  limit?: number;
  containerTag?: string;
  threshold?: number;
  rerank?: boolean;
}

interface MemorySearchResult {
  results: MemoryItem[];
  timing: number;
  total: number;
}

interface MemoryItem {
  id: string;
  memory: string;
  similarity: number;
  metadata?: Record<string, unknown>;
  updatedAt: string;
  context?: {
    parents?: RelatedMemory[];
    children?: RelatedMemory[];
  };
}

interface RelatedMemory {
  memory: string;
  relation: "extends" | "derives";
  version: number;
  updatedAt: string;
}

// Filter conditions
interface FilterConditions {
  AND?: FilterClause[];
  OR?: FilterClause[];
}

interface FilterClause {
  key: string;
  value: string | number | boolean;
  negate?: boolean;
}
```

### Task 2: Service Implementation

Add methods to `app/sm-cli/src/services/supermemory.ts`:

```typescript
const searchDocuments = (options: DocumentSearchOptions) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch('https://api.supermemory.ai/v3/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
        }).then(res => {
          if (!res.ok) throw new Error(`Search failed: ${res.status}`);
          return res.json();
        }),
      catch: (error) =>
        new SupermemoryError({
          message: `Failed to search documents: ${error}`,
        }),
    });

    return response as DocumentSearchResult;
  });

const searchMemories = (options: MemorySearchOptions) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch('https://api.supermemory.ai/v4/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
        }).then(res => {
          if (!res.ok) throw new Error(`Search failed: ${res.status}`);
          return res.json();
        }),
      catch: (error) =>
        new SupermemoryError({
          message: `Failed to search memories: ${error}`,
        }),
    });

    return response as MemorySearchResult;
  });
```

### Task 3: CLI Commands

Enhance `app/sm-cli/src/commands/memories.ts`:

```bash
# memories search with advanced options
bun run sm-cli memories search "kubernetes" \
  --limit 20 \
  --threshold 0.7 \
  --rerank \
  --rewrite-query \
  --format json

# documents search with filters
bun run sm-cli documents search "machine learning" \
  --document-threshold 0.7 \
  --chunk-threshold 0.8 \
  --include-full-docs \
  --filter "category:ai"
```

### Task 4: Filter Parser

Create `app/sm-cli/src/lib/filter-parser.ts`:

```typescript
// Parse filter expressions
export const parseFilterExpression = (expr: string): FilterConditions => {
  // Parse: "category:ai AND difficulty:beginner"
  // Returns: { AND: [{ key: "category", value: "ai" }, ...] }
};

// Validate filter clauses
export const validateFilterClause = (clause: FilterClause): boolean => {
  // Ensure key, value are valid
};

// Convert to SQL-like query
export const filterToQuery = (conditions: FilterConditions): string => {
  // Generate optimized query for Supermemory API
};
```

## Performance Characteristics

| Operation | Typical Time | Notes |
|-----------|-------------|-------|
| Simple search (v4) | 100-200ms | Memory search, single query |
| Document search (v3) | 150-300ms | Without reranking |
| With reranking | +100-200ms | More accurate results |
| Query rewriting | +400ms | Expands query for coverage |
| Metadata filtering | <50ms | Client-side filtering |

## Success Criteria

✅ Service layer properly wraps both v3 and v4 endpoints
✅ CLI commands expose all relevant Supermemory parameters
✅ Filter DSL implemented and parsed correctly
✅ Threshold controls work as expected
✅ Reranking and query rewriting available
✅ Type safety across all operations
✅ Comprehensive error handling
✅ Performance acceptable (< 1s typical)

## Next Steps

1. **Implement type definitions** in types.ts
2. **Add service methods** to supermemory.ts
3. **Create filter parser** in lib/filter-parser.ts
4. **Enhance CLI commands** in commands/memories.ts
5. **Add comprehensive tests** for search functionality
6. **Write user guide** for search and filtering

## References

- [Supermemory Search Overview](https://supermemory.ai/docs/search/overview)
- [Documents Search Examples](https://supermemory.ai/docs/search/examples/document-search)
- [Memories Search Examples](https://supermemory.ai/docs/search/examples/memory-search)
- [Response Schema](https://supermemory.ai/docs/search/response-schema)
