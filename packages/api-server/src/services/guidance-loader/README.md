# Guidance Loader Service

Load pattern guidance from markdown files.

## Overview

The `GuidanceLoaderService` loads Effect pattern guidance markdown files that provide best practices, explanations, and code examples for specific rules and patterns.

## API

### Methods

#### `loadGuidance(ruleId: string): Effect<string | undefined>`

Load guidance content for a rule.

```typescript
const guidance = yield* loader.loadGuidance("async-await");

if (guidance) {
  console.log(guidance);
  // Markdown content with explanation and examples
}
```

#### `getGuidanceKey(ruleId: string): Effect<string | undefined>`

Get the filename key for a rule.

```typescript
const key = yield* loader.getGuidanceKey("async-await");
console.log(key);  // "async-await-in-effect"
```

#### `loadGuidanceWithKey(ruleId: string): Effect<GuidanceResult>`

Load full result with key and content.

```typescript
const result = yield* loader.loadGuidanceWithKey("async-await");
console.log(result.ruleId);     // "async-await"
console.log(result.key);        // "async-await-in-effect"
console.log(result.content);    // Markdown or undefined
```

#### `getGuidanceMappings(): Effect<GuidanceMapping>`

Get all rule → filename mappings.

```typescript
const mappings = yield* loader.getGuidanceMappings();
Object.entries(mappings).forEach(([ruleId, filename]) => {
  console.log(`${ruleId} → ${filename}`);
});
```

## Guidance Categories

Guidance is organized by pattern category:

### Async Patterns
- `async-await` → async-await-in-effect

### Error Handling
- `throw-in-effect-code` → throw-in-effect-code
- `try-catch-in-effect` → try-catch-in-effect
- `generic-error-type` → generic-error-type
- `missing-error-channel` → missing-error-channel
- `catching-errors-too-early` → catching-errors-too-early
- `swallowing-errors-in-catchall` → swallowing-errors-in-catchall

### Concurrency
- `promise-all-in-effect` → promise-all-in-effect
- `unbounded-parallelism` → unbounded-parallelism
- `no-floating-promises` → no-floating-promises
- `fire-and-forget-fork` → fire-and-forget-fork
- `forking-inside-loops` → forking-inside-loops

### Resource Management
- `leaking-scopes` → leaking-scopes
- `connection-pool-awareness` → connection-pool-awareness
- `blocking-calls-in-effect` → blocking-calls-in-effect

### Testing & Observability
- `avoid-console-log` → avoid-console-log
- `logging-discipline` → logging-discipline
- `hidden-effect-execution` → hidden-effect-execution

### Core Idioms
- `prefer-effect-gen` → prefer-effect-gen
- `avoid-effect-run-sync` → avoid-effect-run-sync
- `prefer-match-over-if` → prefer-match-over-if
- `service-definition-style` → service-definition-style

## Example

```typescript
import { Effect } from "effect";
import { GuidanceLoaderService } from "./services/guidance-loader";

const program = Effect.gen(function* () {
  const loader = yield* GuidanceLoaderService;
  
  // Get guidance for a rule
  const guidance = yield* loader.loadGuidance("async-await");
  
  if (guidance) {
    // Display to user
    console.log("PATTERN GUIDANCE:");
    console.log(guidance);
  } else {
    console.log("No guidance available for this pattern");
  }
  
  // List all available guidance
  const mappings = yield* loader.getGuidanceMappings();
  const available = Object.keys(mappings).length;
  console.log(`${available} patterns have guidance`);
});

Effect.runPromise(program);
```

## Guidance File Format

Guidance files are markdown with:

```markdown
# Pattern Name

Brief description of the pattern.

## Problem

What problem does this solve?

## Example

### ❌ Wrong

```typescript
// Bad code
```

### ✅ Right

```typescript
// Good code
```

## Key Points

- Bullet point 1
- Bullet point 2
- Bullet point 3

## References

- Link to documentation
- Link to examples
```

## Types

```typescript
interface GuidanceResult {
  readonly ruleId: string;
  readonly key: string | undefined;
  readonly content: string | undefined;
}

interface GuidanceMapping {
  readonly [ruleId: string]: string;
}
```

## File Location

Guidance files are stored in:
```
src/services/guidance-loader/guidance/
├── async-await-in-effect.md
├── throw-in-effect-code.md
├── generic-error-type.md
└── ...
```

## Legacy Compatibility

Synchronous helpers available for backward compatibility:

```typescript
import { loadGuidance, getGuidanceKey } from "./services/guidance-loader";

// Legacy synchronous versions
const key = getGuidanceKey("async-await");
const content = loadGuidance("async-await");
```

## Testing

Run guidance loader tests:
```bash
bun run test src/services/guidance-loader/__tests__
```

## See Also

- [Code Review Service](../review-code) - Uses guidance in recommendations
- [Review Code](../review-code) - Displays guidance to users
