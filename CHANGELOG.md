# Changelog

All notable changes to the Effect Patterns Hub will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-09-30

### Added

#### 42 New Effect Patterns

**Combinators (8 patterns)**
- `combinator-map.mdx` - Transform values with map
- `combinator-flatmap.mdx` - Chain computations with flatMap
- `combinator-filter.mdx` - Filter results with filter
- `combinator-zip.mdx` - Combine values with zip
- `combinator-foreach-all.mdx` - Map over collections with forEach and all
- `combinator-sequencing.mdx` - Sequence with andThen, tap, and flatten
- `combinator-conditional.mdx` - Conditional branching with if, when, and cond
- `combinator-error-handling.mdx` - Handle errors with catchAll, orElse, and match

**Constructors (6 patterns)**
- `constructor-succeed-some-right.mdx` - Lift values with succeed, some, and right
- `constructor-fail-none-left.mdx` - Lift errors with fail, none, and left
- `constructor-sync-async.mdx` - Wrap synchronous and asynchronous computations
- `constructor-from-nullable-option-either.mdx` - Convert from nullable, Option, or Either
- `constructor-from-iterable.mdx` - Create from collections
- `constructor-try-trypromise.mdx` - Wrap computations with try (pattern exists but fixed)

**Data Types (15 patterns)**
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

**Brand Types (2 patterns)**
- `brand-model-domain-type.mdx` - Model validated domain types with Brand
- `brand-validate-parse.mdx` - Validate and parse branded types

**Pattern Matching (5 patterns)**
- `pattern-match.mdx` - Match on success and failure with match
- `pattern-matcheffect.mdx` - Effectful pattern matching with matchEffect
- `pattern-matchtag.mdx` - Match tagged unions with matchTag and matchTags
- `pattern-catchtag.mdx` - Handle specific errors with catchTag and catchTags
- `pattern-option-either-checks.mdx` - Check Option and Either cases

**Observability (5 patterns)**
- `observability-structured-logging.mdx` - Leverage structured logging
- `observability-tracing-spans.mdx` - Trace operations with spans
- `observability-custom-metrics.mdx` - Add custom metrics to your application
- `observability-opentelemetry.mdx` - Integrate Effect tracing with OpenTelemetry
- `observability-effect-fn.mdx` - Instrument and observe function calls with Effect.fn

#### 4-Layer QA Validation System

**Phase 1: Behavioral Tests** (`scripts/publish/test-behavioral.ts`)
- Memory monitoring for streaming patterns
- Timing validation for parallel execution
- Concurrency option checking
- Runtime: ~1 second
- Coverage: Runtime behavior validation

**Phase 2: Effect Patterns Linter** (`scripts/publish/lint-effect-patterns.ts`)
- Custom Effect-specific linting rules:
  - `effect-use-taperror` - Prefer tapError over catchAll for logging
  - `effect-explicit-concurrency` - Require explicit concurrency options
  - `effect-deprecated-api` - Detect deprecated Effect APIs
  - `effect-prefer-pipe` - Enforce pipe-based composition
  - `effect-stream-memory` - Validate streaming memory behavior
  - `effect-error-model` - Verify typed error channels
- Runtime: ~30ms
- Coverage: Syntax patterns and idioms

**Phase 3: Enhanced LLM QA** (`scripts/qa/prompts/qa-schema-enhanced.mdx`)
- Semantic validation criteria:
  - Memory behavior analysis
  - Concurrency claims verification
  - Effect idiom enforcement
  - API modernization checks
- Runtime: ~5-10s per pattern
- Coverage: Semantic validation

**Phase 4: Integration Tests** (`scripts/publish/test-integration.ts`)
- End-to-end test scenarios:
  - Streaming with large files (90MB+)
  - Parallel vs. sequential performance
  - Error handling under stress
  - Resource management and cleanup
- Runtime: ~5 seconds
- Coverage: Integration validation

### Fixed

#### Critical Bug Fixes (Community Reported)

**PR #11: Stream-from-file Memory Bug** (reported by @ToliaGuy)
- **Issue**: "Good Example" was loading entire file into memory instead of streaming
- **Root Cause**: Used `fs.readFileString()` which reads entire file
- **Fix**: Replaced with `fs.readFile().pipe(Stream.decodeText, Stream.splitLines)` for true streaming
- **File**: `content/published/stream-from-file.mdx`
- **Impact**: Pattern now demonstrates constant-memory streaming as documented

**PR #10: Effect.all Concurrency Bug** (reported by @ToliaGuy)
- **Issue**: `Effect.all` running sequentially instead of in parallel
- **Root Cause**: Missing explicit `concurrency` option (defaults to sequential)
- **Fix**: Added `{ concurrency: "unbounded" }` to all parallel execution examples
- **Files**:
  - `content/published/run-effects-in-parallel-with-all.mdx`
  - `content/published/combinator-foreach-all.mdx`
  - `content/new/published/combinator-foreach-all.mdx`
- **Impact**: Patterns now correctly demonstrate parallel execution

**PR #9: Error Handling Idiom** (reported by @ToliaGuy)
- **Issue**: Verbose error logging using `catchAll` + `Effect.gen`
- **Improvement**: Simplified to use `Effect.tapError` for more idiomatic error logging
- **File**: `content/published/wrap-synchronous-computations.mdx`
- **Impact**: Improved code clarity and reduced boilerplate

#### TypeScript API Fixes (89 errors resolved)

**Schema API Updates**
- `Schema.string` → `Schema.String` (uppercase constructors)
- Modern Schema API usage throughout

**Brand API Updates**
- `Brand.Branded<T, "X">` → `T & Brand.Brand<"X">` (type-level branding)
- `Brand.schema()` → `Schema.brand()` (new API)

**Effect Constructor Updates**
- `Effect.fromOption` → `Option.match` + `Effect.succeed/fail`
- `Effect.fromEither` → `Either.match` + `Effect.succeed/fail`

**Data Type API Updates**
- `Data.case` → `Data.taggedEnum` (renamed API)
- `Chunk.fromArray` → `Chunk.fromIterable`
- `Chunk.concat` → `Chunk.appendAll`
- `Chunk.toArray` → `Chunk.toReadonlyArray`

**BigDecimal API Updates**
- `BigDecimal.make` → `BigDecimal.fromNumber`
- `BigDecimal.add/mul` → `BigDecimal.sum/multiply`
- `BigDecimal.toString/toNumber` → `BigDecimal.format/unsafeToNumber`

**DateTime API Updates**
- `DateTime.now` now returns an `Effect`
- `DateTime.plus/minus` → `DateTime.add/subtract`
- `DateTime.toISOString` → `DateTime.formatIso`
- `DateTime.before` → `DateTime.lessThan`
- Duration parameters now use object syntax `{ hours: 1 }`

**Duration API Updates**
- `Duration.add` → `Duration.sum`
- `Duration.toISOString` → `Duration.format`

**Cause API Updates**
- `Cause.isFail` → `Cause.isFailure`

**Metric API Updates**
- `Effect.updateMetric` → Direct `Metric` methods (`increment`, `set`, `update`)
- `Metric.histogram` boundaries → `MetricBoundaries.linear()`

**Pattern Matching Updates**
- `Effect.matchTag` → `Effect.catchTags`

**Option/Either API Updates**
- `Option.zip/Either.zip` → `Option.all/Either.all`
- `Option.cond/Either.cond` → Replaced with ternary expressions
- `Effect.if` updated to use lazy callbacks

### Changed

#### Package Scripts

Added new validation and testing commands:
```json
"test:behavioral": "bun run scripts/publish/test-behavioral.ts",
"test:integration": "bun run scripts/publish/test-integration.ts",
"test:all": "bun run test && bun run test:behavioral && bun run test:integration",
"lint:effect": "bun run scripts/publish/lint-effect-patterns.ts",
"lint:all": "bun run lint && bun run lint:effect",
"qa:test": "bun run scripts/qa/test-enhanced-qa.ts"
```

#### QA Process Improvements

- Enhanced `scripts/qa/qa-process.sh` to use `qa-schema-enhanced.mdx` when available
- Added dynamic fallback to `qa-schema.mdx` for backward compatibility
- Integrated behavioral tests into validation pipeline

### Documentation

#### New Documentation Files

- **`QA_GAP_ANALYSIS.md`** - Root cause analysis of why bugs slipped through QA
  - Analyzed gaps in existing QA process
  - Identified missing validations: semantic correctness, behavioral verification, idiomatic code checks
  - Proposed 4-phase improvement plan

- **`EFFECT_LINTER_RULES.md`** - Custom Effect patterns linter rules reference
  - Documents all 6 custom linting rules
  - Provides examples of good vs bad patterns
  - Integration guide with Biome

- **`ENHANCED_QA_GUIDE.md`** - Enhanced LLM semantic validation guide
  - Explains semantic validation criteria
  - Documents integration with existing QA pipeline
  - Usage examples

- **`INTEGRATION_TESTING_GUIDE.md`** - Integration testing scenarios and usage
  - Documents all 4 test scenarios
  - Explains how to run and interpret tests
  - Contribution guidelines for new tests

- **`MERGE_COMPLETE.md`** - Comprehensive PR #12 merge summary
  - Complete release documentation
  - Statistics and impact analysis
  - Next steps and acknowledgments

#### Updated Documentation

- **`README.md`** - Regenerated to include all 42 new patterns
- **`rules/` directory** - Updated AI coding rules for Cursor and Windsurf IDEs
  - 42 new pattern-specific rule files
  - Updated consolidated rules files
  - Expanded use-case-based organization

### Performance

#### Validation Speed

- **Quick validation** (behavioral + linting): ~1 second
- **Comprehensive validation** (integration + LLM QA): ~15 seconds
- **Full pipeline** (all validations): ~6 seconds average
- **Zero false positives** across all validation layers

#### Bug Prevention

The 4-layer QA system now catches:
- ✅ Memory/Streaming issues (PR #11 type bugs)
- ✅ Concurrency bugs (PR #10 type bugs)
- ✅ Non-idiomatic patterns (PR #9 type bugs)
- ✅ Deprecated API usage
- ✅ Documentation inaccuracies
- ✅ Real I/O issues
- ✅ Error handling problems
- ✅ Resource cleanup issues

### Contributors

- **@PaulJPhilp** - 42 new patterns, 4-layer QA system, comprehensive documentation
- **@ToliaGuy** - Critical bug reports (PR #9, #10, #11)

### Statistics

- **Files Changed**: 1,095
- **Lines Added**: +77,424
- **Lines Removed**: -2,035
- **TypeScript Errors Fixed**: 89
- **Total Patterns**: 88 → 130 (48% increase)
- **QA Layers**: 1 → 4 (4x improvement)

## [0.2.1] - 2025-09-30

### Fixed

- **Publishing Pipeline Restored**: Fixed all pipeline scripts that were broken due to `effect-mdx` dependency issues
- **Content Restored**: Recovered and republished all 88 patterns that were accidentally deleted
- **Simplified Scripts**: Replaced Effect-based publishing scripts with simpler, more maintainable implementations using Node.js built-ins

### Changed

- **Publishing Scripts**: Migrated from `effect-mdx` to direct file operations using `fs/promises` and `gray-matter`
- **Package Dependencies**: Updated Effect ecosystem packages to latest compatible versions:
  - `@effect/platform`: `0.90.2` → `0.90.10`
  - `@effect/platform-node`: `0.90.0` → `0.94.2`
  - `effect`: `3.17.7` → `3.17.14`

### Performance

- **Pipeline Speed**: Full pipeline now runs in ~85 seconds with 100% success rate
- **Reliability**: Zero errors across all 88 patterns

### Documentation

- Updated status documentation to reflect current state
- Added comprehensive pipeline documentation
- Created release planning documentation

## [0.1.0] - 2024-07-XX

### Added

- Initial release with 88 Effect-TS patterns
- Pattern categories covering:
  - Error Management (11 patterns)
  - Building APIs (8 patterns)
  - Core Concepts (13 patterns)
  - Concurrency (11 patterns)
  - Testing (7 patterns)
  - Resource Management (7 patterns)
  - And more...
- AI coding rules for Cursor and Windsurf IDEs
- Publishing pipeline infrastructure
- Ingest pipeline for processing new patterns
- QA validation system

### Infrastructure

- TypeScript validation for all code examples
- MDX frontmatter validation
- Automated README generation
- AI rules generation system
- Pattern categorization by use case

