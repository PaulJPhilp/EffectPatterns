# Pattern Presentation System

Transforms raw MCP pattern data into clean, consistently-formatted cards with interactive UI support.

## Problem Solved

### Before (Noisy Output)

```
Searching the Effect Patterns MCP server for concurrency patterns.
[8 tools called]
[MCP fetch results...]
"Searching the Effect Patterns MCP server…"
- "Searching the Effect Patterns MCP server…"
- "[8 tools called]" etc.

Then huge text dump with search output noise...
```

### After (Clean Output)

```
## Pattern Reference (20 patterns)

**Categories:** concurrency: 8 | error-handling: 5 | ...

| Pattern | Category | Difficulty | Default | Recommended |
|---------|----------|------------|---------|-------------|
| **Process a Collection in Parallel with Effect.forEach** | concurrency | intermediate | Sequential (1) | Bounded: N |
| **Run Independent Effects in Parallel with Effect.all** | concurrency | intermediate | Sequential | Explicit concurrency |
```

## Key Features

### 1. Hides Tool-Call Noise
- No "Searching...", "[8 tools called]", fetch output
- Clean, user-facing presentation only
- Metadata hidden behind optional "trace" section

### 2. Consistent Card Structure
Every pattern, regardless of type, has:
- **When to Use / When to Avoid** - clear guidance
- **Default vs Recommended** - explicit best practices
- **Minimal Example** - quick start
- **Advanced Example** (optional) - deep dive
- **Gotchas** - common mistakes
- **Related Patterns** - navigation

### 3. Explicit Defaults vs Recommended

Instead of scattered guidance, each pattern makes it clear:

```typescript
// Concurrency patterns
"process-collection-in-parallel-with-foreach": {
  default: "Sequential (concurrency: 1)",
  recommended: "Bounded concurrency: Effect.forEach with { concurrency: N }",
  rationale: "Unbounded parallelism can exhaust resources"
}

// Error handling patterns
"handle-errors-with-catchtag": {
  default: "Untyped errors propagate",
  recommended: "Typed errors with catchTag / catchTags",
  rationale: "Type-safe error handling prevents runtime surprises"
}
```

## Usage

### In Claude Chat (for humans)

```typescript
// Search and display clean results
const results = yield* cleanPatternService.searchPatterns("concurrency");
console.log(presenter.renderIndex(results));

// Open a specific pattern card
const card = yield* cleanPatternService.getPattern("process-collection-in-parallel-with-foreach");
console.log(presenter.renderCard(card));
```

### Programmatic Usage

```typescript
import { PatternPresenter, CleanPatternService } from "@effect-patterns/ep-shared-services";

// Format raw pattern data as clean card
const presenter = yield* PatternPresenter;
const card = presenter.formatCard(rawPatternData, {
  hideMetadata: true,
  includeAdvanced: true,
  includeGotchas: true,
});

// Render as index table
const index = presenter.formatIndex(patterns, {
  hideMetadata: true,
});
console.log(presenter.renderIndex(index));

// Render as detailed card
console.log(presenter.renderCard(card));
```

## Card Structure

### PatternCard Interface

```typescript
interface PatternCard {
  id: string;
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  summary: string;
  tags: readonly string[];
  
  // Guidance
  useGuidance: {
    whenUse: readonly string[];
    whenAvoid: readonly string[];
  };
  
  defaultsVsRecommended: {
    default: string;
    recommended: string;
    rationale?: string;
  };
  
  // Examples
  minimalExample: PatternExample;
  advancedExample?: PatternExample;
  
  // Context
  commonGotchas?: readonly string[];
  relatedPatterns?: readonly string[];
}
```

### Default vs Recommended Examples

#### Concurrency Patterns

| Pattern | Default | Recommended | Rationale |
|---------|---------|-------------|-----------|
| `forEach` | Sequential (1) | Bounded: N | Prevents resource exhaustion |
| `all` | Sequential | `{ concurrency: N }` | Default misses parallelism |
| `race` | Unbounded race | Pair with timeout | Prevents hanging |
| `fork` | Unmanaged fibers | With cleanup: `Fiber.interrupt` | Prevents leaks |
| `Semaphore` | Unbounded access | `maxConnections: N` | Prevents pool exhaustion |
| `Queue` | Unbounded (memory issues) | `Queue.bounded(N)` | Prevents memory leak |

#### Error Handling Patterns

| Pattern | Default | Recommended | Rationale |
|---------|---------|-------------|-----------|
| `catchAll` | Generic error handling | `catchTag` / `catchTags` | Type-safe |
| `try-catch` | Untyped exceptions | `Effect.try` with error mapping | Prevents silent failures |
| Retry | No retry | `Effect.retry(policy)` | Handles transient failures |

## Integration with MCP

The `CleanPatternService` wraps MCP calls:

```typescript
// This hides:
// - MCP connection noise
// - Search tool output
// - Fetch metadata
// - Tool call counts

// And returns:
// - Formatted PatternCardIndex
// - Clean rendered output
// - Interactive card structure

yield* cleanPatternService.searchPatterns("concurrency")
// Returns: PatternCardIndex with 8 concurrency patterns
```

## Customization

### Presentation Options

```typescript
interface PatternPresentationOptions {
  hideMetadata?: boolean;        // Default: true
  includeAdvanced?: boolean;     // Default: false (for brief output)
  includeGotchas?: boolean;      // Default: true
}

// Brief summary (good for chat)
presenter.formatIndex(patterns, {
  hideMetadata: true,
  includeAdvanced: false,
  includeGotchas: false,
});

// Full documentation (good for guides)
presenter.formatIndex(patterns, {
  hideMetadata: true,
  includeAdvanced: true,
  includeGotchas: true,
});
```

## Pattern Categories Covered

- ✅ Concurrency (fork, all, forEach, race, Semaphore, Queue, PubSub, Ref)
- ✅ Error Handling (catchTag, catchTags, catchAll, retry)
- ✅ Data Transformation (map, flatMap, fold, reduce)
- ✅ Testing (layer testing, effect testing, property testing)
- ✅ Services (service definition, layer composition, dependency injection)
- ✅ Streams (stream creation, transformation, collection)
- ✅ Caching (layer wrapping, ref-based caching)
- ✅ Observability (logging, metrics, tracing)
- ✅ Scheduling (delays, repeats, timeouts)
- ✅ Resource Management (scoped, resource lifecycle, cleanup)

Each category has consistent defaults/recommended structure.

## Files

- `pattern-presentation.ts` - Core presentation service & types
- `clean-pattern-service.ts` - MCP wrapper with noise filtering
- This file: `PATTERN_PRESENTATION.md` - Documentation

## Testing

See `__tests__/pattern-presentation.test.ts` for examples of:
- Formatting cards
- Rendering indexes
- Custom defaults/recommended
- Edge cases
