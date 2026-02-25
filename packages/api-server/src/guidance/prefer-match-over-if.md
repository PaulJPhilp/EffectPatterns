# Pattern Guidance: Prefer Match/MatchTag over If

**Goal: Exhaustive, expression-oriented logic.**

## Use when
- Handling `Option`, `Either`, or tagged union types.
- Branching based on an error type.

## Avoid when
- Manually checking `.isSome()` or `_tag` inside an `if` statement.
- Doing "type narrowing" manually when `Match` can do it for you.

## Decision rule
`match` forces you to handle all cases (exhaustive). `if` lets you forget one.
Prefer exhaustive handling for state/result logic.

## Simplifier
Don't write manual checks. Let the compiler force you to cover every case.

## Implementation prompt
"Implement the Fix Plan for this finding: Replace the `if/else` block with `Effect.match` (or `Match.value` for pure data), covering both success/failure or all union cases explicitly."
