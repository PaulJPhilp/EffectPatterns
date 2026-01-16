# Pattern Guidance: Prefer Effect.gen over pipe/flatMap chains

**Goal: Readable, sequential control flow.**

## Use when
- You have more than one step in your logic.
- You need access to variables from previous steps (avoids closure hell).
- You are writing business logic, services, or tests.

## Avoid when
- You have a single, simple transformation (e.g., `pipe(effect, Effect.map(fn))`).
- You are defining a tiny helper function that is purely point-free.

## Decision rule
- Multiple steps or variable dependencies? → `Effect.gen`.
- Single transformation? → `pipe` is acceptable.

## Simplifier
`Effect.gen` writes like synchronous code but runs like a workflow.

## Implementation prompt
"Implement the Fix Plan for this finding: Refactor the `pipe` or `flatMap` chain into an `Effect.gen` block. Assign intermediate results to variables using `yield*` and flatten the control flow."
