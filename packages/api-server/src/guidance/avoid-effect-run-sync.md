# Pattern Guidance: Avoid runSync

**Goal: Non-blocking, supervised execution.**

## Use when
- You are in a synchronous-only script (e.g., a simple CLI calculator) where you are 100% certain no async work (promises, intervals, or timeouts) will ever be triggered.

## Avoid when
- Executing any standard Effect program.
- Inside any function that might eventually touch a database, file system, or network API.
- In tests where you should be using `runPromise`.

## Decision rule
`runSync` will throw a runtime error if the Effect suspends (waits for async work). Since most production Effects are async, `runSync` is a "ticking time bomb" for crashes. Use `runPromise` or `runFork` instead.

## Simplifier
- `runSync` = "Only for math and pure data."
- `runPromise` = "For real-world programs."

## Implementation prompt
"Implement the Fix Plan for this finding: Replace `Effect.runSync` with `Effect.runPromise` and ensure the calling function is updated to handle the resulting Promise."
