# Pattern Guidance: No Floating Promises

**Goal: Keep failures typed, supervised, and recoverable.**

## Use when
- You are interfacing with legacy Promise-based code at a strict boundary.
- You immediately wrap the promise to bring it into the Effect runtime (e.g., `Effect.tryPromise`).

## Avoid when
- Calling a Promise-returning function without `await` (in async code) or `yield*` (in Effect code).
- Using `.then()` or `.catch()` chains attached to a function call that isn't returned or awaited.
- "Fire and forget" operations that rely on side effects (use `Effect.fork` instead).

## Decision rule
If a function returns a Promise, it represents work. That work must be supervised:
- If inside `Effect.gen`, use `yield*` (on an Effect wrapping the promise).
- If at a boundary, use `Effect.tryPromise`.

## Simplifier
- Floating promise = "silent failure waiting to happen."
- Effect fork = "supervised background work."

## Implementation prompt
"Implement the Fix Plan for this finding: Identify the Promise-returning function call. Wrap it in `Effect.tryPromise` (with error mapping) or `Effect.promise` if it cannot fail, and ensure it is yielded via `yield*` or returned."
