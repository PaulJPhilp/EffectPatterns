# Pattern Guidance: No Floating Promises

**Goal: Keep failures typed, supervised, and recoverable.**

## Use when
- You are at the absolute boundary of an Effect program and must trigger a fire-and-forget operation in an environment that only understands Promises.

## Avoid when
- You are calling a Promise-returning function inside an Effect flow without wrapping it.
- Using `.then()` or `.catch()` chains that escape the Effect's supervision.

## Decision rule
Floating promises escape Effect's error tracking and interruption logic. If a Promise fails, it becomes an "unhandled rejection."
- Wrap it: `Effect.tryPromise`.
- Supervise it: `yield*`.

## Simplifier
Floating Promise = "Invisible bug."
Effect Fiber = "Managed work."

## Implementation prompt
"Implement the Fix Plan for this finding: Wrap the floating Promise in `Effect.tryPromise` (with explicit error mapping) and use `yield*` to ensure it is supervised by the Effect runtime."
