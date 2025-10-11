<!-- Full changelog moved here -->

# Changelog

All notable changes to the Effect Patterns Hub will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2025-10-03

### Fixed in 0.3.1

- **Documentation Accuracy**: Fixed "Conditionally Branching Workflows" pattern across all documentation files
  - Updated examples to use `Effect.filterOrFail` instead of manual `if` statements, matching the pattern description
  - Simplified predicate functions from returning `Effect.Effect<boolean>` to `boolean`
  - Made code examples more declarative using `pipe` composition
  - Updated all text references from `Effect.filter` to `Effect.filterOrFail`
  - Fixed guideline text to show correct API signature: `Effect.filterOrFail(predicate, onFailure)`
  - Updated 8 files: rules files (cursor/windsurf .mdc, rules.md, rules.json, by-use-case/*.md) and content files (published/archived .mdx)

## [0.3.0] - 2025-09-30

### Added in 0.3.0

#### 42 New Effect Patterns

### Combinators (8 patterns)

- `combinator-map.mdx` - Transform values with map
- `combinator-flatmap.mdx` - Chain computations with flatMap
- `combinator-filter.mdx` - Filter results with filter
- `combinator-zip.mdx` - Combine values with zip
- `combinator-foreach-all.mdx` - Map over collections with forEach and all
- `combinator-sequencing.mdx` - Sequence with andThen, tap, and flatten
- `combinator-conditional.mdx` - Conditional branching with if, when, and cond
- `combinator-error-handling.mdx` - Handle errors with catchAll, orElse, and match

### Constructors (6 patterns)

- `constructor-succeed-some-right.mdx` - Lift values with succeed, some, and right
- `constructor-fail-none-left.mdx` - Lift errors with fail, none, and left
- `constructor-sync-async.mdx` - Wrap synchronous and asynchronous computations
- `constructor-from-nullable-option-either.mdx` - Convert from nullable, Option, or Either
- `constructor-from-iterable.mdx` - Create from collections
- `constructor-try-trypromise.mdx` - Wrap computations with try (pattern exists but fixed)
-

### Data Types (15 patterns)

- `data-option.mdx` - Check Option and Either cases
- `data-either.mdx` - Work with Either values
- `data-exit.mdx` - Model Effect results with Exit
- `data-struct.mdx` - Compare data by value with Data.struct
- `data-class.mdx` - Type classes for equality, ordering, and hashing
- `data-case.mdx` - Model tagged unions with Data.taggedEnum
- `data-ref.mdx` - Manage shared state with Ref
- `data-redacted.mdx` - Redact and handle sensitive data
- `data-array.mdx` - Work with immutable arrays using Data.Array
- `data-tuple.mdx` - Work with tuples using Data.Tuple
- `data-hashset.mdx` - Work with immutable sets using HashSet
- `data-chunk.mdx` - Work with high-performance collections using Chunk
- `data-bigdecimal.mdx` - Work with arbitrary-precision numbers using BigDecimal
- `data-datetime.mdx` - Work with dates and times using DateTime
- `data-duration.mdx` - Represent time spans with Duration
- `data-cause.mdx` - Handle unexpected errors by inspecting the Cause
