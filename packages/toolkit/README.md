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
- �️ **Database Integration** - Full PostgreSQL support with Drizzle ORM
- 🏗️ **Service Layer** - Effect-based dependency injection
- �📦 **Zero Runtime Dependencies** - Only peer dependencies on Effect ecosystem
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
import { Effect } from "effect";
import {
  loadPatternsFromDatabase,
  searchPatternsDb,
  getPatternByIdDb,
  buildSnippet,
  DatabaseLayer,
} from "@effect-patterns/toolkit";
import { NodeContext } from "@effect/platform-node";

// Load patterns from database
const program = Effect.gen(function* () {
  // Load all patterns from database
  const patterns = yield* loadPatternsFromDatabase;
  console.log(`Loaded ${patterns.length} patterns`);

  // Search patterns in database
  const results = yield* searchPatternsDb({
    query: "retry",
    skillLevel: "intermediate",
    limit: 10,
  });
  console.log(`Found ${results.length} patterns`);

  // Get specific pattern from database
  const pattern = yield* getPatternByIdDb("retry-with-backoff");

  if (pattern) {
    // Generate code snippet
    const snippet = yield* buildSnippet({
      pattern,
      customName: "retryRequest",
      moduleType: "esm",
    });
    console.log(snippet);
  }
});

// Run the program with database layer
Effect.runPromise(
  program.pipe(
    Effect.provide(DatabaseLayer),
    Effect.provide(NodeContext.layer)
  )
);
```

## API Reference

### Pattern Loading

#### `loadPatternsFromDatabase`

Load all patterns from the PostgreSQL database using Effect.

```typescript
import { loadPatternsFromDatabase, DatabaseLayer } from "@effect-patterns/toolkit";
import { Effect } from "effect";
import { NodeContext } from "@effect/platform-node";

const program = Effect.gen(function* () {
  const patterns = yield* loadPatternsFromDatabase;
  return patterns;
}).pipe(
  Effect.provide(DatabaseLayer),
  Effect.provide(NodeContext.layer)
);
```

**Returns**: `Effect<Pattern[], DatabaseError | ServiceError>`

#### `getPatternFromDatabase`

Get a specific pattern by ID from the database.

```typescript
import { getPatternFromDatabase } from "@effect-patterns/toolkit";

const pattern = yield* getPatternFromDatabase("retry-with-backoff");
```

**Returns**: `Effect<Pattern | null, DatabaseError | PatternNotFoundError>`

### Pattern Search

#### `searchPatternsDb`

Search and filter patterns in the database with type-safe criteria.

```typescript
import { searchPatternsDb } from "@effect-patterns/toolkit";

const results = yield* searchPatternsDb({
  query: "error handling",
  skillLevel: "intermediate",
  category: "error-handling",
  tags: ["catchTag", "retry"],
  limit: 10,
});
```

**Parameters**:

- `query?`: `string` - Text search across title, summary, and content
- `skillLevel?`: `"beginner" | "intermediate" | "advanced"` - Filter by skill level
- `category?`: `string` - Filter by pattern category
- `tags?`: `string[]` - Filter by tags
- `limit?`: `number` - Maximum number of results

**Returns**: `Effect<Pattern[], DatabaseError>`

#### `getPatternByIdDb`

Get a specific pattern by ID from the database.

```typescript
import { getPatternByIdDb } from "@effect-patterns/toolkit";

const pattern = yield* getPatternByIdDb("retry-with-backoff");

if (pattern) {
  console.log(pattern.title);
}
```

**Returns**: `Effect<Pattern | null, DatabaseError | PatternNotFoundError>`

#### `searchPatterns` (Legacy)

Search patterns in memory (for backward compatibility).

```typescript
import { searchPatterns } from "@effect-patterns/toolkit";

const results = yield* searchPatterns({
  patterns: patternArray,
  query: "error handling",
  skillLevel: "intermediate",
  limit: 10,
});
```

**Returns**: `Effect<Pattern[], never>`

### Code Generation

#### `buildSnippet`

Generate a code snippet from a pattern template.

```typescript
import { buildSnippet } from "@effect-patterns/toolkit";

const snippet =
  yield *
  buildSnippet({
    pattern: myPattern,
    customName: "myFunction",
    customInput: "fetch('/api/data')",
    moduleType: "esm", // or "commonjs"
  });

console.log(snippet);
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
import { generateUsageExample } from "@effect-patterns/toolkit";

const example =
  yield *
  generateUsageExample({
    pattern: myPattern,
    includeImports: true,
    moduleType: "esm",
  });
```

**Returns**: `Effect<string, never>`

### Database Services

#### Database Layer

Complete database service layer with dependency injection.

```typescript
import { DatabaseLayer, DatabaseService } from "@effect-patterns/toolkit";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const dbService = yield* DatabaseService;
  // Use database connection
  return { connected: true };
}).pipe(
  Effect.provide(DatabaseLayer)
);
```

#### Repository Services

Effect-based repository pattern for data access.

```typescript
import {
  EffectPatternRepositoryService,
  ApplicationPatternRepositoryService,
  JobRepositoryService,
} from "@effect-patterns/toolkit";

const program = Effect.gen(function* () {
  const patternRepo = yield* EffectPatternRepositoryService;
  const appRepo = yield* ApplicationPatternRepositoryService;
  const jobRepo = yield* JobRepositoryService;
  
  // Use repositories
  const patterns = yield* patternRepo.findAll();
  return patterns;
});
```

#### High-Level Database Operations

```typescript
import {
  findEffectPatternBySlug,
  searchEffectPatterns,
  findApplicationPatternBySlug,
  getCoverageStats,
} from "@effect-patterns/toolkit";

// Find pattern by slug
const pattern = yield* findEffectPatternBySlug("retry-with-backoff");

// Search with advanced filters
const results = yield* searchEffectPatterns({
  query: "retry",
  skillLevel: "intermediate",
  limit: 20,
});

// Get coverage statistics
const stats = yield* getCoverageStats();
```

### Schema Validation

All schemas are defined using `@effect/schema` for runtime validation.

#### Pattern Schemas

```typescript
import {
  Pattern,
  PatternSummary,
  PatternCategory,
  DifficultyLevel,
} from "@effect-patterns/toolkit";
import { Schema } from "@effect/schema";

// Validate pattern data
const parsePattern = Schema.decodeUnknown(Pattern);
const result = yield* parsePattern(rawData);
```

**Available Schemas**:

- `Pattern` - Full pattern with all fields
- `PatternSummary` - Lightweight summary for lists
- `PatternCategory` - Pattern category enum
- `DifficultyLevel` - Skill level enum
- `CodeExample` - Code example structure

#### Database Schemas

```typescript
import {
  effectPatterns,
  applicationPatterns,
  jobs,
  type EffectPattern as DbEffectPattern,
  type ApplicationPattern as DbApplicationPattern,
  type Job as DbJob,
} from "@effect-patterns/toolkit";
```

#### Request Schemas

```typescript
import { GenerateRequest } from "@effect-patterns/toolkit";

const generateRequest: typeof GenerateRequest.Type = {
  patternId: "retry-with-backoff",
  customName: "retryRequest",
  moduleType: "esm",
};
```

### Utilities

#### `splitSections`

Split pattern content into structured sections.

```typescript
import { splitSections } from "@effect-patterns/toolkit";

const sections = splitSections(pattern.content);
// Returns: { useCase, goodExample, antiPattern, rationale, tradeoffs }
```

#### `sanitizeInput`

Sanitize user input to prevent injection attacks.

```typescript
import { sanitizeInput } from "@effect-patterns/toolkit";

const safe = sanitizeInput(userInput);
```

#### `toPatternSummary`

Convert full pattern to lightweight summary.

```typescript
import { toPatternSummary } from "@effect-patterns/toolkit";

const summary = toPatternSummary(fullPattern);
```

## Type Safety

All functions return `Effect` types with explicit error channels:

```typescript
// Database operations can fail with database errors
Effect<Pattern[], DatabaseError | ServiceError>;

// Search never fails (returns empty array on no matches)
Effect<Pattern[], never>;

// Code generation never fails (returns default template on errors)
Effect<string, never>;

// Repository operations have specific error types
Effect<Pattern | null, DatabaseError | PatternNotFoundError>;
```

## Use Cases

### Building a Pattern Search API

```typescript
import { Effect } from "effect";
import { searchEffectPatterns, DatabaseLayer } from "@effect-patterns/toolkit";
import { NodeContext } from "@effect/platform-node";

const searchApi = (query: string) =>
  Effect.gen(function* () {
    const results = yield* searchEffectPatterns({
      query,
      limit: 20,
    });
    return results;
  }).pipe(
    Effect.provide(DatabaseLayer),
    Effect.provide(NodeContext.layer)
  );
```

### Creating a Code Generator CLI

```typescript
import { Effect } from "effect";
import { getPatternByIdDb, buildSnippet, DatabaseLayer } from "@effect-patterns/toolkit";
import { NodeContext } from "@effect/platform-node";

const generateCode = (patternId: string, functionName: string) =>
  Effect.gen(function* () {
    const pattern = yield* getPatternByIdDb(patternId);

    if (!pattern) {
      return yield* Effect.fail(new Error("Pattern not found"));
    }

    const snippet = yield* buildSnippet({
      pattern,
      customName: functionName,
      moduleType: "esm",
    });

    return snippet;
  }).pipe(
    Effect.provide(DatabaseLayer),
    Effect.provide(NodeContext.layer)
  );
```

### Validating Pattern Data

```typescript
import { Schema } from "@effect/schema";
import { Pattern } from "@effect-patterns/toolkit";

const validatePattern = (data: unknown) =>
  Effect.gen(function* () {
    const pattern = yield* Schema.decodeUnknown(Pattern)(data);
    return pattern;
  }).pipe(
    Effect.catchAll((error) => {
      console.error("Validation failed:", error);
      return Effect.fail(error);
    })
  );
```

### Database Service Integration

```typescript
import { Effect } from "effect";
import {
  DatabaseService,
  EffectPatternRepositoryService,
  DatabaseLayer,
} from "@effect-patterns/toolkit";
import { NodeContext } from "@effect/platform-node";

const serviceProgram = Effect.gen(function* () {
  const dbService = yield* DatabaseService;
  const patternRepo = yield* EffectPatternRepositoryService;
  
  // Use services with proper error handling
  const patterns = yield* patternRepo.findAll();
  const stats = yield* patternRepo.getCoverageStats();
  
  return { patterns, stats };
}).pipe(
  Effect.provide(DatabaseLayer),
  Effect.provide(NodeContext.layer)
);
```

## Architecture

The toolkit follows Effect best practices:

- **Pure Functions**: All business logic is pure and testable
- **Effect Wrappers**: All I/O operations return `Effect`
- **Dependency Injection**: Uses Effect's Layer system for dependencies
- **Error Handling**: Explicit error types in Effect channels
- **Schema Validation**: Runtime validation with `@effect/schema`
- **Repository Pattern**: Clean data access with repository services
- **Service Layer**: Effect-based services with proper DI
- **Database Integration**: Full PostgreSQL support with Drizzle ORM

## Error Types

The toolkit provides specific error types for different operations:

```typescript
import {
  DatabaseError,
  PatternNotFoundError,
  PatternValidationError,
  ServiceUnavailableError,
  TemplateError,
  SearchError,
  ConfigurationError,
} from "@effect-patterns/toolkit";
```

- `DatabaseError` - Database connection and query errors
- `PatternNotFoundError` - Pattern not found in database
- `PatternValidationError` - Schema validation failures
- `ServiceUnavailableError` - Service layer errors
- `TemplateError` - Code generation errors
- `SearchError` - Search operation errors
- `ConfigurationError` - Configuration issues

## Testing

```bash
# Run tests
bun test

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

Example test with database layer:

```typescript
import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { searchPatternsDb, DatabaseLayer } from "@effect-patterns/toolkit";
import { NodeContext } from "@effect/platform-node";

describe("searchPatternsDb", () => {
  it("should find patterns by query", async () => {
    const results = await Effect.runPromise(
      searchPatternsDb({
        query: "retry",
        limit: 10,
      }).pipe(
        Effect.provide(DatabaseLayer),
        Effect.provide(NodeContext.layer)
      )
    );

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });
});
```

### Testing with Mock Services

```typescript
import { EffectPatternRepositoryService } from "@effect-patterns/toolkit";

// Test with custom layer
test("should work with test layer", async () => {
  const testLayer = Layer.succeed(
    EffectPatternRepositoryService,
    mockRepository
  );
  
  const result = await Effect.runPromise(
    program.pipe(Effect.provide(testLayer))
  );
});
```

## License

MIT © Paul Philp

## Contributing

See the main [CONTRIBUTING.md](../../docs/guides/CONTRIBUTING.md) for guidelines.

When contributing to the toolkit:

1. All functions should return `Effect` types
2. Use `@effect/schema` for validation
3. Add tests for new functions
4. Update TypeScript types
5. Run `bun test` before committing
6. Follow Effect.Service pattern for services
7. Use proper error types from `errors.ts`
8. Update database migrations if needed

## Database Setup

The toolkit requires PostgreSQL for full functionality:

```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Run migrations
bun run db:migrate

# Seed test data
bun run db:seed
```

Environment variables:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/effect_patterns
```
