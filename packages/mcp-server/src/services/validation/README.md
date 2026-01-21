# Validation Service

Request and data validation with comprehensive error reporting.

## Overview

The `MCPValidationService` validates API requests, request headers, body sizes, and arbitrary schemas with detailed error messages.

## API

### Pattern Search Validation

#### `validatePatternSearch(req: PatternSearchRequest): Effect<ValidatedPatternSearch, ValidationError>`

Validates pattern search requests including query, skill level, limits, use cases, and offsets.

```typescript
const result = yield* validation.validatePatternSearch({
  method: "GET",
  path: "/api/patterns",
  query: {
    query: "effect pattern",
    skillLevel: "intermediate",
    limit: "50"
  }
});
```

### Pattern Retrieval Validation

#### `validatePatternRetrieval(req: PatternRetrievalRequest): Effect<ValidatedPatternRetrieval, ValidationError>`

Validates pattern ID format (kebab-case, 3-100 chars).

```typescript
const result = yield* validation.validatePatternRetrieval({
  method: "GET",
  path: "/api/patterns/error-tagged-error"
});
```

### Request Validation

#### `validateRequest(req: Request, requireApiKey?: boolean): Effect<ValidatedRequest, ValidationError>`

Comprehensive request validation including authentication and routing.

```typescript
const result = yield* validation.validateRequest({
  method: "GET",
  path: "/api/patterns",
  headers: { "x-api-key": "abc123" },
  query: { query: "test" }
}, true);
```

### Header Validation

#### `validateRequestHeaders(headers: Record<string, string>): Effect<void, ValidationError>`

Validates required headers (user-agent, content-type).

```typescript
yield* validation.validateRequestHeaders({
  "user-agent": "my-client/1.0",
  "content-type": "application/json"
});
```

### Body Size Validation

#### `validateRequestBodySize(body: unknown, headers: Record<string, string>): Effect<void, ValidationError>`

Validates request body size against content-length header.

```typescript
yield* validation.validateRequestBodySize(
  { query: "test" },
  { "content-length": "42" }
);
```

### Schema Validation

#### `validateSchema<A>(schema: Schema<A>, value: unknown, path?: string): Effect<A, ValidationError>`

Validate arbitrary data against an Effect schema.

```typescript
import { Schema } from "effect";

const UserSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});

const result = yield* validation.validateSchema(
  UserSchema,
  { id: "123", name: "Alice" }
);
```

## Error Handling

```typescript
import { ValidationError } from "./services/validation";

const result = yield* validation.validatePatternSearch(req)
  .pipe(Effect.either);

if (Either.isLeft(result)) {
  const error = result.left as ValidationError;
  console.log(error.message);     // "Must be between..."
  console.log(error.path);        // "query.limit"
}
```

## Legacy Helpers

#### `validatePatternId(id: string): boolean`
Check if ID is kebab-case, 3-100 chars.

```typescript
validatePatternId("error-tagged-error");  // true
validatePatternId("Invalid_ID");          // false
```

#### `validateSkillLevel(level: unknown): boolean`
Check if skill level is valid (beginner, intermediate, advanced).

```typescript
validateSkillLevel("intermediate");  // true
validateSkillLevel("expert");        // false
```

## Example

```typescript
import { Effect } from "effect";
import { MCPValidationService } from "./services/validation";

const program = Effect.gen(function* () {
  const validation = yield* MCPValidationService;
  
  // Validate search request
  const search = yield* validation.validatePatternSearch({
    method: "GET",
    path: "/api/patterns",
    query: {
      query: "effect service",
      skillLevel: "beginner",
      limit: "25"
    }
  });
  
  console.log(search.query);       // "effect service"
  console.log(search.skillLevel);  // "beginner"
  console.log(search.limit);       // 25
});

Effect.runPromise(program);
```

## Types

```typescript
type SkillLevel = "beginner" | "intermediate" | "advanced";

interface ValidatedPatternSearch {
  query?: string;
  skillLevel?: SkillLevel;
  limit: number;
  offset: number;
  useCase?: readonly string[];
}

interface ValidatedPatternRetrieval {
  id: string;
}

class ValidationError extends Error {
  readonly path?: string;
  readonly received?: unknown;
}
```

## Testing

Run validation service tests:
```bash
bun run test src/services/validation/__tests__
```
