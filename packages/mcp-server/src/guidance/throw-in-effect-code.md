# Pattern Guidance: Don't throw inside Effect code

## Finding
**Error Handling Anti-Pattern:** Throwing exceptions inside Effect code instead of modeling errors as typed values.

## What this means (plain language)
When you `throw` inside an Effect, you bypass Effect's typed error channel. The exception becomes a **defect** (untracked) rather than a typed, recoverable error. This breaks downstream error handling, retry logic, and type safety.

---

## Use when
Use `throw` only:
- outside your Effect program (synchronous code that runs *before* you return an `Effect`)
- when you intentionally mark something as unrecoverable (a defect), using `Effect.die(...)`

Rule of thumb: If code returns `Effect`, use `Effect.fail` or `Effect.die`, not `throw`.

---

## Avoid when
Avoid `throw` when:
- you're inside `Effect.gen` / `Effect.flatMap` / any Effect pipeline
- the error is recoverable (part of domain logic)
- callers need to handle it explicitly (e.g., `ValidationError`, `NotFound`)
- you expect `catchTag`, `catchAll`, or retry logic to handle it

---

## Decision rule
- `throw` → bypasses the typed error channel; recovery becomes unreliable/implicit
- `Effect.fail(error)` → typed failure; recoverable through Effect error handling
- `Effect.die(error)` → explicit defect (use for bugs, not business errors)

**Simplifier**
- "throw inside Effect code = error escapes the error channel"
- "Effect.fail = tracked and recoverable"
- "Effect.die = explicitly unrecoverable"

---

## Goal
Keep failures typed, supervised, and recoverable.

---

## Architecture impact
**Domain impact**
- Typed error contracts break; callers can't enumerate possible failures
- Error recovery is guesswork (you can't `catchTag` what was thrown, only generic `catchAll`)
- Refactoring becomes fragile (changing what gets thrown is not type-checked)

**Boundary/runtime impact**
- The supervisor sees thrown errors as defects, not as business errors
- Structured error logging/metrics doesn't work (you can't categorize by error type)
- Retry/timeout policies can't discriminate (e.g., "retry on network error, don't retry on validation")
- Observability: some errors won't show up in your Effect-centric traces

---

## Implementation prompt
"Implement the Fix Plan for this finding: replace `throw` with `Effect.fail(...)` in this function. Update the return type to include the new error union, and update call sites to use `catchTag`/`match` for recovery."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify the thrown error and its semantic meaning (e.g., `ValidationError`, `NotFound`, `Unauthorized`).
2. Replace `throw new MyError(...)` with `Effect.fail(new MyError(...))`.
3. Wrap the code in `Effect.gen` if it's not already in an Effect context (or use `Effect.flatMap`).
4. Update the function's return type to include the error in the error channel: `Effect<Result, MyError>`.
5. Update call sites to handle the error with `catchTag`, `match`, or other Effect error handlers.

**What will change (summary)**
- Function signature changes from potentially-throwing to explicitly-failing: `() => Effect<Result, MyError>`.
- Call sites change from `try/catch` to `Effect.catchTag` or `Effect.match`.
- Errors become enumerable in the type system (type-safe error recovery).

**Risks / watch-outs**
- Third-party code that throws: wrap it with `Effect.try` or `Effect.tryPromise` to convert exceptions into typed errors.
- If multiple functions throw, create a union error type: `Effect<Result, ValidationError | NotFound | InternalError>`.
- Be careful not to over-use `Effect.die` (only for bugs); most domain errors should use `Effect.fail`.

---

## Related pattern
See also: **generic-error-type** — once you stop throwing, you'll want to define specific error types that callers can recover from.
