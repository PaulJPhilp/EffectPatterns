# Effect Patterns Anti-Patterns Reference

Complete reference of all anti-patterns in the Effect Patterns code analysis system, organized by category with severity levels and associated fixes.

**Last Updated**: January 2026  
**Total Anti-Patterns**: 68  
**Total Fix Definitions**: 67

---

## Table of Contents

1. [Top 10 Effect Correctness Anti-Patterns](#top-10-effect-correctness-anti-patterns)
2. [Error Modeling Anti-Patterns](#error-modeling-anti-patterns)
3. [Domain Modeling Anti-Patterns](#domain-modeling-anti-patterns)
4. [Concurrency Anti-Patterns](#concurrency-anti-patterns)
5. [Scope Anti-Patterns](#scope-anti-patterns)
6. [Original Anti-Patterns](#original-anti-patterns)
7. [Design Smell Detectors](#design-smell-detectors)
8. [Summary by Severity](#summary-by-severity)
9. [Summary by Category](#summary-by-category)

---

## Top 10 Effect Correctness Anti-Patterns

These are the highest-impact correctness issues detectable via AST analysis.

| ID | Title | Severity | Category | Fix ID |
|----|-------|----------|----------|--------|
| `run-effect-outside-boundary` | Running Effects Outside Boundaries | High | async | - |
| `yield-instead-of-yield-star` | Using yield Instead of yield* in Effect.gen | High | async | `replace-yield-with-yield-star` |
| `throw-inside-effect-logic` | Throwing Inside Effect Logic | High | errors | `replace-throw-with-effect-fail` |
| `async-callbacks-in-effect-combinators` | Async Callbacks Passed to Effect Combinators | High | async | `replace-async-callbacks-with-effect` |
| `or-die-outside-boundaries` | Using orDie/orDieWith Outside Boundaries | High | errors | `remove-or-die-outside-boundaries` |
| `swallowing-errors-in-catchall` | Swallowing Errors in catchAll | High | errors | `add-logging-to-catchall` |
| `effect-ignore-on-failable-effects` | Using Effect.ignore on Failable Effects | Medium | errors | `replace-effect-ignore` |
| `try-catch-inside-effect-logic` | Using try/catch Inside Effect Logic | Medium | errors | `replace-try-catch-with-effect-try` |
| `promise-apis-inside-effect-logic` | Promise APIs Used Inside Effect Logic | Medium | async | `replace-promise-apis-with-effect` |
| `public-apis-returning-generic-error` | Public APIs Returning Effect<*, Error> | Medium | errors | `replace-generic-error-with-tagged` |

---

## Error Modeling Anti-Patterns

These indicate weak, leaky, or misleading error models.

| ID | Title | Severity | Category | Fix ID |
|----|-------|----------|----------|--------|
| `error-as-public-type` | Using Error as Public Error Type | Medium | errors | `replace-error-with-tagged-type` |
| `mixed-error-shapes` | Mixing Multiple Error Shapes in One Effect | High | errors | `normalize-error-shapes` |
| `convert-errors-to-strings-early` | Converting Errors to Strings Early | Medium | errors | `preserve-error-structure` |
| `catch-and-rethrow-generic` | Catch-and-Rethrow with Generic Errors | High | errors | `wrap-error-with-context` |
| `catching-errors-too-early` | Catching Errors Too Early | Medium | errors | `propagate-errors-upward` |
| `expected-states-as-errors` | Treating Expected Domain States as Errors | Medium | errors | `model-expected-states-as-data` |
| `exceptions-for-domain-errors` | Using Exceptions for Domain Errors | High | errors | `use-effect-fail-for-domain-errors` |
| `error-tags-without-payloads` | Error Tags Without Payloads | Medium | errors | `add-error-payload-fields` |
| `overusing-unknown-error-channel` | Overusing unknown as Error Channel | Medium | errors | `narrow-unknown-error-type` |
| `logging-instead-of-modeling-errors` | Logging Errors Instead of Modeling Them | Medium | errors | `structure-error-propagation` |

---

## Domain Modeling Anti-Patterns

These indicate missing or weak domain models.

| ID | Title | Severity | Category | Fix ID |
|----|-------|----------|----------|--------|
| `primitives-for-domain-concepts` | Using Primitives for Domain Concepts | Medium | validation | `introduce-branded-types` |
| `boolean-flags-controlling-behavior` | Boolean Flags Controlling Behavior | Medium | style | `replace-boolean-with-tagged-union` |
| `magic-string-domains` | Magic String Domains | Medium | validation | `replace-magic-strings-with-union` |
| `objects-as-implicit-state-machines` | Objects Used as Implicit State Machines | Medium | validation | `model-explicit-state-machine` |
| `domain-logic-in-conditionals` | Domain Logic Embedded in Conditionals | Medium | style | `extract-domain-predicates` |
| `adhoc-error-semantics-in-domain` | Ad-Hoc Error Semantics in Domain Code | High | errors | `use-domain-specific-errors` |
| `overloaded-config-objects` | Overloaded Config or Options Objects | Medium | validation | `structure-config-schema` |
| `domain-ids-as-raw-strings` | Domain Identifiers as Raw Strings Everywhere | Medium | validation | `introduce-branded-ids` |
| `time-as-number-or-date` | Time as number or Date in Domain Logic | Medium | validation | `use-duration-abstraction` |
| `domain-meaning-from-file-structure` | Domain Meaning Inferred from File Structure | Medium | style | `encode-domain-in-types` |

---

## Concurrency Anti-Patterns

These indicate unsafe or unclear concurrency behavior. Often work in tests but fail in production.

| ID | Title | Severity | Category | Fix ID |
|----|-------|----------|----------|--------|
| `unbounded-parallelism-effect-all` | Unbounded Parallelism | High | concurrency | `add-concurrency-limit-to-effect-all` |
| `fire-and-forget-forks` | Fire-and-Forget Forks | High | concurrency | `add-fiber-supervision-or-join` |
| `forking-inside-loops` | Forking Inside Loops | High | concurrency | `replace-loop-fork-with-foreach` |
| `racing-without-handling-losers` | Racing Effects Without Handling Losers | High | concurrency | `handle-race-interruption` |
| `blocking-calls-in-effect-logic` | Blocking Calls Inside Effect Logic | High | concurrency | `offload-blocking-work` |
| `promise-concurrency-in-effect` | Using Promise Concurrency Instead of Effect | Medium | concurrency | `replace-promise-all-with-effect-all` |
| `ignoring-fiber-failures` | Ignoring Fiber Failures | Medium | concurrency | `observe-fiber-results` |
| `retrying-concurrently-without-limits` | Retrying Concurrently Without Limits | High | concurrency | `add-retry-coordination` |
| `shared-mutable-state-across-fibers` | Shared Mutable State Across Fibers | High | concurrency | `use-ref-for-shared-state` |
| `timeouts-without-cancellation-awareness` | Timeouts Without Cancellation Awareness | Medium | concurrency | `ensure-cancellation-awareness` |

---

## Scope Anti-Patterns

These indicate incorrect resource lifetime management. Lead to leaks, dangling connections, and shutdown issues.

| ID | Title | Severity | Category | Fix ID |
|----|-------|----------|----------|--------|
| `resources-without-acquire-release` | Resources Created Without acquireRelease | High | resources | `wrap-with-acquire-release` |
| `returning-resources-instead-of-effects` | Returning Resources Instead of Effects | High | resources | `return-scoped-effect` |
| `creating-scopes-without-binding` | Creating Scopes Without Binding Them | High | resources | `bind-scope-to-lifetime` |
| `long-lived-resources-in-short-scopes` | Long-Lived Resources in Short-Lived Scopes | High | resources | `move-resource-to-app-layer` |
| `global-singletons-instead-of-layers` | Using Global Singletons Instead of Layers | Medium | resources | `convert-singleton-to-layer` |
| `closing-resources-manually` | Closing Resources Manually | Medium | resources | `remove-manual-close` |
| `effect-run-with-open-resources` | Effect.run* While Resources Are Open | High | resources | `scope-resources-before-run` |
| `nested-resource-acquisition` | Nested Resource Acquisition | Medium | resources | `flatten-resource-acquisition` |
| `using-scope-global-for-convenience` | Using Scope.global for Convenience | Medium | resources | `use-explicit-scope` |
| `forgetting-to-provide-layers` | Forgetting to Provide Required Layers | Medium | resources | `add-layer-provision` |

---

## Original Anti-Patterns

These are the original anti-patterns from the initial implementation.

| ID | Title | Severity | Category | Fix ID |
|----|-------|----------|----------|--------|
| `async-await` | Prefer Effect over async/await | Medium | async | - |
| `node-fs` | Using node:fs Instead of Platform FileSystem | Medium | async | `replace-node-fs` |
| `missing-validation` | Missing Validation with filterOrFail | Medium | validation | `add-filter-or-fail-validator` |
| `effect-map-fn-reference` | Effect.map with Function Reference | Medium | async | `wrap-effect-map-callback` |
| `try-catch-in-effect` | try/catch Inside Effect Code | High | errors | - |
| `try-catch-boundary-ok` | try/catch in Boundary Files | Low | errors | - |
| `catch-log-and-swallow` | Catch-Log-and-Swallow Pattern | High | errors | - |
| `throw-in-effect-code` | Throwing Errors in Effect Code | High | errors | - |
| `any-type` | Using any Type | Medium | validation | - |
| `yield-star-non-effect` | yield* on Non-Effect Value | High | async | - |
| `non-typescript` | Non-TypeScript Input | Low | style | - |
| `context-tag-anti-pattern` | Context.Tag Anti-Pattern | Medium | dependency-injection | `replace-context-tag` |
| `promise-all-in-effect` | Promise.all in Effect Code | Medium | async | `replace-promise-all` |
| `mutable-ref-in-effect` | Mutable Ref Inside Effect.gen | Medium | style | - |
| `console-log-in-effect` | console.log in Effect Code | Medium | style | `replace-console-log` |
| `effect-runSync-unsafe` | Effect.runSync Usage | High | async | - |
| `missing-error-channel` | Missing Error Channel Type | Medium | errors | - |
| `layer-provide-anti-pattern` | Layer.provide Inside Service Definition | High | dependency-injection | - |
| `effect-gen-no-yield` | Effect.gen Without yield* | High | async | - |
| `schema-decode-unknown` | JSON.parse Without Schema | Medium | validation | `add-schema-decode` |

### Additional Original Anti-Patterns (from first expansion)

| ID | Title | Severity | Category | Fix ID |
|----|-------|----------|----------|--------|
| `effect-run-promise-boundary` | Effect.runPromise at Boundaries | Medium | async | - |
| `throw-in-effect-pipeline` | Throwing in Effect Pipeline | High | errors | - |
| `swallow-failures-without-logging` | Swallowing Failures Without Logging | High | errors | - |
| `generic-error-type` | Generic Error Type | Medium | errors | - |
| `incorrect-promise-bridge` | Incorrect Promise Bridge | Medium | async | - |
| `fire-and-forget-fork` | Fire-and-Forget Fork | High | concurrency | `add-fiber-supervision` |
| `unbounded-parallelism` | Unbounded Parallelism | High | concurrency | `add-concurrency-limit` |
| `blocking-calls-in-effect` | Blocking Calls in Effect | High | concurrency | `replace-blocking-calls` |
| `manual-resource-lifecycle` | Manual Resource Lifecycle | High | resources | `use-acquire-release` |
| `leaking-scopes` | Leaking Scopes | High | resources | `fix-scope-leak` |
| `node-platform-in-shared-code` | Node Platform in Shared Code | Medium | platform | `replace-platform-imports` |
| `console-log-in-effect-flow` | console.log in Effect Flow | Medium | style | `add-effect-logging` |
| `any-type-usage` | any Type Usage | Medium | types | `replace-any-with-types` |
| `unknown-without-narrowing` | unknown Without Narrowing | Medium | types | - |
| `non-null-assertions` | Non-Null Assertions | Medium | types | `remove-non-null-assertions` |
| `default-exports-in-core` | Default Exports in Core | Medium | style | `convert-default-to-named-exports` |
| `duplicate-pattern-ids` | Duplicate Pattern IDs | Medium | style | - |
| `unreachable-rule-declaration` | Unreachable Rule Declaration | Medium | style | - |
| `missing-rule-documentation` | Missing Rule Documentation | Medium | style | - |

---

## Design Smell Detectors

| ID | Title | Severity | Category | Fix ID |
|----|-------|----------|----------|--------|
| `large-switch-statement` | Large Switch Statement | Medium | style | `refactor-switch-to-tagged-union` |

---

## Summary by Severity

### High Severity (28 rules)
**Critical issues that can cause production failures, data loss, or security problems.**

- `run-effect-outside-boundary`
- `yield-instead-of-yield-star`
- `throw-inside-effect-logic`
- `async-callbacks-in-effect-combinators`
- `or-die-outside-boundaries`
- `swallowing-errors-in-catchall`
- `mixed-error-shapes`
- `catch-and-rethrow-generic`
- `exceptions-for-domain-errors`
- `adhoc-error-semantics-in-domain`
- `unbounded-parallelism-effect-all`
- `fire-and-forget-forks`
- `forking-inside-loops`
- `racing-without-handling-losers`
- `blocking-calls-in-effect-logic`
- `retrying-concurrently-without-limits`
- `shared-mutable-state-across-fibers`
- `resources-without-acquire-release`
- `returning-resources-instead-of-effects`
- `creating-scopes-without-binding`
- `long-lived-resources-in-short-scopes`
- `effect-run-with-open-resources`
- `try-catch-in-effect`
- `catch-log-and-swallow`
- `throw-in-effect-code`
- `yield-star-non-effect`
- `effect-runSync-unsafe`
- `layer-provide-anti-pattern`
- `effect-gen-no-yield`

### Medium Severity (38 rules)
**Important issues that affect code quality, maintainability, or performance.**

- `effect-ignore-on-failable-effects`
- `try-catch-inside-effect-logic`
- `promise-apis-inside-effect-logic`
- `public-apis-returning-generic-error`
- `error-as-public-type`
- `convert-errors-to-strings-early`
- `catching-errors-too-early`
- `expected-states-as-errors`
- `error-tags-without-payloads`
- `overusing-unknown-error-channel`
- `logging-instead-of-modeling-errors`
- `primitives-for-domain-concepts`
- `boolean-flags-controlling-behavior`
- `magic-string-domains`
- `objects-as-implicit-state-machines`
- `domain-logic-in-conditionals`
- `overloaded-config-objects`
- `domain-ids-as-raw-strings`
- `time-as-number-or-date`
- `domain-meaning-from-file-structure`
- `promise-concurrency-in-effect`
- `ignoring-fiber-failures`
- `timeouts-without-cancellation-awareness`
- `global-singletons-instead-of-layers`
- `closing-resources-manually`
- `nested-resource-acquisition`
- `using-scope-global-for-convenience`
- `forgetting-to-provide-layers`
- `large-switch-statement`
- `async-await`
- `node-fs`
- `missing-validation`
- `effect-map-fn-reference`
- `any-type`
- `context-tag-anti-pattern`
- `promise-all-in-effect`
- `mutable-ref-in-effect`
- `console-log-in-effect`
- `missing-error-channel`
- `schema-decode-unknown`

### Low Severity (2 rules)
**Minor issues or informational warnings.**

- `try-catch-boundary-ok`
- `non-typescript`

---

## Summary by Category

### async (11 rules)
- `run-effect-outside-boundary` (High)
- `yield-instead-of-yield-star` (High)
- `async-callbacks-in-effect-combinators` (High)
- `promise-apis-inside-effect-logic` (Medium)
- `async-await` (Medium)
- `node-fs` (Medium)
- `effect-map-fn-reference` (Medium)
- `yield-star-non-effect` (High)
- `promise-all-in-effect` (Medium)
- `effect-runSync-unsafe` (High)
- `effect-gen-no-yield` (High)

### errors (24 rules)
- `throw-inside-effect-logic` (High)
- `or-die-outside-boundaries` (High)
- `swallowing-errors-in-catchall` (High)
- `effect-ignore-on-failable-effects` (Medium)
- `try-catch-inside-effect-logic` (Medium)
- `public-apis-returning-generic-error` (Medium)
- `error-as-public-type` (Medium)
- `mixed-error-shapes` (High)
- `convert-errors-to-strings-early` (Medium)
- `catch-and-rethrow-generic` (High)
- `catching-errors-too-early` (Medium)
- `expected-states-as-errors` (Medium)
- `exceptions-for-domain-errors` (High)
- `error-tags-without-payloads` (Medium)
- `overusing-unknown-error-channel` (Medium)
- `logging-instead-of-modeling-errors` (Medium)
- `adhoc-error-semantics-in-domain` (High)
- `try-catch-in-effect` (High)
- `try-catch-boundary-ok` (Low)
- `catch-log-and-swallow` (High)
- `throw-in-effect-code` (High)
- `missing-error-channel` (Medium)

### validation (9 rules)
- `primitives-for-domain-concepts` (Medium)
- `magic-string-domains` (Medium)
- `objects-as-implicit-state-machines` (Medium)
- `overloaded-config-objects` (Medium)
- `domain-ids-as-raw-strings` (Medium)
- `time-as-number-or-date` (Medium)
- `missing-validation` (Medium)
- `any-type` (Medium)
- `schema-decode-unknown` (Medium)

### style (9 rules)
- `boolean-flags-controlling-behavior` (Medium)
- `domain-logic-in-conditionals` (Medium)
- `domain-meaning-from-file-structure` (Medium)
- `large-switch-statement` (Medium)
- `non-typescript` (Low)
- `mutable-ref-in-effect` (Medium)
- `console-log-in-effect` (Medium)

### concurrency (10 rules)
- `unbounded-parallelism-effect-all` (High)
- `fire-and-forget-forks` (High)
- `forking-inside-loops` (High)
- `racing-without-handling-losers` (High)
- `blocking-calls-in-effect-logic` (High)
- `promise-concurrency-in-effect` (Medium)
- `ignoring-fiber-failures` (Medium)
- `retrying-concurrently-without-limits` (High)
- `shared-mutable-state-across-fibers` (High)
- `timeouts-without-cancellation-awareness` (Medium)

### resources (10 rules)
- `resources-without-acquire-release` (High)
- `returning-resources-instead-of-effects` (High)
- `creating-scopes-without-binding` (High)
- `long-lived-resources-in-short-scopes` (High)
- `global-singletons-instead-of-layers` (Medium)
- `closing-resources-manually` (Medium)
- `effect-run-with-open-resources` (High)
- `nested-resource-acquisition` (Medium)
- `using-scope-global-for-convenience` (Medium)
- `forgetting-to-provide-layers` (Medium)

### dependency-injection (2 rules)
- `context-tag-anti-pattern` (Medium)
- `layer-provide-anti-pattern` (High)

---

## Fix Definitions Reference

### All Available Fixes (60 total)

1. `replace-node-fs` - Replace node:fs with platform FileSystem
2. `add-filter-or-fail-validator` - Add filterOrFail validator
3. `wrap-effect-map-callback` - Wrap Effect.map callback
4. `replace-context-tag` - Replace Context.Tag with Effect.Service
5. `replace-promise-all` - Replace Promise.all with Effect.all
6. `replace-console-log` - Replace console.log with Effect.log
7. `add-schema-decode` - Add Schema.decode for JSON.parse
8. `add-concurrency-limit` - Add concurrency limit
9. `add-fiber-supervision` - Add fiber supervision
10. `replace-blocking-calls` - Replace blocking calls
11. `use-acquire-release` - Use acquireRelease pattern
12. `fix-scope-leak` - Fix scope leak
13. `replace-platform-imports` - Replace platform imports
14. `add-effect-logging` - Add Effect logging
15. `replace-any-with-types` - Replace any with types
16. `remove-non-null-assertions` - Remove non-null assertions
17. `convert-default-to-named-exports` - Convert to named exports
18. `replace-yield-with-yield-star` - Replace yield with yield*
19. `replace-throw-with-effect-fail` - Replace throw with Effect.fail
20. `replace-async-callbacks-with-effect` - Replace async callbacks
21. `remove-or-die-outside-boundaries` - Remove orDie outside boundaries
22. `add-logging-to-catchall` - Add logging to catchAll
23. `replace-effect-ignore` - Replace Effect.ignore
24. `replace-try-catch-with-effect-try` - Replace try/catch with Effect.try
25. `replace-promise-apis-with-effect` - Replace Promise APIs
26. `replace-generic-error-with-tagged` - Replace generic Error
27. `refactor-switch-to-tagged-union` - Refactor switch to tagged union
28. `replace-error-with-tagged-type` - Replace Error with tagged type
29. `normalize-error-shapes` - Normalize error shapes
30. `preserve-error-structure` - Preserve error structure
31. `wrap-error-with-context` - Wrap error with context
32. `propagate-errors-upward` - Propagate errors upward
33. `model-expected-states-as-data` - Model expected states as data
34. `use-effect-fail-for-domain-errors` - Use Effect.fail for domain errors
35. `add-error-payload-fields` - Add error payload fields
36. `narrow-unknown-error-type` - Narrow unknown error type
37. `structure-error-propagation` - Structure error propagation
38. `introduce-branded-types` - Introduce branded types
39. `replace-boolean-with-tagged-union` - Replace boolean with tagged union
40. `replace-magic-strings-with-union` - Replace magic strings
41. `model-explicit-state-machine` - Model explicit state machine
42. `extract-domain-predicates` - Extract domain predicates
43. `use-domain-specific-errors` - Use domain-specific errors
44. `structure-config-schema` - Structure config schema
45. `introduce-branded-ids` - Introduce branded IDs
46. `use-duration-abstraction` - Use Duration abstraction
47. `encode-domain-in-types` - Encode domain in types
48. `add-concurrency-limit-to-effect-all` - Add concurrency limit to Effect.all
49. `add-fiber-supervision-or-join` - Add fiber supervision or join
50. `replace-loop-fork-with-foreach` - Replace loop fork with forEach
51. `handle-race-interruption` - Handle race interruption
52. `offload-blocking-work` - Offload blocking work
53. `replace-promise-all-with-effect-all` - Replace Promise.all with Effect.all
54. `observe-fiber-results` - Observe fiber results
55. `add-retry-coordination` - Add retry coordination
56. `use-ref-for-shared-state` - Use Ref for shared state
57. `ensure-cancellation-awareness` - Ensure cancellation awareness
58. `wrap-with-acquire-release` - Wrap with acquireRelease
59. `return-scoped-effect` - Return scoped effect
60. `bind-scope-to-lifetime` - Bind scope to lifetime
61. `move-resource-to-app-layer` - Move resource to app layer
62. `convert-singleton-to-layer` - Convert singleton to layer
63. `remove-manual-close` - Remove manual close
64. `scope-resources-before-run` - Scope resources before run
65. `flatten-resource-acquisition` - Flatten resource acquisition
66. `use-explicit-scope` - Use explicit scope
67. `add-layer-provision` - Add layer provision

---

## Usage Notes

### For Code Review
- **High severity** rules should be addressed before production deployment
- **Medium severity** rules should be addressed during regular development
- **Low severity** rules are informational

### For Pro Features
- Concurrency anti-patterns are **high-impact** and often justify Pro warnings
- Scope anti-patterns have **highest ROI** for automated fixes
- Error modeling anti-patterns strengthen resilience and observability

### For Team Education
- Top 10 correctness anti-patterns are essential for all Effect developers
- Domain modeling anti-patterns help build maintainable systems
- Concurrency and scope anti-patterns prevent production failures

---

**Generated by**: Effect Patterns Analysis System  
**Version**: 1.0  
**Documentation**: See individual anti-pattern documentation files for detailed examples and rationale
