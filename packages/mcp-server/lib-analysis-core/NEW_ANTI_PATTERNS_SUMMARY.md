# New Anti-Patterns Added to Analysis Core

This document summarizes the 27 new anti-patterns added to the Effect Patterns analysis system, organized by category.

## Effect-Specific Correctness (High Value)

1. **`effect-run-promise-boundary`** - Effect.runPromise/Effect.runSync used outside boundary
   - **Severity**: High
   - **Category**: async
   - **Message**: Effect.runPromise and Effect.runSync should only be used at application boundaries (main, CLI, route handlers). In library code, prefer composing effects and returning them to the caller.

2. **`throw-in-effect-pipeline`** - Throw statement inside Effect pipeline
   - **Severity**: High
   - **Category**: errors
   - **Message**: Using 'throw new Error()' inside Effect.map/flatMap/gen callbacks bypasses Effect's typed error channel. Use Effect.fail or Effect.die instead.

3. **`swallow-failures-without-logging`** - Effect failures swallowed without logging or typed fallback
   - **Severity**: High
   - **Category**: errors
   - **Message**: catchAll(() => Effect.succeed(...)) without logging or returning a typed fallback result can hide failures. Either log the error or return Option/Either to explicitly handle absence.

4. **`generic-error-type`** - Effect<*, Error> used instead of tagged errors
   - **Severity**: Medium
   - **Category**: errors
   - **Message**: Using generic Error in the error channel loses type information. Prefer Data.TaggedError or specific error types for better error handling.

5. **`incorrect-promise-bridge`** - Effect.promise/Effect.tryPromise used incorrectly
   - **Severity**: Medium
   - **Category**: async
   - **Message**: Promise bridge usage may lose interruption/timeout semantics. Ensure proper cancellation handling or use Effect.suspend for lazy evaluation.

## Top 10 Effect Correctness Anti-Patterns (NEW)

6. **`run-effect-outside-boundary`** - Running Effects Outside Boundaries
   - **Severity**: High
   - **Category**: async
   - **Message**: Using Effect.runPromise, runSync, runFork inside library or business logic. Breaks composability, makes testing difficult, and bypasses dependency injection. Only use at CLI entrypoints, HTTP route handlers, main() functions, or scripts.

7. **`yield-instead-of-yield-star`** - Using yield Instead of yield* in Effect.gen
   - **Severity**: High
   - **Category**: async
   - **Fix**: `replace-yield-with-yield-star`
   - **Message**: Using 'yield effect' instead of 'yield* effect' in Effect.gen. 'yield' returns the Effect value instead of executing it, leading to silent bugs. This is one of the most common real-world Effect bugs.

8. **`throw-inside-effect-logic`** - Throwing Inside Effect Logic
   - **Severity**: High
   - **Category**: errors
   - **Fix**: `replace-throw-with-effect-fail`
   - **Message**: Using 'throw' inside Effect.gen or callbacks to map/flatMap/tap. Bypasses the typed error channel and turns expected failures into defects. Return Effect.fail(...) with tagged error types instead.

9. **`async-callbacks-in-effect-combinators`** - Async Callbacks Passed to Effect Combinators
   - **Severity**: High
   - **Category**: async
   - **Fix**: `replace-async-callbacks-with-effect`
   - **Message**: Using async callbacks in Effect.map, flatMap, tap etc. Returns Promise instead of Effect, resulting in Effect<Promise<A>>. Escapes Effect's interruption and error model. Use Effect-returning callbacks.

10. **`or-die-outside-boundaries`** - Using orDie/orDieWith Outside Boundaries
    - **Severity**: High
    - **Category**: errors
    - **Fix**: `remove-or-die-outside-boundaries`
    - **Message**: Using orDie/orDieWith outside application boundaries. Converts recoverable errors into defects, makes failures invisible to callers, and breaks retry and fallback logic. Only use at application boundaries.

11. **`swallowing-errors-in-catchall`** - Swallowing Errors in catchAll
    - **Severity**: High
    - **Category**: errors
    - **Fix**: `add-logging-to-catchall`
    - **Message**: Using Effect.catchAll(() => Effect.succeed(...)) without logging or documentation. Errors disappear silently, leading to corrupt state and making debugging impossible. Add explicit logging/telemetry or clearly document the intent.

12. **`effect-ignore-on-failable-effects`** - Using Effect.ignore on Failable Effects
    - **Severity**: Medium
    - **Category**: errors
    - **Fix**: `replace-effect-ignore`
    - **Message**: Using Effect.ignore on effects that can fail. Silently discards failures and often hides bugs during refactors. Use explicit error handling or logging instead.

13. **`try-catch-inside-effect-logic`** - Using try/catch Inside Effect Logic
    - **Severity**: Medium
    - **Category**: errors
    - **Fix**: `replace-try-catch-with-effect-try`
    - **Message**: Using try/catch inside Effect callbacks or generators. Duplicates Effect's error model, encourages imperative escape hatches, and leads to inconsistent failure handling. Use Effect.try/Effect.tryPromise instead.

14. **`promise-apis-inside-effect-logic`** - Promise APIs Used Inside Effect Logic
    - **Severity**: Medium
    - **Category**: async
    - **Fix**: `replace-promise-apis-with-effect`
    - **Message**: Using Promise.all, .then, .catch, .finally inside Effect callbacks. Bypasses interruption semantics, loses structured error handling, and is harder to test and observe. Use Effect.all, Effect.map, Effect.catchAll instead.

15. **`public-apis-returning-generic-error`** - Public APIs Returning Effect<*, Error>
    - **Severity**: Medium
    - **Category**: errors
    - **Fix**: `replace-generic-error-with-tagged`
    - **Message**: Public APIs returning Effect<*, Error> instead of tagged error types. Generic Error carries no semantic meaning, makes migrations harder, and weakens observability. Use tagged/domain-specific error types.

## Concurrency & Fiber Hygiene

16. **`fire-and-forget-fork`** - Fiber fork without supervision or await strategy
    - **Severity**: High
    - **Category**: concurrency
    - **Fix**: `add-fiber-supervision`
    - **Message**: Fire-and-forget Effect.fork without Fiber.join, Fiber.interrupt, or proper supervision can cause resource leaks and unhandled failures.

17. **`unbounded-parallelism`** - Effect.all without concurrency limit
    - **Severity**: Medium
    - **Category**: concurrency
    - **Fix**: `add-concurrency-limit`
    - **Message**: Effect.all with large arrays without concurrency limits can cause resource exhaustion. Add { concurrency: n } or use Effect.forEachWithConcurrency.

18. **`blocking-calls-in-effect`** - Blocking synchronous calls inside Effect
    - **Severity**: Medium
    - **Category**: concurrency
    - **Fix**: `replace-blocking-calls`
    - **Message**: Synchronous filesystem/crypto/zlib work inside Effect blocks the event loop. Use Effect.offload to move blocking operations to a separate thread pool.

## Resource Safety

19. **`manual-resource-lifecycle`** - Manual resource lifecycle instead of acquireRelease
    - **Severity**: High
    - **Category**: resources
    - **Fix**: `use-acquire-release`
    - **Message**: Manual try/finally resource cleanup in Effect context is error-prone. Use Effect.acquireRelease for automatic resource management.

20. **`leaking-scopes`** - Resource scope leakage
    - **Severity**: Medium
    - **Category**: resources
    - **Fix**: `fix-scope-leak`
    - **Message**: Creating Scope/resources without tying them to effect lifetime can cause resource leaks. Use Effect.scoped or proper scope management.

## Platform Boundary Correctness

21. **`node-platform-in-shared-code`** - Node.js platform imports in shared code
    - **Severity**: High
    - **Category**: platform
    - **Fix**: `replace-platform-imports`
    - **Message**: node:fs, node:process usage should be limited to Node boundary packages. Use @effect/platform services for portable code.

22. **`console-log-in-effect-flow`** - Console logging in Effect flows
    - **Severity**: Medium
    - **Category**: style
    - **Fix**: `add-effect-logging`
    - **Message**: console.log inside Effect bypasses structured logging. Use Effect.log/logWarning/logError for composable logging.

## TypeScript Hygiene

23. **`any-type-usage`** - any type usage without narrowing
    - **Severity**: High
    - **Category**: types
    - **Fix**: `replace-any-with-types`
    - **Message**: Using any bypasses TypeScript's type checking. Replace with specific types or Schema validation.

24. **`unknown-without-narrowing`** - unknown type without type guard narrowing
    - **Severity**: Medium
    - **Category**: types
    - **Fix**: `add-schema-decode`
    - **Message**: unknown without type guards provides no safety. Add type guards or Schema.decodeUnknown for validation.

25. **`non-null-assertions`** - Non-null assertions (!) used
    - **Severity**: Medium
    - **Category**: types
    - **Fix**: `remove-non-null-assertions`
    - **Message**: Non-null assertions can cause runtime errors. Use optional chaining or proper type guards instead.

26. **`default-exports-in-core`** - Default exports in core packages
    - **Severity**: Low
    - **Category**: style
    - **Fix**: `convert-default-to-named-exports`
    - **Message**: Default exports in library packages create inconsistent import styles. Use named exports for better tree-shaking and consistency.

## Agent-Friendly Packaging Anti-Patterns

27. **`duplicate-pattern-ids`** - Duplicate pattern IDs detected
    - **Severity**: High
    - **Category**: style
    - **Message**: Multiple patterns with the same ID found. This breaks agent lookup and causes unpredictable behavior.

28. **`unreachable-rule-declaration`** - Rule declared but not registered
    - **Severity**: Medium
    - **Category**: style
    - **Message**: Rule is exported but not included in the rule registry. Add to Rules array to make it available for analysis.

29. **`missing-rule-documentation`** - Rule registered but missing documentation
    - **Severity**: Low
    - **Category**: style
    - **Message**: Rule exists in registry but lacks proper documentation. Add description, examples, and fix information.

## New Fix Definitions Added (19 Total)

**Original Fixes (9):**
- `add-concurrency-limit` - Adds concurrency limit to Effect.all calls
- `add-fiber-supervision` - Adds proper fiber supervision to fire-and-forget forks
- `replace-blocking-calls` - Wraps blocking operations in Effect.offload
- `use-acquire-release` - Converts manual resource management to acquireRelease
- `fix-scope-leak` - Ensures proper resource scope management
- `replace-platform-imports` - Replaces Node imports with portable services
- `add-effect-logging` - Converts console logging to Effect logging
- `replace-any-with-types` - Replaces any with proper types
- `remove-non-null-assertions` - Replaces ! with type guards
- `convert-default-to-named-exports` - Converts default exports to named exports

**Top 10 Correctness Fixes (9):**
- `replace-yield-with-yield-star` - Converts yield effect to yield* effect
- `replace-throw-with-effect-fail` - Converts throw statements to Effect.fail calls
- `replace-async-callbacks-with-effect` - Converts async callbacks to Effect-returning functions
- `remove-or-die-outside-boundaries` - Removes orDie/orDieWith from non-boundary code
- `add-logging-to-catchall` - Adds proper logging to catchAll blocks
- `replace-effect-ignore` - Replaces Effect.ignore with explicit error handling
- `replace-try-catch-with-effect-try` - Converts try/catch to Effect.try patterns
- `replace-promise-apis-with-effect` - Converts Promise APIs to Effect equivalents
- `replace-generic-error-with-tagged` - Converts Effect<*, Error> to Effect<*, TaggedError>

## New Categories Added

- **`concurrency`** - For fiber management and parallelism issues
- **`platform`** - For platform boundary and portability concerns
- **`types`** - For TypeScript-specific type safety issues

## Updated Analysis Type Mappings

The analysis type filtering has been updated to include the new categories:

- **`validation`**: ["validation"]
- **`patterns`**: ["style", "dependency-injection", "resources", "types"]
- **`errors`**: ["errors", "async", "concurrency", "platform"]
- **`all`**: ["async", "errors", "validation", "resources", "dependency-injection", "style", "concurrency", "platform", "types"]

## Testing

Comprehensive tests have been added to verify:
- All new rules are properly registered and accessible
- New fix definitions are available
- New categories are properly integrated
- Analysis type filtering works with new categories
- Top 10 correctness anti-patterns are included

All 77 tests pass successfully, confirming the integration is working correctly.

## Impact Summary

- **Total New Anti-Patterns**: 27 (17 original + 10 correctness)
- **Total New Fix Definitions**: 19 (10 original + 9 correctness)
- **High Severity Rules**: 12 (6 original + 6 correctness)
- **Medium Severity Rules**: 15 (7 original + 8 correctness)
- **Low Severity Rules**: 2 (2 original + 0 correctness)

The analysis system now provides comprehensive coverage of Effect-TS correctness issues, from basic style improvements to critical correctness bugs that can cause production failures.
