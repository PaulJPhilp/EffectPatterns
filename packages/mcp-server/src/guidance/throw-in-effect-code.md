# Pattern Guidance: Don't throw inside Effect code

## Finding
**Error Handling Anti-Pattern:** Throwing exceptions inside Effect code instead of modeling errors as typed values.

## What this means (plain language)
When you `throw` inside an Effect, you bypass Effect's typed error channel. The exception becomes a **defect** (untracked) rather than a typed, recoverable error. This breaks downstream error handling, retry logic, and type safety.

---

## Use when
**Use `throw` only:**
- outside your Effect program entirely (in synchronous initialization code)
- inside `Effect.die(new MyError())` to explicitly mark something as unrecoverable (a **defect**, not a domain error)

**Rule of thumb:** If code returns `Effect`, use `Effect.fail()` or `Effect.die()`, never `throw`.

---

## Avoid when
Avoid `throw` when:
- you're inside `Effect.gen` / `Effect.flatMap` / any Effect pipeline
- the error is *recoverable* (part of domain logic)
- the error has semantic meaning that callers need to handle (e.g., ValidationError, NotFound)
- you use `catchTag`, `catchAll`, or retry logic (these don't see thrown exceptions)

---

## Decision rule (reduces ambiguity)
**Decision rule:**
- **Thrown exception** → untracked defect, stops supervision and typed error recovery
- **Effect.fail(error)** → typed error, entered into the effect's error channel, recoverable
- **Effect.die(error)** → explicitly *un*recoverable defect (for bugs, not domain logic)

**Simplifier:**
- "`throw` in Effect = "error escapes supervision"
- "`Effect.fail` in Effect = "error is tracked and recoverable"
- "`Effect.die` in Effect = "explicitly tell the runtime: this is a bug, not a business error"

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

## Implementation prompt (for your workflow)
Use this *verbatim* as the follow-up instruction to a coding assistant:

**"Implement the Fix Plan for this finding: Replace all `throw` statements with `Effect.fail(error)` inside this function. Ensure the function's return type reflects the new error types in the Effect's error channel (e.g., `Effect<Result, ValidationError | NotFound>`). Update call sites to use `catchTag` or `match` for recovery."**

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
