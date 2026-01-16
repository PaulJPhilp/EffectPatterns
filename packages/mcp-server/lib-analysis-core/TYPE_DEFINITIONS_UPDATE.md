# Type Definitions Update for Anti-Patterns

## Issue Fixed
The TypeScript compiler was reporting type errors because new rule IDs and fix IDs were added to the rule registry but not to the corresponding type definitions.

## Changes Made

### Updated FixIdValues
Added 18 new fix IDs to the `FixIdValues` array in `src/tools/ids.ts`:

**Original 17 Anti-Pattern Fixes:**
- `add-concurrency-limit`
- `add-fiber-supervision`
- `replace-blocking-calls`
- `use-acquire-release`
- `fix-scope-leak`
- `replace-platform-imports`
- `add-effect-logging`
- `replace-any-with-types`
- `remove-non-null-assertions`
- `convert-default-to-named-exports`

**Top 10 Correctness Anti-Pattern Fixes:**
- `replace-yield-with-yield-star`
- `replace-throw-with-effect-fail`
- `replace-async-callbacks-with-effect`
- `remove-or-die-outside-boundaries`
- `add-logging-to-catchall`
- `replace-effect-ignore`
- `replace-try-catch-with-effect-try`
- `replace-promise-apis-with-effect`
- `replace-generic-error-with-tagged`

### Updated RuleIdValues
Added 27 new rule IDs to the `RuleIdValues` array in `src/tools/ids.ts`:

**Original 17 Anti-Patterns:**
- `effect-run-promise-boundary`
- `throw-in-effect-pipeline`
- `swallow-failures-without-logging`
- `generic-error-type`
- `incorrect-promise-bridge`
- `fire-and-forget-fork`
- `unbounded-parallelism`
- `blocking-calls-in-effect`
- `manual-resource-lifecycle`
- `leaking-scopes`
- `node-platform-in-shared-code`
- `console-log-in-effect-flow`
- `any-type-usage`
- `unknown-without-narrowing`
- `non-null-assertions`
- `default-exports-in-core`
- `duplicate-pattern-ids`
- `unreachable-rule-declaration`
- `missing-rule-documentation`

**Top 10 Correctness Anti-Patterns:**
- `run-effect-outside-boundary`
- `yield-instead-of-yield-star`
- `throw-inside-effect-logic`
- `async-callbacks-in-effect-combinators`
- `or-die-outside-boundaries`
- `swallowing-errors-in-catchall`
- `effect-ignore-on-failable-effects`
- `try-catch-inside-effect-logic`
- `promise-apis-inside-effect-logic`
- `public-apis-returning-generic-error`

## Result
- ✅ All TypeScript lint errors resolved
- ✅ All 77 tests passing
- ✅ Type safety maintained for new anti-patterns
- ✅ IDE autocomplete and type checking working correctly

The type definitions now accurately reflect all the anti-patterns that have been added to the Effect Patterns analysis system.
