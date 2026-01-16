# Pattern Guidance: Avoid `async/await` inside Effect flows (Structured Concurrency)

## Finding
**Async Anti-Pattern:** `async/await` used in code that should be modeled as `Effect`.

## What this means (plain language)
`async/await` moves work outside Effect's supervision model. You lose typed errors, interruption behavior, and consistent concurrency semantics—especially once code starts forking fibers, retrying, or managing resources.

---

## Use when
**Use `async/await` only at the boundary**, for example:
- you are writing a very thin adapter around a third‑party promise API **and immediately** wrapping it into Effect (`Effect.tryPromise`, etc.)
- you are in a file that is explicitly not part of your Effect program (e.g., a tiny bootstrapping script), and the `async` function ends at the boundary

**Rule of thumb:** If the function returns `Effect`, do not make it `async`.

---

## Avoid when
Avoid `async/await` when:
- you're inside `Effect.gen` / `Effect.flatMap` / any Effect pipeline
- the function is part of "core logic" (domain, services, commands)
- you need *any* of these Effect guarantees:
  - typed error channel
  - cancellation / interruption
  - retry/backoff schedules
  - scoped resource cleanup
  - controlled concurrency

---

## Decision rule (reduces ambiguity)
**Decision rule:**
If the desired result is an `Effect`, use **Effect composition**:
- prefer `Effect.gen` + `yield*` for sequencing
- prefer `Effect.tryPromise` at the boundary for promise interop

**Simplifier:**
- "`await` sequences promises."
- "`yield*` sequences effects."

---

## Architecture impact
**Domain impact**
- Errors tend to revert to generic exceptions or `unknown`, weakening domain-level error contracts.
- Logic becomes harder to reason about because failures no longer follow your typed error conventions.

**Boundary/runtime impact**
- Work can escape Effect's supervision: interruption won't behave the way you expect.
- Concurrency becomes less predictable (you may accidentally introduce unbounded parallelism or lose cancellation).
- Observability becomes inconsistent (some operations won't show up in your Effect-centric tracing/logging story).

---

## Implementation prompt (for your workflow)
Use this *verbatim* as the follow-up instruction to a coding assistant:

**"Implement the Fix Plan for this finding: Convert this function from `async/await` to Effect composition. Replace `await` with `yield*` inside `Effect.gen` (or use `Effect.flatMap`), and wrap any promise-returning calls using `Effect.tryPromise` at the boundary with explicit error mapping."**

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify the smallest boundary where promise interop is required (the function that calls the third‑party promise API).
2. Replace the `async` function with a function returning `Effect`.
3. Convert each `await` to `yield*` within an `Effect.gen` block (or rewrite as `Effect.flatMap` chain).
4. For promise APIs, wrap with `Effect.tryPromise` and map errors into your project's error types.
5. Ensure callers now compose the resulting `Effect` rather than awaiting.

**What will change (summary)**
- Function signature changes from `async () => Promise<T>` to `() => Effect<…T…>`.
- Call sites change from `await fn()` to `yield* fn()` (or `Effect.flatMap(fn)`).
- Promise boundary becomes explicit (`Effect.tryPromise` wrapper added).

**Risks / watch-outs**
- If callers are non-Effect code, you may need a single boundary where the Effect is executed (don't sprinkle execution throughout the codebase).
- Error types may widen at first; follow-up may be needed to introduce tagged errors and targeted recovery (`catchTag`).
- Be careful not to change concurrency semantics unintentionally (e.g., converting sequential awaits into parallel effects).
