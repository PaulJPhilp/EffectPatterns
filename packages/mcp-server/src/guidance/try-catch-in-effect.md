# Pattern Guidance: Prefer Effect.try/tryPromise over try/catch

## Finding
**Error Handling Anti-Pattern:** `try/catch` used inside Effect code instead of Effect error handlers.

## What this means (plain language)
Using `try/catch` inside Effect logic bypasses Effect's typed error channel. Caught exceptions become untyped and unrecoverable by Effect combinators like `retry`, `catchTag`, or `match`. You lose the ability to discriminate errors and apply recovery policies uniformly.

---

## Use when
**Use `try/catch` only:**
- at HTTP/network boundaries (route handlers, middleware)
- as a thin wrapper to convert third-party exceptions to domain errors (and immediately wrap in `Effect`)
- in non-Effect code (synchronous utility functions)

**Rule of thumb:** Inside an Effect pipeline, use `Effect.try`, `Effect.tryPromise`, or `Effect.match`, not `try/catch`.

---

## Avoid when
Avoid `try/catch` when:
- you're inside `Effect.gen` / `Effect.flatMap` / any Effect pipeline
- you want to apply effect-level recovery (retry, timeout, fallback)
- you need to discriminate errors by type (use `catchTag` instead)
- the error is part of your domain logic (model it as a tagged error)

---

## Decision rule (reduces ambiguity)
**Decision rule:**
- **`try/catch` in Effect** → error is *hidden*, untyped, Effect combinators can't see it
- **`Effect.try` / `Effect.tryPromise`** → exception is *converted* to a typed error, Effect combinators can see it
- **`Effect.match` / `Effect.catchAll`** → error is *handled* within the Effect, typed and enumerable

**Simplifier:**
- "`try/catch` = local exception handling (Effect-blind)"
- "`Effect.try` = convert exception to Effect error (Effect-aware)"
- "`Effect.match` = handle Effect error expressively (Effect-native)"

---

## Architecture impact
**Domain impact**
- Errors are caught silently; callers don't know what went wrong
- Error recovery becomes ad-hoc inside each `try/catch` block instead of being centralized
- Type system can't enforce exhaustiveness (you might forget to handle a case)

**Boundary/runtime impact**
- Retry, timeout, and fallback policies don't apply to caught exceptions (they're already handled)
- Structured error observability breaks (errors are swallowed or rethrown generically)
- Cancellation/interruption behavior is inconsistent (try/catch may swallow `InterruptedException`)

---

## Implementation prompt (for your workflow)
Use this *verbatim* as the follow-up instruction to a coding assistant:

**"Implement the Fix Plan for this finding: Replace this `try/catch` block with `Effect.try` (for synchronous code) or `Effect.tryPromise` (for async code). Map the caught exception to a typed error using `Effect.mapError`. Update the function's return type to reflect the new error channel. Replace any `catch` blocks with `Effect.catchAll` or `Effect.catchTag` if the error is typed."**

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify what code is inside the `try` block (synchronous operation or promise).
2. Wrap the operation with `Effect.try` (sync) or `Effect.tryPromise` (async).
3. Map the caught exception to a typed error: `.pipe(Effect.mapError(convertToMyErrorType))`.
4. Replace any `catch` block logic with Effect error handlers: `Effect.catchAll`, `Effect.catchTag`, or `Effect.match`.
5. Update the function signature to reflect the typed error: `Effect<Result, MyError>`.

**What will change (summary)**
- `try/catch` block becomes `Effect.try(...).pipe(Effect.mapError(...))`.
- `catch` handler becomes `Effect.catchAll(handler)` or targeted handler like `Effect.catchTag("ValidationError")(handler)`.
- Function return type explicitly lists errors in the error channel.

**Risks / watch-outs**
- If you have nested `try/catch` blocks, flatten them into a single `Effect` pipeline.
- Error mapping must be exhaustive; if you catch multiple exception types, create a discriminated union.
- Be careful not to swallow errors unintentionally; use `Effect.match` to handle both success and error paths explicitly.

---

## Related pattern
See also: **throw-in-effect-code** — the two patterns go together. Don't throw, don't catch; fail and handle typed errors instead.
