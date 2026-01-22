# Pattern Presentation: Before & After

## Problem: Noisy Output from MCP Calls

Currently, when requesting patterns, users see:

```
Searching the Effect Patterns MCP server for concurrency patterns.
[8 tools called]
[MCP fetch results in JSON...]
"Searching the Effect Patterns MCP server…"
- Searching...
- [8 tools called] etc

[Large text dump with search output...]
```

## Solution: Clean Pattern Cards

### Before (Current Noisy Output)

When asking "explain concurrency in Effect":

```
Searching the Effect Patterns MCP server for concurrency patterns.

[8 tools called]

[lots of tool output...]

# Concurrency in Effect.ts

## Core concepts

### Fibers: lightweight threads

[200+ lines of content with search artifacts mixed in]
```

### After (Clean Presentation)

Same request produces:

```
## Effect Concurrency Patterns (20 patterns)

**Categories:** concurrency: 8 | error-handling: 5 | services: 4 | ...

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

---

Click a pattern above to expand the detailed card.
```

Then clicking a row expands to:

```
## Process a Collection in Parallel with Effect.forEach

**intermediate** | concurrency | concurrency, parallel, performance

Use Effect.forEach with the `concurrency` option to process a collection of items in parallel with a fixed limit, preventing resource exhaustion.

### When to Use / Avoid

**Use when:**
- Processing large collections (100+) items concurrently
- Need to limit concurrent operations to prevent resource exhaustion
- Batch processing with backpressure

**Avoid when:**
- Small arrays where concurrency overhead exceeds benefit (< 10 items)
- Sequential operations with data dependencies
- CPU-bound tasks that can't benefit from I/O concurrency

### Defaults vs Recommended

**Default:** Sequential (concurrency: 1)
**Recommended:** Bounded concurrency: Effect.forEach with { concurrency: N }
**Rationale:** Unbounded parallelism can exhaust resources on large datasets

### Minimal Example

```typescript
const userIds = Array.from({ length: 100 }, (_, i) => i + 1);

const program = Effect.gen(function* () {
  const users = yield* Effect.forEach(userIds, fetchUserById, {
    concurrency: 5, // Limit to 5 concurrent operations
  });
  return users;
});

Effect.runPromise(program);
```

Process 100 users with max 5 concurrent fetches. Total time: ~20s (100 ÷ 5 * 1s each).

### Common Gotchas

- Using Effect.all on large arrays instead of Effect.forEach with concurrency limits
- Not setting concurrency: will run all items in parallel, exhausting resources
- Forgetting to handle errors in individual items

### Related Patterns

- run-effects-in-parallel-with-all
- race-concurrent-effects
- manage-shared-state-with-ref
```

## Key Differences

### 1. Tool Noise: Hidden

| Before | After |
|--------|-------|
| "Searching the Effect Patterns MCP server…" | (not shown) |
| "[8 tools called]" | (not shown) |
| MCP connection details | (not shown) |
| Search metadata | (not shown) |

### 2. Structure: Consistent Cards

| Before | After |
|--------|-------|
| Inconsistent format | PatternCard with fixed structure |
| Scattered guidance | Section: "When to Use / Avoid" |
| Implied defaults | Section: "Defaults vs Recommended" |
| Varied examples | minimalExample + advancedExample |
| Mixed in anti-patterns | Section: "Common Gotchas" |

### 3. Navigation: Interactive Index

| Before | After |
|--------|-------|
| Long text | Clickable table index |
| Search again for details | Click row → expands card |
| Hard to compare | Side-by-side defaults/recommended |
| No categorization | Grouped by category + difficulty |

## Defaults vs Recommended: Now Explicit

### Concurrency Patterns

```
Process Collections:
  Default:      Sequential (concurrency: 1)
  Recommended:  Bounded: { concurrency: N }
  Why:          Unbounded parallelism exhausts resources

Run All Effects:
  Default:      Sequential
  Recommended:  Explicit { concurrency: "unbounded" }
  Why:          Default ignores parallelism benefits

Race Effects:
  Default:      Unbounded race (can hang forever)
  Recommended:  Pair with timeout: Effect.race(task, timeout)
  Why:          Without timeout, can deadlock indefinitely

Fork Background:
  Default:      Unmanaged fibers (resource leak)
  Recommended:  With cleanup: Fiber.interrupt in finally
  Why:          Prevents lingering tasks after shutdown

Semaphore Rate Limit:
  Default:      Unbounded concurrency
  Recommended:  maxConnections: N via Semaphore
  Why:          Prevents connection pool exhaustion

Queue Distribution:
  Default:      Unbounded queue (memory issues)
  Recommended:  Queue.bounded(N) with backpressure
  Why:          Prevents memory leak when producers fast
```

### Error Handling Patterns

```
CatchTag Typed Errors:
  Default:      Untyped errors propagate
  Recommended:  catchTag / catchTags for type safety
  Why:          Type-safe handling prevents surprises

Retry on Failure:
  Default:      No retry (fail immediately)
  Recommended:  Effect.retry(policy) with schedule
  Why:          Handles transient failures gracefully

Try-Catch Exceptions:
  Default:      Untyped catch blocks
  Recommended:  Effect.try with error mapping
  Why:          Converts to Effect error channel
```

## Integration Points

### For Pattern Authors
Add to pattern YAML/MDX:

```yaml
defaultsVsRecommended:
  default: "Description of default behavior"
  recommended: "What you should do instead"
  rationale: "Why it matters"

gotchas:
  - "Common mistake 1"
  - "Common mistake 2"
```

### For Tool Builders
Use `CleanPatternService`:

```typescript
// Hides all MCP noise
const results = yield* cleanPatternService.searchPatterns("concurrency");
console.log(presenter.renderIndex(results)); // Clean output, no noise
```

### For Claude/Windsurf Integration
Direct service composition:

```typescript
const concurrencyGuide = yield* cleanPatternService.renderSearchResults("concurrency");
console.log(concurrencyGuide); // Interactive pattern cards
```

## Files Changed

- **New:** `packages/ep-shared-services/src/pattern-presentation.ts`
  - Core presenter service
  - Card formatting
  - Index rendering

- **New:** `packages/ep-shared-services/src/clean-pattern-service.ts`
  - MCP wrapper
  - Noise filtering
  - Service integration

- **New:** `packages/ep-shared-services/PATTERN_PRESENTATION.md`
  - Documentation
  - Integration guide
  - Examples

- **New:** `packages/ep-shared-services/src/__tests__/pattern-presentation.test.ts`
  - Comprehensive test suite
  - Coverage for all pattern types
  - Before/after validation

- **Updated:** `packages/ep-shared-services/src/index.ts`
  - Export new services

## Usage in Practice

### Today's Workflow (Noisy)
1. Ask for concurrency patterns
2. See "Searching the Effect Patterns MCP server..."
3. See "[8 tools called]"
4. See 200+ lines of content with embedded metadata
5. Search again to find specific pattern

### New Workflow (Clean)
1. Ask for concurrency patterns
2. See clean card index with 20 patterns
3. Click pattern name to expand full card
4. See "Defaults vs Recommended" clearly marked
5. Copy minimal example → paste → done

## Benefits

✅ **Cleaner UX** - No tool call noise  
✅ **Consistency** - Every pattern has same structure  
✅ **Clarity** - Defaults/recommended explicit  
✅ **Discoverability** - Interactive card index  
✅ **Navigation** - Related patterns linked  
✅ **Learning** - Gotchas highlighted  

## Next Steps

1. **Integrate with MCP server** - Wrap calls in CleanPatternService
2. **Update pattern files** - Add defaultsVsRecommended metadata
3. **Build UI components** - Expandable cards for Cursor/Windsurf
4. **Test coverage** - Validate all pattern categories
5. **Performance** - Optimize rendering for large indexes
