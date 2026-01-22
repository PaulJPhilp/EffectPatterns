# Pattern Presentation: Visual Comparison

## Problem: Noisy Pattern Results

When users ask about patterns, they currently see tool-call artifacts mixed into the response.

### Current Output (Noisy)

```
Searching the Effect Patterns MCP server for concurrency patterns.

[8 tools called]
[MCP fetch output...]

# Concurrency in Effect.ts

## Core concepts

### Fibers: lightweight threads

Fibers are Effect's unit of concurrency...

[200+ lines mixed with scattered metadata]

## Pattern summary

| Pattern | Category | ...

[No clear defaults/recommended]
[Inconsistent structure]
```

**Problems:**
- Tool-call noise ("Searching...", "[8 tools called]")
- Inconsistent formatting across patterns
- Defaults/recommended not clearly marked
- No structured navigation
- Hard to compare patterns

---

## Solution: Clean Pattern Cards

### New Output (Clean)

```
## Effect Concurrency Patterns (20 patterns)

**Categories:** concurrency: 8 | error-handling: 5 | testing: 3 | services: 4

**Difficulty:** Beginner: 3 | Intermediate: 12 | Advanced: 5

---

### Quick Reference

| Pattern | Category | Difficulty | Default | Recommended |
|---------|----------|------------|---------|-------------|
| **Process a Collection in Parallel with Effect.forEach** | concurrency | intermediate | Sequential (1) | Bounded: N |
| **Run Independent Effects in Parallel with Effect.all** | concurrency | intermediate | Sequential | Explicit concurrency |
| **Race Concurrent Effects for Fastest Result** | concurrency | intermediate | Unbounded race | Pair with timeout |
| **Run Background Tasks with Effect.fork** | concurrency | advanced | Unmanaged fibers | With cleanup |
| **Concurrency Pattern 2: Rate Limit with Semaphore** | concurrency | intermediate | Unbounded | maxConnections: N |
| **Decouple Fibers with Queues and PubSub** | concurrency | advanced | Unbounded queue | Bounded + backpressure |
| **Manage Shared State Safely with Ref** | concurrency | intermediate | Unguarded mutations | Atomic updates |
| **Understand Fibers as Lightweight Threads** | concurrency | advanced | OS thread thinking | M:N threading |

---

Click a pattern above to expand the detailed card.
```

**When user clicks a row, expands to:**

```
## Process a Collection in Parallel with Effect.forEach

**intermediate** | concurrency | concurrency, parallel, performance, batching, rate-limiting

Use Effect.forEach with the `concurrency` option to process a collection of items in parallel with a fixed limit, preventing resource exhaustion.

### When to Use / Avoid

**Use when:**
- Processing large collections (100+) items concurrently
- Need to limit concurrent operations to prevent resource exhaustion
- Batch processing with backpressure
- Want to prevent overwhelming downstream systems

**Avoid when:**
- Small arrays where concurrency overhead exceeds benefit (< 10 items)
- Sequential operations with data dependencies
- CPU-bound tasks that can't benefit from I/O concurrency
- When you need results in order with guaranteed sequencing

### Defaults vs Recommended

**Default:** Sequential (concurrency: 1)

**Recommended:** Bounded concurrency: Effect.forEach with { concurrency: N }

**Rationale:** Unbounded parallelism can exhaust resources on large datasets. The default is safe but sacrifices performance. Recommended: choose N based on:
- CPU cores: 2-4x cores for I/O
- Memory: Each fiber uses minimal memory, but tasks may
- Resource limits: Database connections, API rate limits, etc.

### Minimal Example

```typescript
const userIds = Array.from({ length: 100 }, (_, i) => i + 1);

const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting parallel processing...");

  const startTime = yield* Clock.currentTimeMillis;
  const users = yield* Effect.forEach(userIds, fetchUserById, {
    concurrency: 5, // Limit to 5 concurrent operations
  });
  const endTime = yield* Clock.currentTimeMillis;

  yield* Effect.logInfo(
    `Processed ${users.length} users in ${endTime - startTime}ms`
  );
  return users;
});

Effect.runPromise(program);
```

This processes 100 users with max 5 concurrent fetches:
- With concurrency: 5 → Total time ≈ 20 seconds (100 ÷ 5 × 1s each)
- Without concurrency: Would be 100 seconds sequential
- Performance gain: 5x faster

### Common Gotchas

- **Using Effect.all on large arrays instead of Effect.forEach** - Effect.all(array.map(...)) will try to run all items in parallel with no limit
- **Not setting concurrency** - Will default to sequential! Must explicitly set { concurrency: N }
- **Forgetting to handle errors in individual items** - If one fails, the entire forEach fails (unless caught)
- **Setting concurrency too low** - Starves throughput; too high exhausts resources
- **Mixing map and forEach** - `forEach` already applies the function; don't wrap in map

### Related Patterns

- [Run Independent Effects in Parallel with Effect.all](./run-effects-in-parallel-with-all.mdx) - When you need results from all effects
- [Race Concurrent Effects for Fastest Result](./race-concurrent-effects.mdx) - When you want first result only
- [Manage Shared State Safely with Ref](./manage-shared-state-with-ref.mdx) - For thread-safe counting
- [Concurrency Pattern 2: Rate Limit with Semaphore](./concurrency-pattern-rate-limit-with-semaphore.mdx) - For connection pools
```

---

## Key Improvements

### 1. No Tool Noise

| Before | After |
|--------|-------|
| "Searching the Effect Patterns MCP server..." | ✓ (hidden) |
| "[8 tools called]" | ✓ (hidden) |
| MCP fetch metadata | ✓ (hidden) |
| Raw JSON output | ✓ (structured cards) |

### 2. Explicit Defaults vs Recommended

| Before | After |
|--------|-------|
| Scattered guidance | **Default:** ... |
| Implied best practices | **Recommended:** ... |
| Hard to compare | **Rationale:** ... |
| No context | Comparison table |

### 3. Consistent Card Structure

Every pattern includes (in order):
1. Title + metadata (difficulty, category, tags)
2. Summary description
3. When to Use / Avoid (2 sections)
4. Defaults vs Recommended (with rationale)
5. Minimal Example (quick start)
6. Advanced Example (optional)
7. Common Gotchas (mistakes to avoid)
8. Related Patterns (navigation)

### 4. Interactive Navigation

| Before | After |
|--------|-------|
| Read all text sequentially | Click table row → expands |
| No comparison | Side-by-side defaults/recommended |
| Hard to find related patterns | Linked pattern references |
| Search again for details | Instant expansion |

---

## Defaults vs Recommended: Complete Reference

### Concurrency Patterns

```
Pattern: Process Collections (forEach)
  Default:      Sequential (concurrency: 1)
  Recommended:  Bounded: { concurrency: N }
  Rationale:    Prevent resource exhaustion on large datasets

Pattern: Run All Effects (all)
  Default:      Sequential (no concurrency option)
  Recommended:  Explicit: { concurrency: "unbounded" } or N
  Rationale:    Default misses parallelism benefits

Pattern: Race Effects
  Default:      Unbounded race (can hang forever)
  Recommended:  Pair with timeout: Effect.race(task, timeout)
  Rationale:    Without timeout, can deadlock indefinitely

Pattern: Fork Background
  Default:      Unmanaged fibers (resource leak)
  Recommended:  With cleanup: Fiber.interrupt in finally
  Rationale:    Prevents lingering tasks, memory leaks

Pattern: Semaphore Rate Limit
  Default:      Unbounded concurrency (pool exhaustion)
  Recommended:  maxConnections: N via Semaphore
  Rationale:    Prevents connection pool exhaustion

Pattern: Queue Distribution
  Default:      Unbounded queue (memory exhaustion)
  Recommended:  Queue.bounded(N) with backpressure
  Rationale:    Prevents OOM when producers outpace consumers

Pattern: Pub/Sub Broadcasting
  Default:      Unbounded broadcast (memory issues)
  Recommended:  PubSub.bounded(N) with topic filtering
  Rationale:    Bounded queues prevent cascade failures

Pattern: Shared State (Ref)
  Default:      Unguarded mutations (race conditions)
  Recommended:  Atomic updates: Ref.update or Ref.modify
  Rationale:    Ensures all changes are atomic
```

### Error Handling Patterns

```
Pattern: Catch Tagged Errors
  Default:      catchAll (loses type info)
  Recommended:  catchTag / catchTags (type-safe)
  Rationale:    Type safety prevents runtime surprises

Pattern: Try-Catch Exceptions
  Default:      Untyped exceptions escape
  Recommended:  Effect.try with error mapping
  Rationale:    Routes exceptions to Effect error channel

Pattern: Retry Failed Effects
  Default:      No retry (fail immediately)
  Recommended:  Effect.retry(schedule) with policy
  Rationale:    Handles transient failures gracefully
```

### Other Categories

Similar explicit defaults/recommended for:
- **Data Transformation**: map vs flatMap, fold patterns
- **Testing**: Layer testing, property testing
- **Services**: Service definition, dependency injection
- **Streams**: Stream creation, buffering strategies
- **Caching**: Layer wrapping, TTL strategies
- **Observability**: Logging levels, metrics collection
- **Scheduling**: Delay vs repeat strategies
- **Resource Management**: Scope lifecycle, finalizer placement

---

## User Impact

### Before: User Experience

1. User asks: "How does concurrency work in Effect?"
2. Sees tool noise: "Searching...", "[8 tools called]"
3. Scrolls through 200+ lines of mixed content
4. Finds scattered examples with no clear guidance
5. Doesn't know what's "default" vs "recommended"
6. Has to search again to compare patterns

### After: User Experience

1. User asks: "How does concurrency work in Effect?"
2. Sees clean index with 20 patterns in table format
3. Scans defaults/recommended column for quick overview
4. Clicks pattern name to expand full card
5. Sees clear guidance: Use when / Avoid when / Defaults / Recommended
6. Finds gotchas and related patterns instantly
7. Copy/paste minimal example → done

---

## Technical Implementation

### Service Architecture

```
CleanPatternService
├── searchPatterns(query) → PatternCardIndex
├── getPattern(id) → PatternCard
├── renderSearchResults(query) → string (markdown)
└── renderCard(card) → string (markdown)

PatternPresenter
├── formatCard(pattern, options) → PatternCard
├── formatIndex(patterns, options) → PatternCardIndex
├── renderIndex(index) → string (markdown table)
└── renderCard(card) → string (markdown)

Inference Functions
├── inferDefaultsVsRecommended(id, category)
├── inferUseGuidance(id, category, tags)
├── extractMinimalExample(pattern)
├── extractAdvancedExample(pattern)
└── extractGotchas(pattern)
```

### Data Flow

```
Raw Pattern Data (from MCP)
        ↓
PatternPresenter.formatCard()
        ↓
PatternCard (structured)
        ↓
PatternPresenter.renderCard()
        ↓
Markdown Output (clean, no noise)
```

---

## Benefits Summary

✅ **Cleaner presentation** - No tool noise  
✅ **Consistent structure** - Every pattern same format  
✅ **Clear guidance** - Defaults/recommended explicit  
✅ **Better UX** - Interactive card index  
✅ **Easier learning** - Gotchas highlighted  
✅ **Type-safe** - Full TypeScript interfaces  
✅ **Maintainable** - Centralized formatting logic  
✅ **Extensible** - Easy to add new patterns  

---

## Files

- **Implementation**: `packages/ep-shared-services/src/pattern-presentation.ts`
- **MCP Wrapper**: `packages/ep-shared-services/src/clean-pattern-service.ts`
- **Guide**: `packages/ep-shared-services/PATTERN_PRESENTATION.md`
- **Integration**: `docs/PATTERN_PRESENTATION_IMPROVEMENTS.md`
- **Tests**: `packages/ep-shared-services/src/__tests__/pattern-presentation.test.ts`
