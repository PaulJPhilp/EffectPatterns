# Top 10 Effect Correctness Anti-Patterns

These 10 anti-patterns represent **real correctness bugs** or **high-risk footguns** in Effect-TS codebases. All are detectable via the TypeScript Compiler API (AST-based), without requiring type-checking.

They are ordered by **impact**, not frequency, and all have been added to the Effect Patterns analysis system.

---

## 1. Running Effects Outside Boundaries  
**Rule ID:** `run-effect-outside-boundary`  
**Severity:** High  
**Category:** async

Using `Effect.runPromise`, `runSync`, `runFork`, etc. inside library or business logic.

**Why this is bad**
- Breaks composability
- Makes testing difficult or impossible
- Bypasses dependency injection and supervision

**Correct usage**
- Only at boundaries:
  - CLI entrypoints
  - HTTP route handlers
  - `main()` functions
  - scripts

---

## 2. Using `yield` Instead of `yield*` in `Effect.gen`  
**Rule ID:** `yield-instead-of-yield-star`  
**Severity:** High  
**Category:** async  
**Fix ID:** `replace-yield-with-yield-star`

```ts
yield effect   // ❌
yield* effect  // ✅
```

**Why this is bad**
- `yield` returns the Effect value instead of executing it
- Often silently wrong
- One of the most common real-world Effect bugs

---

## 3. Throwing Inside Effect Logic  
**Rule ID:** `throw-inside-effect-logic`  
**Severity:** High  
**Category:** errors  
**Fix ID:** `replace-throw-with-effect-fail`

Using `throw` inside:
- `Effect.gen(...)` 
- callbacks passed to `map`, `flatMap`, `tap`, etc.

**Why this is bad**
- Bypasses the typed error channel
- Turns expected failures into defects
- Breaks observability and recovery

**Correct approach**
- Return `Effect.fail(...)` 
- Use tagged error types

---

## 4. Async Callbacks Passed to Effect Combinators  
**Rule ID:** `async-callbacks-in-effect-combinators`  
**Severity:** High  
**Category:** async  
**Fix ID:** `replace-async-callbacks-with-effect`

```ts
Effect.map(async x => { ... }) // ❌
```

**Why this is bad**
- Returns a `Promise` instead of an `Effect` 
- Often results in `Effect<Promise<A>>` 
- Escapes Effect's interruption and error model

**Correct approach**
- Use Effect-returning callbacks
- Convert Promises with `Effect.tryPromise` 

---

## 5. Using `orDie` / `orDieWith` Outside Boundaries  
**Rule ID:** `or-die-outside-boundaries`  
**Severity:** High  
**Category:** errors  
**Fix ID:** `remove-or-die-outside-boundaries`

**Why this is bad**
- Converts recoverable errors into defects
- Makes failures invisible to callers
- Breaks retry and fallback logic

**Correct usage**
- Only at application boundaries
- Never in shared or reusable logic

---

## 6. Swallowing Errors in `catchAll`  
**Rule ID:** `swallowing-errors-in-catchall`  
**Severity:** High  
**Category:** errors  
**Fix ID:** `add-logging-to-catchall`

```ts
Effect.catchAll(() => Effect.succeed(...)) // ❌
```

**Why this is bad**
- Errors disappear silently
- Leads to corrupt or misleading state
- Extremely hard to debug in production

**Allowed only if**
- Explicit logging/telemetry is present
- Intent is clearly documented

---

## 7. Using `Effect.ignore` on Failable Effects  
**Rule ID:** `effect-ignore-on-failable-effects`  
**Severity:** Medium  
**Category:** errors  
**Fix ID:** `replace-effect-ignore`

**Why this is risky**
- Silently discards failures
- Often hides bugs during refactors

**Recommendation**
- Keep disabled by default
- Enable only for obvious risky cases
- Allow comment-based suppression

---

## 8. Using `try/catch` Inside Effect Logic  
**Rule ID:** `try-catch-inside-effect-logic`  
**Severity:** Medium–High  
**Category:** errors  
**Fix ID:** `replace-try-catch-with-effect-try`

**Why this is bad**
- Duplicates Effect's error model
- Encourages imperative escape hatches
- Leads to inconsistent failure handling

**Exception**
- HTTP / framework boundary files  
  (lower severity)

---

## 9. Promise APIs Used Inside Effect Logic  
**Rule ID:** `promise-apis-inside-effect-logic`  
**Severity:** Medium  
**Category:** async  
**Fix ID:** `replace-promise-apis-with-effect`

Using:
- `Promise.all` 
- `.then`, `.catch`, `.finally` 

inside Effect callbacks or generators.

**Why this is bad**
- Bypasses interruption semantics
- Loses structured error handling
- Harder to test and observe

---

## 10. Public APIs Returning `Effect<*, Error>`  
**Rule ID:** `public-apis-returning-generic-error`  
**Severity:** Medium  
**Category:** errors  
**Fix ID:** `replace-generic-error-with-tagged`

**Why this is bad**
- `Error` carries no semantic meaning
- Makes migrations and retries harder
- Weakens observability

**Preferred**
- Tagged / domain-specific error types
- Structured schemas

---

## Implementation Notes

- **All rules are AST-detectable** - No runtime execution required
- **Designed to minimize false positives** - Boundary detection uses path-based heuristics
- **Comprehensive fix support** - 9 out of 10 rules have automated fix definitions
- **Proper categorization** - Rules are categorized for targeted analysis (async, errors)
- **Severity-based prioritization** - 6 High severity, 4 Medium severity rules

## Integration Status

✅ **Fully Integrated** - All 10 anti-patterns are now part of the Effect Patterns analysis system:

- Added to `RuleRegistryService` with proper metadata
- Included in comprehensive test suite
- Categorized for analysis type filtering
- Documented with detailed explanations and fix strategies
- Available via MCP server for code analysis

These rules form the **correctness core** of the Effect Patterns Code Review tool and represent the highest-impact issues that can be automatically detected in Effect-TS codebases.
