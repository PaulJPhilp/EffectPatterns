# Pattern Guidance: No Nested Effect.gen

**Goal: Flatten control flow for readability.**

## Use when
- You are starting a new logical unit of work (e.g., inside a loop or a separate function).

## Avoid when
- You are just continuing the current flow.
- You are nesting `Effect.gen` just to scope variables (use `const` instead).

## Decision rule
If you see `Effect.gen(function*() { ... Effect.gen(function*() { ... }) ... })`, flatten it.
Exception: `Effect.fork`, `Effect.repeat`, or specialized scopes.

## Simplifier
Don't rebuild "callback hell" with generators. Keep it flat.

## Implementation prompt
"Implement the Fix Plan for this finding: Flatten the nested `Effect.gen` block into the parent generator. Yield the effects directly in the main flow."
