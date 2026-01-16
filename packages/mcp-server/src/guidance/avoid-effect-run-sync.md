# Pattern Guidance: Avoid runSync

**Goal: Non-blocking, supervised execution.**

## Use when
- Never in application logic.
- Only in tiny scripts where you are 100% certain no async work (promises, scheduling) will ever happen.

## Avoid when
- Running any normal Effect program.
- In tests (use `runPromise` or `runFork`).

## Decision rule
`runSync` throws if the effect attempts to suspend (e.g., waiting for a promise/sleep). Since most useful programs are async, `runSync` is a ticking time bomb.
Use `runPromise` or `runFork`.

## Simplifier
`runSync` is for calculators. `runPromise` is for programs.

## Implementation prompt
"Implement the Fix Plan for this finding: Replace `Effect.runSync` with `Effect.runPromise` (if awaiting the result) or `Effect.runFork` (if fire-and-forget)."
