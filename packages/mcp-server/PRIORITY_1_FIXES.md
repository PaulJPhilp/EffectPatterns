# Priority 1 Fixes - Effect Pattern Anti-Patterns

## Summary

Fixed critical Effect-TS anti-patterns in the mcp-server package that were undermining the benefits of Effect's type system and error handling.

## Changes Made

### 1. Error Classes Now Use `Data.TaggedError` ✅

**File:** `src/services/review-code/errors.ts`

**Before:**
```typescript
export class FileSizeError extends Error {
  readonly _tag = "FileSizeError";
  constructor(readonly size: number, readonly maxSize: number) {
    super(`File size ${size} bytes exceeds maximum of ${maxSize} bytes`);
  }
}
```

**After:**
```typescript
import { Data } from "effect";

export class FileSizeError extends Data.TaggedError("FileSizeError")<{
  readonly size: number;
  readonly maxSize: number;
}> {
  get message() {
    return `File size ${this.size} bytes exceeds maximum of ${this.maxSize} bytes`;
  }
}
```

**Benefits:**
- ✅ Structural equality with `Equal.equals`
- ✅ Pattern matching with `Effect.catchTag` and `Effect.catchTags`
- ✅ Proper type inference in error channels
- ✅ Immutable error instances

**Instantiation:**
```typescript
// Old: new FileSizeError(size, maxSize)
// New: new FileSizeError({ size, maxSize })
```

### 2. Removed `try/catch` Inside `Effect.gen` ✅

**File:** `src/services/validation/api.ts`

**Before:**
```typescript
const validatePatternSearch = (request: RequestValidation) =>
  Effect.gen(function* () {
    try {
      // validation logic
      yield* Effect.fail(new ValidationError({ /* ... */ }));
    } catch (error) {
      yield* logger.error("Validation failed", error);
      throw error; // ❌ Bypasses typed error channel
    }
  });
```

**After:**
```typescript
const validatePatternSearch = (request: RequestValidation) =>
  Effect.gen(function* () {
    // validation logic
    yield* Effect.fail(new ValidationError({ /* ... */ }));
  }).pipe(
    Effect.tapError((error) =>
      logger.error("Validation failed", error)
    )
  );
```

**Benefits:**
- ✅ Errors flow through typed error channel
- ✅ Type inference works correctly
- ✅ Composable error handling
- ✅ No exception bypassing

**Functions Fixed:**
- `validatePatternSearch`
- `validatePatternRetrieval`
- `validateApiKey`
- `validateRequestBodySize`
- `validateRequestHeaders`
- `validateSchema`
- `validateRequest`

### 3. Fixed Unreachable Code After `Effect.fail` ✅

**Before:**
```typescript
yield* Effect.fail(new ValidationError({ /* ... */ }));
throw new Error("Unreachable"); // ❌ Dead code
```

**After:**
```typescript
return yield* Effect.fail(new ValidationError({ /* ... */ }));
```

**Benefits:**
- ✅ Cleaner code
- ✅ No dead code warnings
- ✅ Explicit control flow

## Test Results

All tests pass after changes:

### Review Code Service
```
✓ 13 tests passed
✓ 40 expect() calls
```

### Validation Service
```
✓ 22 tests passed
✓ 55 expect() calls
```

## Impact

### Type Safety
- Error types are now properly tracked through the type system
- Pattern matching with `catchTag` is now possible
- Better IDE autocomplete and type inference

### Error Handling
- Errors flow through Effect's error channel
- No more exception bypassing
- Composable error handling with `pipe`

### Code Quality
- Removed 7 try/catch blocks
- Eliminated dead code
- More idiomatic Effect-TS patterns

## Migration Guide

### For Error Instantiation

```typescript
// Before
throw new FileSizeError(size, maxSize)
yield* Effect.fail(new FileSizeError(size, maxSize))

// After
throw new FileSizeError({ size, maxSize })
yield* Effect.fail(new FileSizeError({ size, maxSize }))
```

### For Error Handling

```typescript
// Before
try {
  yield* someEffect
} catch (error) {
  yield* logger.error("Failed", error)
  throw error
}

// After
someEffect.pipe(
  Effect.tapError((error) => logger.error("Failed", error))
)
```

## Next Steps

Consider implementing Priority 2 fixes:
1. Replace mutable state with `Ref`
2. Add explicit error types to all Effect signatures
3. Replace `Effect.runSync` in callbacks with Effect scheduling
4. Standardize service patterns (use `Effect.Service` everywhere)

---

**Date:** 2026-01-21
**Reviewer:** AI Code Review
**Status:** ✅ Complete - All tests passing
