# Pattern Guidance: Prefer Effect.gen over pipe/flatMap

**Goal: Readable, sequential control flow.**

## Use when
- Your logic has more than one step.
- You need to access variables from earlier steps without complex nesting.
- You are writing business logic or service implementations.

## Avoid when
- You have a single, simple transformation (e.g., a single `Effect.map`).

## Decision rule
- Multiple steps? → `Effect.gen` + `yield*`.
- Complex closures? → `Effect.gen`.
- Single mapping? → `pipe` is fine.

## Simplifier
`Effect.gen` makes async logic read like a simple story.

## Implementation prompt
"Implement the Fix Plan for this finding: Refactor the `pipe` or `flatMap` chain into an `Effect.gen` block. Use `yield*` to bind intermediate results to variables."
