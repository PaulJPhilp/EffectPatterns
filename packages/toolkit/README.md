# @effect-patterns/toolkit

> Type-safe Effect library for working with Effect-TS patterns

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Effect](https://img.shields.io/badge/Effect-3.18+-purple.svg)](https://effect.website/)

A pure Effect library providing canonical domain types, schemas, and utilities for searching, validating, and generating code from the Effect Patterns Hub. All operations are implemented using Effect primitives for type-safety and composability.

## Features

- 🔍 **Pattern Search** - Type-safe search and filtering with Effect
- ✅ **Schema Validation** - Runtime validation using `@effect/schema`
- 🎯 **Code Generation** - Generate snippets from pattern templates
- 📦 **Zero Dependencies** - Only peer dependencies on Effect ecosystem
- 🚀 **Pure Functions** - All business logic as composable Effects

## Installation

```bash
# npm
npm install @effect-patterns/toolkit effect @effect/schema @effect/platform

# bun
bun add @effect-patterns/toolkit effect @effect/schema @effect/platform

# pnpm
pnpm add @effect-patterns/toolkit effect @effect/schema @effect/platform
```

## Quick Start

```typescript
import { Effect } from "effect"
import {
  loadPatternsFromJson,
  searchPatterns,
  getPatternById,
  buildSnippet,
} from "@effect-patterns/toolkit"

// Load patterns from JSON file
const program = Effect.gen(function* () {
  // Load all patterns
  const patternsIndex = yield* loadPatternsFromJson("./data/patterns.json")
  console.log(`Loaded ${patternsIndex.patterns.length} patterns`)

  // Search patterns
  const results = yield* searchPatterns({
    patterns: patternsIndex.patterns,
    query: "retry",
    skillLevel: "intermediate",
  })
  console.log(`Found ${results.length} patterns`)

  // Get specific pattern
  const pattern = yield* getPatternById(
    patternsIndex.patterns,
    "retry-with-backoff"
  )

  if (pattern) {
    // Generate code snippet
    const snippet = yield* buildSnippet({
      pattern,
      customName: "retryRequest",
      moduleType: "esm",
    })
    console.log(snippet)
  }
})

// Run the program
Effect.runPromise(program)
```

## API Reference

### Pattern Loading

#### `loadPatternsFromJson`

Load patterns from a JSON file using Effect.

```typescript
import { loadPatternsFromJson } from "@effect-patterns/toolkit"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const patternsIndex = yield* loadPatternsFromJson("./data/patterns.json")
  return patternsIndex
})
```

**Returns**: `Effect<PatternsIndex, FileSystemError | JsonParseError>`

#### `loadPatternsFromJsonRunnable`

Runnable version with platform dependencies.

```typescript
import { loadPatternsFromJsonRunnable } from "@effect-patterns/toolkit"
import { Effect } from "effect"
import { NodeContext } from "@effect/platform-node"

const program = loadPatternsFromJsonRunnable("./data/patterns.json").pipe(
  Effect.provide(NodeContext.layer)
)

Effect.runPromise(program)
```

**Returns**: `Effect<PatternsIndex, FileSystemError | JsonParseError, NodeContext>`

### Pattern Search

#### `searchPatterns`

Search and filter patterns with type-safe criteria.

```typescript
import { searchPatterns } from "@effect-patterns/toolkit"

const results = yield* searchPatterns({
  patterns: patternsIndex.patterns,
  query: "error handling",
  skillLevel: "intermediate",
  useCase: ["Error Management"],
  tags: ["catchTag", "retry"],
  limit: 10,
})
```

**Parameters**:
- `patterns`: `Pattern[]` - Array of patterns to search
- `query?`: `string` - Text search across title, summary, and content
- `skillLevel?`: `"beginner" | "intermediate" | "advanced"` - Filter by skill level
- `useCase?`: `string[]` - Filter by use case categories
- `tags?`: `string[]` - Filter by tags
- `limit?`: `number` - Maximum number of results

**Returns**: `Effect<Pattern[], never>`

#### `getPatternById`

Get a specific pattern by ID.

```typescript
import { getPatternById } from "@effect-patterns/toolkit"

const pattern = yield* getPatternById(
  patternsIndex.patterns,
  "retry-with-backoff"
)

if (pattern) {
  console.log(pattern.title)
}
```

**Returns**: `Effect<Pattern | undefined, never>`

### Code Generation

#### `buildSnippet`

Generate a code snippet from a pattern template.

```typescript
import { buildSnippet } from "@effect-patterns/toolkit"

const snippet = yield* buildSnippet({
  pattern: myPattern,
  customName: "myFunction",
  customInput: "fetch('/api/data')",
  moduleType: "esm", // or "commonjs"
})

console.log(snippet)
```

**Parameters**:
- `pattern`: `Pattern` - The pattern to generate from
- `customName?`: `string` - Custom function name
- `customInput?`: `string` - Custom input code
- `moduleType?`: `"esm" | "commonjs"` - Module system

**Returns**: `Effect<string, never>`

#### `generateUsageExample`

Generate a usage example for a pattern.

```typescript
import { generateUsageExample } from "@effect-patterns/toolkit"

const example = yield* generateUsageExample({
  pattern: myPattern,
  includeImports: true,
  moduleType: "esm",
})
```

**Returns**: `Effect<string, never>`

### Schema Validation

All schemas are defined using `@effect/schema` for runtime validation.

#### Pattern Schemas

```typescript
import { Pattern, PatternSummary, PatternsIndex } from "@effect-patterns/toolkit"
import { Schema } from "@effect/schema"

// Validate pattern data
const parsePattern = Schema.decodeUnknown(Pattern)
const result = yield* parsePattern(rawData)
```

**Available Schemas**:
- `Pattern` - Full pattern with all fields
- `PatternSummary` - Lightweight summary for lists
- `PatternsIndex` - Complete patterns index

#### Request/Response Schemas

```typescript
import {
  SearchPatternsRequest,
  SearchPatternsResponse,
  GenerateRequest,
  GenerateResponse,
  ExplainPatternRequest,
} from "@effect-patterns/toolkit"
```

**Search Request**:
```typescript
const searchRequest: typeof SearchPatternsRequest.Type = {
  query: "retry",
  skillLevel: "intermediate",
  useCase: ["Error Management"],
  limit: 10,
}
```

**Generate Request**:
```typescript
const generateRequest: typeof GenerateRequest.Type = {
  patternId: "retry-with-backoff",
  customName: "retryRequest",
  moduleType: "esm",
}
```

### Utilities

#### `splitSections`

Split pattern content into sections.

```typescript
import { splitSections } from "@effect-patterns/toolkit"

const sections = splitSections(pattern.content)
// Returns: { useCase, goodExample, antiPattern, rationale, tradeoffs }
```

#### `sanitizeInput`

Sanitize user input to prevent injection attacks.

```typescript
import { sanitizeInput } from "@effect-patterns/toolkit"

const safe = sanitizeInput(userInput)
```

## Type Safety

All functions return `Effect` types with explicit error channels:

```typescript
// Pattern loading can fail with file system or JSON errors
Effect<PatternsIndex, FileSystemError | JsonParseError>

// Search never fails (returns empty array on no matches)
Effect<Pattern[], never>

// Code generation never fails (returns default template on errors)
Effect<string, never>
```

## Use Cases

### Building a Pattern Search API

```typescript
import { Effect } from "effect"
import { loadPatternsFromJson, searchPatterns } from "@effect-patterns/toolkit"

const searchApi = (query: string) =>
  Effect.gen(function* () {
    const index = yield* loadPatternsFromJson("./data/patterns.json")
    const results = yield* searchPatterns({
      patterns: index.patterns,
      query,
      limit: 20,
    })
    return results
  })
```

### Creating a Code Generator CLI

```typescript
import { Effect } from "effect"
import { getPatternById, buildSnippet } from "@effect-patterns/toolkit"

const generateCode = (patternId: string, functionName: string) =>
  Effect.gen(function* () {
    const index = yield* loadPatternsFromJson("./data/patterns.json")
    const pattern = yield* getPatternById(index.patterns, patternId)

    if (!pattern) {
      return yield* Effect.fail(new Error("Pattern not found"))
    }

    const snippet = yield* buildSnippet({
      pattern,
      customName: functionName,
      moduleType: "esm",
    })

    return snippet
  })
```

### Validating Pattern Data

```typescript
import { Schema } from "@effect/schema"
import { Pattern } from "@effect-patterns/toolkit"

const validatePattern = (data: unknown) =>
  Effect.gen(function* () {
    const pattern = yield* Schema.decodeUnknown(Pattern)(data)
    return pattern
  }).pipe(
    Effect.catchAll((error) => {
      console.error("Validation failed:", error)
      return Effect.fail(error)
    })
  )
```

## Architecture

The toolkit follows Effect best practices:

- **Pure Functions**: All business logic is pure and testable
- **Effect Wrappers**: All I/O operations return `Effect`
- **Dependency Injection**: Uses Effect's Layer system for dependencies
- **Error Handling**: Explicit error types in Effect channels
- **Schema Validation**: Runtime validation with `@effect/schema`

## Testing

```bash
# Run tests
bun test

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

Example test:

```typescript
import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { searchPatterns } from "@effect-patterns/toolkit"

describe("searchPatterns", () => {
  it("should find patterns by query", async () => {
    const patterns = [
      {
        id: "test-pattern",
        title: "Retry with Backoff",
        summary: "Handle retries",
        // ... other fields
      },
    ]

    const results = await Effect.runPromise(
      searchPatterns({
        patterns,
        query: "retry",
      })
    )

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe("test-pattern")
  })
})
```

## Contributing

See the main [CONTRIBUTING.md](../../docs/guides/CONTRIBUTING.md) for guidelines.

When contributing to the toolkit:

1. All functions should return `Effect` types
2. Use `@effect/schema` for validation
3. Add tests for new functions
4. Update TypeScript types
5. Run `bun test` before committing

## License

MIT © Paul Philp

---

**Part of the [Effect Patterns Hub](https://github.com/PaulJPhilp/Effect-Patterns)**

For more information:
- [Main Documentation](../../README.md)
- [MCP Server](../../services/mcp-server/README.md)
- [CLI Tool](../../scripts/ep.ts)
