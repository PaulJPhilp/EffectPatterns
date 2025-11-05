# Infinite Scroll Implementation Plan with Supermemory

## Overview

Add infinite scroll functionality to the memories system, allowing users to progressively load and browse their conversation history without explicit pagination. This leverages Supermemory's search capabilities to provide a seamless, performant browsing experience.

## Current State Analysis

### What We Have

1. **Supermemory-backed Search System**
   - `lib/semantic-search/supermemory-store.ts` - Vector store with Supermemory client
   - `lib/semantic-search/search.ts` - Hybrid search algorithm (60% semantic + 30% keyword + 7% recency + 3% satisfaction)
   - `/api/search` endpoint - Accepts `limit` and `offset`/`cursor` parameters
   - Supports filtering by tags, outcomes, and date ranges

2. **Search API Current State**
   - Located: `app/(chat)/api/search/route.ts`
   - Parameters: `q`, `limit`, `outcome`, `tag`, `minSimilarity`, `type`
   - Currently returns: `{ query, tag, limit, count, results }`
   - No pagination/offset support yet

3. **Memories Display**
   - `/memories` page - Static guide page (educational, no dynamic content)
   - No current memories browsing interface for users

### What We Need to Add

1. **Pagination Support in Search API**
   - Add `offset` or `cursor`-based pagination
   - Return pagination metadata for infinite scroll

2. **New Memories Browser Component**
   - Interactive component to browse and search memories
   - Infinite scroll implementation with `useIntersectionObserver`

3. **New API Endpoint or Enhancement**
   - Create `/api/memories/browse` for pagination
   - Or enhance `/api/search` with pagination metadata

4. **UI Component with Infinite Scroll**
   - Dedicated page: `/memories/browse`
   - Or enhanced `/memories` with tabs (guide + browse)

## Architecture Design

### Option 1: Enhanced /api/search (Recommended)

**Pros:**
- Reuses existing search infrastructure
- Single API endpoint for all memory queries
- Supermemory already supports pagination

**Cons:**
- Changes existing API surface
- Need to maintain backward compatibility

**Implementation:**
```typescript
// GET /api/search?q=error&limit=20&offset=0
Response {
  query: string
  limit: number
  offset: number
  total: number  // Total available results
  hasMore: boolean  // Are there more results?
  results: SemanticSearchResult[]
  nextOffset?: number  // For client to know what to request next
}
```

### Option 2: New /api/memories/browse Endpoint (Clean Separation)

**Pros:**
- Clear separation of concerns
- Dedicated browsing API
- Easier to optimize for infinite scroll

**Cons:**
- Duplicate code
- More endpoints to maintain

**Implementation:**
```typescript
// GET /api/memories/browse?q=error&limit=20&offset=0&sort=recency
Response {
  query: string
  limit: number
  offset: number
  total: number
  hasMore: boolean
  results: BrowseResult[]
}
```

**Recommendation:** Option 1 - Enhanced /api/search

## Implementation Steps

### Phase 1: Backend - Pagination Support

#### Step 1.1: Update Search API Response Type

File: `lib/semantic-search/search.ts`

```typescript
export interface PaginatedSearchResult {
  results: SemanticSearchResult[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
  nextOffset?: number
}

export const semanticSearchConversations = async (
  userId: string,
  query: string,
  options: SemanticSearchOptions & { offset?: number } = {}
): Promise<PaginatedSearchResult>
```

#### Step 1.2: Add Pagination to Supermemory Store

File: `lib/semantic-search/supermemory-store.ts`

- Implement offset-based pagination in `search()` method
- Handle Supermemory API pagination (if it supports it)
- Track total count for `hasMore` calculation

```typescript
async search(
  embedding: number[],
  query: string,
  options: SupermemoryStoreOptions & { offset?: number }
): Promise<{ results: SupermemorySearchResult[]; total: number }>
```

#### Step 1.3: Update /api/search Endpoint

File: `app/(chat)/api/search/route.ts`

Add query parameters:
- `offset` (default: 0) - Current offset
- `sort` (default: "relevance") - Sort by relevance, recency, or satisfaction

Return pagination metadata:
```typescript
{
  query,
  offset,
  limit,
  total,
  hasMore,
  count: results.length,
  results
}
```

### Phase 2: Frontend - Infinite Scroll Component

#### Step 2.1: Create Memories Browser Component

File: `components/memories-browser.tsx`

Features:
- Search input
- Filter buttons (tags, outcomes)
- Results list with infinite scroll
- Loading state during fetch
- Empty state when no results

```typescript
export function MemoriesBrowser() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SemanticSearchResult[]>([])
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<{ tag?: string; outcome?: string }>({})

  const observerTarget = useRef<HTMLDivElement>(null)

  // Fetch memories with search/filter
  const fetchMemories = async (newOffset: number = 0) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        q: query,
        limit: "20",
        offset: newOffset.toString(),
        ...(filter.tag && { tag: filter.tag }),
        ...(filter.outcome && { outcome: filter.outcome }),
      })

      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()

      if (newOffset === 0) {
        setResults(data.results)
      } else {
        setResults(prev => [...prev, ...data.results])
      }

      setOffset(newOffset + data.results.length)
      setTotal(data.total)
      setHasMore(data.hasMore)
    } finally {
      setIsLoading(false)
    }
  }

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchMemories(offset)
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [offset, hasMore, isLoading])

  // Handle search
  const handleSearch = (newQuery: string) => {
    setQuery(newQuery)
    setOffset(0)
    setResults([])
    setHasMore(true)
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <SearchBar onSearch={handleSearch} />
      <FilterBar onFilterChange={setFilter} />

      {/* Results */}
      <div className="space-y-3">
        {results.map(result => (
          <MemoryCard key={result.id} result={result} />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={observerTarget} className="flex justify-center py-4">
          {isLoading && <Spinner />}
        </div>
      )}

      {!hasMore && results.length > 0 && (
        <p className="text-center text-gray-500">
          Loaded all {total} memories
        </p>
      )}

      {results.length === 0 && !isLoading && (
        <EmptyState query={query} />
      )}
    </div>
  )
}
```

#### Step 2.2: Create Memory Card Component

File: `components/memory-card.tsx`

Display individual memory with:
- Title/summary
- Tags
- Outcome badge
- Satisfaction score
- Last accessed date
- Link to view full conversation

#### Step 2.3: Create Search/Filter UI

File: `components/memory-search.tsx`

- Text search input
- Tag filter pills
- Outcome filter dropdown
- Clear filters button

### Phase 3: UI Integration

#### Step 3.1: Add Browse Tab to Memories Page

Option A: Enhance `/memories` with tabs (Guide + Browse)
```
/memories
├── Tab 1: Guide (existing)
└── Tab 2: Browse Memories (new with infinite scroll)
```

Option B: Create `/memories/browse`
```
/memories - Guide (existing)
/memories/browse - Interactive browsing (new)
```

**Recommendation:** Option A - cleaner UX

#### Step 3.2: Update Memories Navigation

Add "Browse Memories" link/button in:
- Chat header Memories button
- Greeting welcome banner
- Memories page

## Supermemory API Integration

### Current Supermemory Client Methods

```typescript
// From lib/semantic-search/supermemory-store.ts
this.client.memories.add(content, metadata)
this.client.memories.search(query, options)
this.client.memories.delete(id)
```

### Required for Infinite Scroll

Check Supermemory API for:
1. Does `search()` support `limit` and `offset`?
2. Does it return `total` count?
3. What's the maximum `limit` value?
4. Can we sort by recency, relevance, satisfaction?

**Research Action:** Test Supermemory API pagination
```typescript
// Test pagination
const page1 = await client.memories.search(query, { limit: 20, offset: 0 })
const page2 = await client.memories.search(query, { limit: 20, offset: 20 })
```

## Performance Considerations

### Optimization Strategies

1. **Request Caching**
   - Cache search results by query + offset
   - Use React Query / SWR for automatic cache management
   - Invalidate cache when filters change

2. **Virtual Scrolling**
   - For large result sets (1000+), use `react-window` or `@tanstack/react-virtual`
   - Render only visible items to maintain performance
   - Reduce memory footprint

3. **Search Debouncing**
   - Debounce search input (300ms)
   - Prevent excessive API calls

4. **Batch Loading**
   - Load 20 items per request (configurable)
   - Balance between latency and payload size

5. **Lazy Load Details**
   - Only fetch full conversation on demand (click memory card)
   - Initial list shows: title, tags, outcome, date

### Memory Load Calculation

```
Initial load: 20 items = ~50KB (assuming ~2.5KB per item)
Scroll load: +20 items = +50KB
At 10 auto-loads: ~550KB loaded in memory
Virtual scrolling: ~100KB (only visible items)
```

## Testing Strategy

### Unit Tests

- [ ] Pagination logic (offset calculations)
- [ ] Search with filters
- [ ] Sorting by different fields
- [ ] hasMore calculation

### Integration Tests

- [ ] API endpoint with pagination
- [ ] Supermemory search with offset
- [ ] Total count accuracy

### Component Tests

- [ ] Infinite scroll trigger
- [ ] IntersectionObserver hook
- [ ] Search input debouncing
- [ ] Filter application
- [ ] Loading states
- [ ] Empty states

### E2E Tests

- [ ] User searches for memory
- [ ] Scrolls down (loads more)
- [ ] Applies filters (resets scroll)
- [ ] Clicks memory card (opens full conversation)

## Implementation Timeline

### Phase 1: Backend (1-2 hours)
- Add pagination types to search.ts
- Implement offset in supermemory-store.ts
- Update /api/search endpoint
- Add tests for pagination logic

### Phase 2: Frontend (2-3 hours)
- Create memories-browser component
- Create memory-card component
- Create search/filter UI
- Implement infinite scroll with IntersectionObserver
- Add loading/empty states
- Add tests

### Phase 3: Integration (1-2 hours)
- Add Browse tab to /memories page
- Update navigation/links
- Style and polish
- Responsive design for mobile
- E2E testing

**Total Estimated Time:** 4-7 hours

## Decisions to Make

1. **Pagination Approach**
   - Option 1: Enhance existing `/api/search` ✅ Recommended
   - Option 2: New `/api/memories/browse` endpoint

2. **UI Location**
   - Option A: Add "Browse" tab to `/memories` ✅ Recommended
   - Option B: Create `/memories/browse` as separate page

3. **Items Per Request**
   - Default: 20 items per request
   - Configurable? (e.g., 10, 20, 50)

4. **Virtual Scrolling**
   - Implement from start? (safer, but more complex)
   - Add if needed later? (simpler start, may cause issues at scale)

5. **Sort Options**
   - Default: Relevance (best match to query)
   - Also support: Recency (newest first), Satisfaction (best outcomes)

## File Structure

```
New/Modified Files:
├── lib/semantic-search/
│   ├── search.ts (modify - add offset, pagination types)
│   └── supermemory-store.ts (modify - add pagination)
├── app/(chat)/api/search/route.ts (modify - add offset, pagination response)
├── components/
│   ├── memories-browser.tsx (new - main infinite scroll component)
│   ├── memory-card.tsx (new - individual memory display)
│   ├── memory-search.tsx (new - search and filter UI)
│   └── memories-guide.tsx (modify - add Browse tab)
├── app/(chat)/memories/page.tsx (modify - add tabs or link to browse)
└── lib/semantic-search/__tests__/
    └── pagination.test.ts (new - pagination tests)
```

## Next Steps

1. ✅ Clarify Supermemory API pagination support
2. ✅ Confirm implementation approach (Option 1 vs 2)
3. ✅ Decide on UI location (Option A vs B)
4. Start Phase 1 implementation

## References

- Current Search Implementation: `lib/semantic-search/search.ts`
- Current API: `app/(chat)/api/search/route.ts`
- Memories Page: `app/(chat)/memories/page.tsx`
- Supermemory Store: `lib/semantic-search/supermemory-store.ts`
- React Infinite Scroll: `useIntersectionObserver` hook
- Next.js Data Fetching: Server functions and API routes
