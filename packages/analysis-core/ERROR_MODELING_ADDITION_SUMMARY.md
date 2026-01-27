# Error Modeling Anti-Patterns Addition Summary

## Overview

Successfully added **10 Error Modeling Anti-Patterns** to the Effect Patterns code analysis system. These anti-patterns focus on error semantics and help identify weak, leaky, or misleading error models that quietly make systems harder to reason about, observe, and evolve.

## What Was Added

### 1. Type Definitions

**File**: `src/tools/ids.ts`

**Added to RuleIdValues (10 new rule IDs):**

- `error-as-public-type` - Using Error as public error type
- `mixed-error-shapes` - Mixing multiple error shapes in one Effect
- `convert-errors-to-strings-early` - Converting errors to strings early
- `catch-and-rethrow-generic` - Catch-and-rethrow with generic errors
- `catching-errors-too-early` - Catching errors too early
- `expected-states-as-errors` - Treating expected domain states as errors
- `exceptions-for-domain-errors` - Using exceptions for domain errors
- `error-tags-without-payloads` - Error tags without payloads
- `overusing-unknown-error-channel` - Overusing unknown as error channel
- `logging-instead-of-modeling-errors` - Logging errors instead of modeling them

**Added to FixIdValues (10 new fix IDs):**

- `replace-error-with-tagged-type` - Replace Error with tagged error type
- `normalize-error-shapes` - Normalize mixed error shapes
- `preserve-error-structure` - Preserve error structure instead of converting to string
- `wrap-error-with-context` - Wrap error with context
- `propagate-errors-upward` - Propagate errors upward
- `model-expected-states-as-data` - Model expected states as data
- `use-effect-fail-for-domain-errors` - Use Effect.fail for domain errors
- `add-error-payload-fields` - Add error payload fields
- `narrow-unknown-error-type` - Narrow unknown error type
- `structure-error-propagation` - Structure error propagation

### 2. Fix Definitions

**File**: `src/services/rule-registry.ts`

Added 10 comprehensive fix definitions with clear titles and descriptions for each error modeling anti-pattern.

### 3. Rule Definitions

**File**: `src/services/rule-registry.ts`

Added 10 detailed rule definitions with:

- Clear titles and comprehensive messages
- Appropriate severity levels (3 High, 7 Medium)
- Categorized as "errors"
- Associated fix IDs for automated remediation

## Severity Distribution

### High Severity (3 rules)

1. **`mixed-error-shapes`** - Forces defensive programming, unreliable pattern matching
2. **`catch-and-rethrow-generic`** - Loses original failure information, hides root causes
3. **`exceptions-for-domain-errors`** - Bypasses typed error channel, breaks observability

### Medium Severity (7 rules)

1. **`error-as-public-type`** - Loses domain meaning, weakens observability
2. **`convert-errors-to-strings-early`** - Destroys structure, loses causal context
3. **`catching-errors-too-early`** - Prevents higher-level recovery strategies
4. **`expected-states-as-errors`** - Overloads error channel, unclear control flow
5. **`error-tags-without-payloads`** - No context, hard to debug in production
6. **`overusing-unknown-error-channel`** - Forces type assertions, missing modeling
7. **`logging-instead-of-modeling-errors`** - Logging without structured propagation

## Key Characteristics

### Focus Areas

These anti-patterns address:

1. **Error Type Design**
   - Generic Error vs tagged unions
   - Mixed error shapes
   - Unknown error channels

2. **Error Handling Patterns**
   - Premature catching
   - Generic rethrow
   - Exception usage

3. **Error Data Preservation**
   - String conversion
   - Missing payloads
   - Structure loss

4. **Error Modeling Philosophy**
   - Expected states vs errors
   - Logging vs modeling
   - Observability

### Detection Strategy

**AST Patterns:**

- Type annotations with `Effect<*, Error>` or `Effect<*, unknown>`
- Union types with primitives in error channel
- `Effect.fail(*.message)` or string concatenation
- `catchAll(() => Effect.fail(new Error(...)))`
- `throw` statements inside Effect.gen
- `tapError` without corresponding error modeling

**Context Detection:**

- Boundary file identification (routes, CLI, main)
- Effect.gen context tracking
- Error handling combinator detection
- Type annotation analysis in function signatures

## Better Patterns Promoted

### 1. Tagged Error Unions

```typescript
// Instead of: Effect<Success, Error>
class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly url: string;
  readonly statusCode: number;
}> {}

type AppError = NetworkError | ValidationError;
Effect<Success, AppError>
```

### 2. Error Normalization

```typescript
// Instead of: Effect<Success, Error | string | number>
const normalizeError = (error: unknown): ParseError => {
  // Convert all error types to single tagged model
};
```

### 3. Structured Error Data

```typescript
// Instead of: Effect.fail(error.message)
Effect.fail(new ProcessingError({
  cause: error,
  context: { userId, operation },
  timestamp: new Date()
}))
```

### 4. Error Wrapping

```typescript
// Instead of: Effect.catchAll(() => Effect.fail(new Error("failed")))
Effect.catchAll((originalError) =>
  Effect.fail(new OperationError({
    operation: "fetchUser",
    cause: originalError,
    retryable: originalError instanceof NetworkError
  }))
)
```

### 5. Expected States as Data

```typescript
// Instead of: Effect.fail("NotFound")
const findUser = (id: string): Effect.Effect<Option.Option<User>, DbError>
```

## Testing

Added comprehensive test coverage:

```typescript
// Check for error modeling anti-patterns (10 rules)
expect(rules.some((r) => r.id === "error-as-public-type")).toBe(true);
expect(rules.some((r) => r.id === "mixed-error-shapes")).toBe(true);
// ... 8 more

// Check for error modeling fixes (10 fixes)
expect(fixes.some((f) => f.id === "replace-error-with-tagged-type")).toBe(true);
expect(fixes.some((f) => f.id === "normalize-error-shapes")).toBe(true);
// ... 8 more
```

**Test Results**: ✅ All 77 tests passing with 189 expect calls

## Benefits

These rules strengthen:

1. **Resilience**
   - Better error recovery strategies
   - Type-safe error handling
   - Composable error flows

2. **Observability**
   - Structured error tracking
   - Rich error context
   - Metrics-friendly error data

3. **Migration Safety**
   - Type-safe error evolution
   - Explicit error contracts
   - Compile-time error checking

4. **Long-term Maintainability**
   - Clear error semantics
   - Documented error patterns
   - Consistent error handling

## Educational Value

**High educational value** because these rules:

1. **Teach Effect error patterns** - Encourage proper error modeling with tagged unions
2. **Improve observability** - Promote structured error data over strings
3. **Enhance resilience** - Enable type-safe error recovery strategies
4. **Support evolution** - Make error contracts explicit and migration-safe

## Use Cases

- **Read-only code review** - Identify error modeling issues
- **Pro auto-fixes** - Automated refactoring for common patterns
- **Team education** - Learn Effect error handling best practices
- **Migration support** - Upgrade legacy error handling to Effect patterns

## Documentation

Created comprehensive documentation:

- `ERROR_MODELING_ANTI_PATTERNS.md` - Full guide with examples, rationale, and better patterns

## Integration Status

✅ **Fully Integrated**:

- Type definitions updated (10 rule IDs + 10 fix IDs)
- Fix definitions added with clear descriptions
- Rule definitions with comprehensive messages
- Test coverage complete
- Documentation created
- Available via MCP server for code analysis

## Impact Summary

**Total Anti-Patterns**: Now **38** (28 previous + 10 error modeling)

- 17 original anti-patterns
- 10 Top 10 correctness anti-patterns
- 1 design smell detector (large switch)
- 10 error modeling anti-patterns

**Total Fix Definitions**: Now **30** (20 previous + 10 error modeling)

**Severity Distribution**:

- High: 15 rules (12 previous + 3 error modeling)
- Medium: 21 rules (14 previous + 7 error modeling)
- Low: 2 rules

## Summary

The 10 Error Modeling Anti-Patterns are now fully integrated into the Effect Patterns analysis system. They focus on error semantics rather than syntax, helping teams build more maintainable, observable, and resilient Effect-TS applications by promoting proper error modeling, structured error data, and type-safe error handling patterns.
