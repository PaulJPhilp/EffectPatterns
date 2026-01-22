# MCP Server Performance Optimization Plan

## A) Repo Tour: Performance-Critical Paths

### Hot Paths (Identified)

1. **Tool Registration & Invocation**
   - File: `src/tools/tool-implementations.ts:106-159` (search_patterns handler)
   - Why: Every search query hits this path; calls HTTP API without deduping
   - Current: O(1) tool setup, but API call latency is uncached
   
2. **HTTP API Calls (Fetch)**
   - File: `src/mcp-stdio.ts:59-125` (callApi function)
   - Why: Core network bottleneck; 30s timeout; no connection reuse
   - Current: New fetch per request; no keep-alive agent; AbortController timeout
   
3. **Pattern Rendering (Markdown)**
   - File: `src/mcp-content-builders.ts:818-898` (buildSearchResultsContent)
   - Why: Renders all N patterns in loop; string concatenations in buildIndexTable
   - Current: O(N) full markdown build for every search result
   
4. **Get Pattern Handler**
   - File: `src/tools/tool-implementations.ts:161-201` (get_pattern handler)
   - Why: Fetches single pattern and renders; renders even if not cached
   - Current: O(output_size) rendering; no content hash caching
   
5. **Production Client HTTP**
   - File: `src/mcp-production-client.ts:43-75` (callProductionApi)
   - Why: Fallback HTTP client; no connection pooling
   - Current: Plain fetch; no timeout; no keep-alive

### Cache Infrastructure (Already Present)
   - File: `src/services/cache/api.ts:1-419`
   - Status: LRU cache with TTL exists, but **NOT USED** by tool handlers!
   - Issue: `search_patterns` and `get_pattern` tools don't call cache service

### Rendering Functions (String Building)
   - File: `src/mcp-content-builders.ts:803-813` (buildIndexTable)
   - Why: Uses `array.map().join()` which is O(N) string work for N patterns
   - Current: No batching; re-renders full table on every search

## B) Optimization Plan (Ordered Steps)

### Phase 1: HTTP Connection Efficiency (Impact: p50 -20%, p95 -30%)
- [ ] **1.1** Add global fetch agent with keep-alive for `callApi` in `mcp-stdio.ts`
- [ ] **1.2** Add request timeout + AbortSignal to `mcp-production-client.ts`
- [ ] **1.3** Implement in-flight deduping (Map<endpoint, Promise>) for identical concurrent requests
- [ ] **1.4** Add telemetry: track dedupe hits/misses

### Phase 2: Pattern Caching (Impact: p95 -45% if cache-warm, memory +2-5MB)
- [ ] **2.1** Integrate MCPCacheService into tool handlers
- [ ] **2.2** Cache search results by query key: `search:${query}:${category}:${difficulty}`
- [ ] **2.3** Cache individual patterns by ID: `pattern:${patternId}`
- [ ] **2.4** Add cache config: TTL=5min for search, TTL=30min for patterns
- [ ] **2.5** Implement cache-aside pattern in both handlers

### Phase 3: Rendering Optimization (Impact: p50 -15%, memory -10%)
- [ ] **3.1** Lazy-render: index table only; defer card rendering to pagination
- [ ] **3.2** Memoize rendered markdown for `get_pattern` with contentHash as key
- [ ] **3.3** Limit search results to top K cards (default 3) by default
- [ ] **3.4** Pre-compute index table from search payload without re-iterating

### Phase 4: Logging / Narration Control (Impact: no perf, correctness)
- [ ] **4.1** Strip `log("Tool called: ...")` from rendered output (defense-in-depth)
- [ ] **4.2** Add test: rendered content must NOT contain `"Tool called"`, `"[N tools"`, etc.
- [ ] **4.3** Add telemetry counter when strip-narration triggers

### Phase 5: Correctness & Safety (Impact: no perf, risk mitigation)
- [ ] **5.1** Add snapshot test for markdown rendering (determinism)
- [ ] **5.2** Add cache behavior test (TTL expiry, max size enforcement)
- [ ] **5.3** Add regression test: output schema stability
- [ ] **5.4** Audit `RenderedOutput` type: ensure discriminated union if formats vary

---

## Expected Improvements (Rough)

| Metric | Before | After | Improvement |
| --- | --- | --- | --- |
| **Search (p50)** | ~250ms | ~200ms | -20% |
| **Search (p95)** | ~900ms | ~630ms | -30% |
| **Get Pattern (p50)** | ~150ms | ~80ms | -47% (with cache) |
| **Get Pattern (p95)** | ~600ms | ~200ms | -67% (with cache) |
| **Memory (baseline)** | ~50MB | ~52-55MB | +2-5% (cache overhead) |
| **Dedupe Hit Rate** | 0% | 5-15% (typical) | Eliminates duplicate API calls |

---

## Key Constraints

1. **Output Equivalence**: Rendered markdown and JSON must remain identical (unless versioned)
2. **No Agent Narration Leakage**: Tool narration (`Tool called:`, `Searching`, etc.) must never appear in user-visible content
3. **Determinism**: Same input → same output (for snapshot testing)
4. **No External Dependencies**: Use existing cache service (Effect.Service)
5. **Incremental, Reviewable Changes**: One optimization per commit

---

## Testing Strategy

### Baseline (Before)
1. Create perf harness under `tests/perf/`
2. Measure 100 iterations of:
   - `search_patterns` with common queries
   - `get_pattern` for random IDs
3. Record: p50, p95, memory, CPU%

### After Each Phase
1. Re-run same harness
2. Compare metrics
3. Add unit tests for correctness

### Regression Tests (All Phases)
- Snapshot: rendered markdown must match baseline
- Output schema: JSON and content blocks must validate
- Narration: grep output for forbidden tokens
- Determinism: same input, 10 runs → identical output

