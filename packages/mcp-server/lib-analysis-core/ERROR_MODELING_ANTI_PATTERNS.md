# Error Modeling Anti-Patterns (Effect)

These anti-patterns indicate weak, leaky, or misleading error models in Effect-TS codebases. They don't always crash code — they quietly make systems harder to reason about, observe, and evolve.

## Overview

Error modeling anti-patterns focus on **error semantics**, not syntax. Most are detectable via AST + heuristics and pair naturally with refactoring fixes. These rules strengthen:
- **Resilience** - Better error recovery strategies
- **Observability** - Structured error tracking and metrics
- **Migration safety** - Type-safe error evolution
- **Long-term maintainability** - Clear error contracts

---

## 1. Using Error as the Public Error Type

**Rule ID**: `error-as-public-type`  
**Severity**: Medium  
**Category**: errors  
**Fix ID**: `replace-error-with-tagged-type`

### The Problem

```typescript
// ❌ Bad - Generic Error loses domain meaning
Effect<Success, Error>
```

**Why this is bad:**
- Loses domain meaning
- Makes retries and recovery vague
- Breaks error-specific handling
- Weakens observability

### Better Approach

```typescript
// ✅ Good - Tagged error unions
import { Data } from "effect";

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly url: string;
  readonly statusCode: number;
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
}> {}

type AppError = NetworkError | ValidationError;

Effect<Success, AppError>
```

---

## 2. Mixing Multiple Error Shapes in One Effect

**Rule ID**: `mixed-error-shapes`  
**Severity**: Medium–High  
**Category**: errors  
**Fix ID**: `normalize-error-shapes`

### The Problem

```typescript
// ❌ Bad - Mixed error types
Effect<Success, Error | string | number>
```

**Why this is bad:**
- Forces defensive programming everywhere
- Indicates missing normalization boundary
- Makes pattern matching unreliable

### Better Approach

```typescript
// ✅ Good - Normalize at boundaries
class ParseError extends Data.TaggedError("ParseError")<{
  readonly input: unknown;
  readonly reason: string;
}> {}

// Normalize different error sources
const normalizeError = (error: unknown): ParseError => {
  if (typeof error === "string") {
    return new ParseError({ input: error, reason: error });
  }
  if (typeof error === "number") {
    return new ParseError({ input: error, reason: `Code: ${error}` });
  }
  if (error instanceof Error) {
    return new ParseError({ input: error, reason: error.message });
  }
  return new ParseError({ input: error, reason: "Unknown error" });
};

Effect<Success, ParseError>
```

---

## 3. Converting Errors to Strings Early

**Rule ID**: `convert-errors-to-strings-early`  
**Severity**: Medium  
**Category**: errors  
**Fix ID**: `preserve-error-structure`

### The Problem

```typescript
// ❌ Bad - Destroys structure
Effect.fail(error.message)
```

**Why this is bad:**
- Destroys structure
- Loses causal context
- Makes tracing and metrics useless

### Better Approach

```typescript
// ✅ Good - Preserve error data
class ProcessingError extends Data.TaggedError("ProcessingError")<{
  readonly cause: Error;
  readonly context: Record<string, unknown>;
  readonly timestamp: Date;
}> {}

Effect.fail(new ProcessingError({
  cause: error,
  context: { userId, operation },
  timestamp: new Date()
}))

// Attach human-readable messages later (UI/logging)
const formatForUser = (error: ProcessingError): string =>
  `Processing failed: ${error.cause.message}`;
```

---

## 4. Catch-and-Rethrow with Generic Errors

**Rule ID**: `catch-and-rethrow-generic`  
**Severity**: Medium–High  
**Category**: errors  
**Fix ID**: `wrap-error-with-context`

### The Problem

```typescript
// ❌ Bad - Loses original failure information
Effect.catchAll(() => Effect.fail(new Error("failed")))
```

**Why this is bad:**
- Loses original failure information
- Hides root causes
- Breaks retries based on error type

### Better Approach

```typescript
// ✅ Good - Wrap with context, preserve original
class OperationError extends Data.TaggedError("OperationError")<{
  readonly operation: string;
  readonly cause: unknown;
  readonly retryable: boolean;
}> {}

Effect.catchAll((originalError) =>
  Effect.fail(new OperationError({
    operation: "fetchUser",
    cause: originalError,
    retryable: originalError instanceof NetworkError
  }))
)
```

---

## 5. Catching Errors Too Early

**Rule ID**: `catching-errors-too-early`  
**Severity**: Medium  
**Category**: errors  
**Fix ID**: `propagate-errors-upward`

### The Problem

Catching errors deep inside business logic instead of letting them propagate.

**Why this is bad:**
- Prevents higher-level recovery strategies
- Forces decisions at the wrong layer
- Reduces composability

### Better Approach

```typescript
// ❌ Bad - Catching too early
const processItem = (item: Item) =>
  Effect.gen(function* () {
    const result = yield* fetchData(item.id).pipe(
      Effect.catchAll(() => Effect.succeed(null)) // Too early!
    );
    // Now forced to handle null everywhere
  });

// ✅ Good - Let errors flow upward
const processItem = (item: Item) =>
  Effect.gen(function* () {
    const result = yield* fetchData(item.id);
    return transform(result);
  });

// Handle at meaningful boundary
const processAllItems = (items: Item[]) =>
  Effect.all(items.map(processItem)).pipe(
    Effect.catchTag("NetworkError", () => retryStrategy()),
    Effect.catchTag("ValidationError", () => skipAndLog())
  );
```

---

## 6. Treating Expected Domain States as Errors

**Rule ID**: `expected-states-as-errors`  
**Severity**: Medium  
**Category**: errors  
**Fix ID**: `model-expected-states-as-data`

### The Problem

```typescript
// ❌ Bad - Expected states in error channel
Effect.fail("NotFound")
```

**Why this is bad:**
- Overloads the error channel
- Makes control flow unclear
- Encourages excessive `catchAll`

### Better Approach

```typescript
// ✅ Good - Model as data with Option/Either
import { Option } from "effect";

const findUser = (id: string): Effect.Effect<Option.Option<User>, DbError> =>
  Effect.gen(function* () {
    const result = yield* db.query(`SELECT * FROM users WHERE id = ?`, [id]);
    return Option.fromNullable(result);
  });

// Use pattern matching for expected states
findUser(userId).pipe(
  Effect.map(
    Option.match({
      onNone: () => showNotFoundUI(),
      onSome: (user) => showUserProfile(user)
    })
  )
);
```

---

## 7. Using Exceptions for Domain Errors

**Rule ID**: `exceptions-for-domain-errors`  
**Severity**: High  
**Category**: errors  
**Fix ID**: `use-effect-fail-for-domain-errors`

### The Problem

```typescript
// ❌ Bad - Throws bypass typed error channel
throw new DomainError(...)
```

inside Effect logic.

**Why this is bad:**
- Bypasses typed error channel
- Breaks observability
- Escapes supervision

### Better Approach

```typescript
// ❌ Bad
Effect.gen(function* () {
  if (!isValid(input)) {
    throw new ValidationError("Invalid input"); // Escapes!
  }
});

// ✅ Good - Use Effect.fail
class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly value: unknown;
}> {}

Effect.gen(function* () {
  if (!isValid(input)) {
    return yield* Effect.fail(new ValidationError({
      field: "email",
      value: input
    }));
  }
});
```

---

## 8. Error Tags Without Payloads

**Rule ID**: `error-tags-without-payloads`  
**Severity**: Low–Medium  
**Category**: errors  
**Fix ID**: `add-error-payload-fields`

### The Problem

```typescript
// ❌ Bad - No context
type MyError = { _tag: "MyError" }
```

**Why this is limiting:**
- No context
- No metadata
- Hard to debug in production

### Better Approach

```typescript
// ✅ Good - Include relevant fields
class MyError extends Data.TaggedError("MyError")<{
  readonly userId: string;
  readonly operation: string;
  readonly timestamp: Date;
  readonly cause?: Error;
  readonly metadata?: Record<string, unknown>;
}> {}
```

---

## 9. Overusing unknown as Error Channel

**Rule ID**: `overusing-unknown-error-channel`  
**Severity**: Medium  
**Category**: errors  
**Fix ID**: `narrow-unknown-error-type`

### The Problem

```typescript
// ❌ Bad - Forces type assertions
Effect<Success, unknown>
```

**Why this is bad:**
- Forces downstream type assertions
- Indicates missing modeling
- Makes safe recovery difficult

### Better Approach

```typescript
// ❌ Bad
const process = (input: unknown): Effect.Effect<Result, unknown> => {
  // Consumers forced to use type assertions
};

// ✅ Good - Narrow as early as possible
class ParseError extends Data.TaggedError("ParseError")<{
  readonly input: unknown;
}> {}

class ProcessError extends Data.TaggedError("ProcessError")<{
  readonly step: string;
}> {}

type ProcessErrors = ParseError | ProcessError;

const process = (input: unknown): Effect.Effect<Result, ProcessErrors> => {
  // Type-safe error handling
};
```

---

## 10. Logging Errors Instead of Modeling Them

**Rule ID**: `logging-instead-of-modeling-errors`  
**Severity**: Medium  
**Category**: errors  
**Fix ID**: `structure-error-propagation`

### The Problem

```typescript
// ❌ Bad - Only logging, no structured propagation
Effect.tapError(e => Effect.log(e))
```

**Why this is bad:**
- Logging is not handling
- Errors still need meaning and shape
- Logs disappear; types don't

### Better Approach

```typescript
// ✅ Good - Log AND model
class ServiceError extends Data.TaggedError("ServiceError")<{
  readonly service: string;
  readonly operation: string;
  readonly cause: Error;
  readonly timestamp: Date;
}> {}

Effect.gen(function* () {
  // ...
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      // Log for observability
      yield* Effect.logError("Service operation failed", {
        service: "UserService",
        operation: "fetchProfile",
        error
      });
      
      // Model for type-safe propagation
      return yield* Effect.fail(new ServiceError({
        service: "UserService",
        operation: "fetchProfile",
        cause: error,
        timestamp: new Date()
      }));
    })
  )
);
```

---

## Detection Strategy

### AST Patterns to Match

1. **Generic Error Type**: Look for `Effect<*, Error>` in type annotations
2. **Mixed Error Shapes**: Detect union types with primitive types in error channel
3. **String Conversion**: Find `Effect.fail(*.message)` or string concatenation
4. **Generic Rethrow**: Match `catchAll(() => Effect.fail(new Error(...)))`
5. **Early Catching**: Detect `catchAll` in non-boundary code
6. **String Failures**: Find `Effect.fail("string literal")`
7. **Throw in Effect**: Detect `throw` statements inside Effect.gen
8. **Empty Error Tags**: Find error types with only `_tag` field
9. **Unknown Error Channel**: Detect `Effect<*, unknown>` in public APIs
10. **Logging Only**: Find `tapError` without corresponding error modeling

### Context Detection

- Identify boundary files (routes, CLI, main)
- Track Effect.gen contexts
- Detect error handling combinators (catchAll, catchTag, etc.)
- Analyze type annotations in function signatures

---

## Implementation Status

✅ **Fully Integrated** - All 10 error modeling anti-patterns are now part of the Effect Patterns analysis system:

- Type definitions updated with rule IDs and fix IDs
- Fix definitions added for all 10 patterns
- Rule definitions with comprehensive messages
- Test coverage complete (73 expect calls)
- Available via MCP server for code analysis

## Summary Statistics

- **Total Anti-Patterns**: Now 38 (28 previous + 10 error modeling)
- **Total Fix Definitions**: Now 30 (20 previous + 10 error modeling)
- **Severity Distribution**:
  - High: 15 rules (3 new)
  - Medium: 21 rules (7 new)
  - Low: 2 rules

## Educational Value

These rules have **high educational value** because they:

1. **Teach Effect error patterns**: Encourage proper error modeling with tagged unions
2. **Improve observability**: Promote structured error data over strings
3. **Enhance resilience**: Enable type-safe error recovery strategies
4. **Support evolution**: Make error contracts explicit and migration-safe

## Ideal Use Cases

- **Read-only code review first**: Identify error modeling issues
- **Pro auto-fixes**: Automated refactoring for common patterns
- **Team education**: Learn Effect error handling best practices
- **Migration support**: Upgrade legacy error handling to Effect patterns

These rules focus on error semantics and help teams build more maintainable, observable, and resilient Effect-TS applications.
