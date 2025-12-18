# Effect API Surface Coverage Analysis

**Generated:** December 17, 2025  
**Repository:** Effect-Patterns  
**Analysis Method:** Cross-reference Effect.website/docs API documentation against existing patterns

## Executive Summary

The Effect-Patterns repository contains **147 documented patterns** organized into:
- **Core Patterns:** 131 patterns
- **Schema Patterns:** 16 patterns

The Effect API documentation (https://effect.website/docs) spans **100+ documented topics** across 13 major categories. Current coverage analysis reveals significant gaps in advanced concurrency, streaming, and platform integration patterns.

---

## API Category Coverage Matrix

### 1. Core Concepts & Foundations
**Documented Topics:** 9 (Getting Started)
**Existing Patterns:** 8+
**Coverage:** ✅ **88%** - GOOD

| Topic | Covered By Pattern(s) |
|-------|----------------------|
| What is Effect | `effects-are-lazy.mdx` |
| Creating & Running Effects | `constructor-succeed-some-right.mdx`, `constructor-fail-none-left.mdx` |
| Generators with `gen` | `use-gen-for-business-logic.mdx` |
| Pipelines | `use-pipe-for-composition.mdx` |
| Control Flow | `control-flow-with-combinators.mdx` |
| Setup & Installation | `setup-new-project.mdx` |

**Gaps:** Error construction patterns (try/tryCatch) could be expanded

---

### 2. Error Management
**Documented Topics:** 10
**Existing Patterns:** 8+
**Coverage:** ✅ **80%** - GOOD

| Topic | Covered By Pattern(s) |
|-------|----------------------|
| Expected vs Unexpected | `define-tagged-errors.mdx` |
| Try/Catch | `handle-errors-with-catch.mdx` |
| Fallback/Recover | `handle-errors-with-catch.mdx` |
| Error Matching | `pattern-catchtag.mdx`, `pattern-match.mdx` |
| Retry & Timeout | `handle-flaky-operations-with-retry-timeout.mdx` |
| Sandboxing/Isolation | `handle-unexpected-errors-with-cause.mdx` |

**Gaps:**
- ⚠️ Error accumulation patterns (multiple errors)
- ⚠️ Error propagation strategies in concurrent scenarios
- ⚠️ Error recovery with custom strategies

---

### 3. Dependency Injection & Services
**Documented Topics:** 3 (Services, Layers, Memoization)
**Existing Patterns:** 6+
**Coverage:** ✅ **95%** - EXCELLENT

| Topic | Covered By Pattern(s) |
|-------|----------------------|
| Services | `model-dependencies-as-services.mdx` |
| Layers | `understand-layers-for-dependency-injection.mdx` |
| Layer Composition | `organize-layers-into-composable-modules.mdx`, `compose-scoped-layers.mdx` |
| Memoization | `add-caching-by-wrapping-a-layer.mdx` |
| Default Layers | `use-default-layer-for-tests.mdx` |

**Gaps:** None identified

---

### 4. Resource Management
**Documented Topics:** 1 (Scope)
**Existing Patterns:** 2+
**Coverage:** ✅ **100%** - EXCELLENT

| Topic | Covered By Pattern(s) |
|-------|----------------------|
| Scope & Lifecycle | `manage-resource-lifecycles-with-scope.mdx`, `manually-scope-management.mdx` |

**Gaps:** None identified

---

### 5. Observability
**Documented Topics:** 4 (Logging, Metrics, Tracing, Supervisor)
**Existing Patterns:** 5+
**Coverage:** ✅ **100%** - EXCELLENT

| Topic | Covered By Pattern(s) |
|-------|----------------------|
| Structured Logging | `leverage-structured-logging.mdx`, `observability-structured-logging.mdx` |
| Custom Metrics | `add-custom-metrics.mdx`, `observability-custom-metrics.mdx` |
| Tracing & Spans | `trace-operations-with-spans.mdx`, `observability-tracing-spans.mdx` |
| OpenTelemetry | `observability-opentelemetry.mdx` |

**Gaps:** None identified

---

### 6. Scheduling & Timing
**Documented Topics:** 5 (Introduction, Repetition, Built-in Schedules, Combinators, Cron)
**Existing Patterns:** 1
**Coverage:** ⚠️ **20%** - CRITICAL GAP

| Topic | Covered By Pattern(s) |
|-------|----------------------|
| Basic Scheduling | `control-repetition-with-schedule.mdx` |
| Repetition | ❌ NOT COVERED |
| Built-in Schedules | ❌ NOT COVERED |
| Schedule Combinators | ❌ NOT COVERED |
| Cron Expressions | ❌ NOT COVERED |

**Priority Gaps:**
- **HIGH:** Schedule combinators (exponential backoff, linear backoff, jittered delays)
- **HIGH:** Cron expression patterns
- **MEDIUM:** Repetition strategies with different schedules
- **MEDIUM:** Conditional scheduling

---

### 7. State Management
**Documented Topics:** 3 (Ref, SynchronizedRef, SubscriptionRef)
**Existing Patterns:** 2+
**Coverage:** ⚠️ **67%** - ACCEPTABLE

| Topic | Covered By Pattern(s) |
|-------|----------------------|
| Ref | `manage-shared-state-with-ref.mdx`, `data-ref.mdx` |
| SynchronizedRef | ❌ NOT COVERED |
| SubscriptionRef | ❌ NOT COVERED |

**Priority Gaps:**
- **MEDIUM:** SynchronizedRef for thread-safe state mutations
- **MEDIUM:** SubscriptionRef for reactive state changes

---

### 8. Concurrency
**Documented Topics:** 6+ (Fibers, Deferred, Queue, PubSub, Semaphore, Latch)
**Existing Patterns:** 4
**Coverage:** ⚠️ **40%** - SIGNIFICANT GAP

| Topic | Covered By Pattern(s) |
|-------|----------------------|
| Basic Concurrency | `run-background-tasks-with-fork.mdx` |
| Fibers | `understand-fibers-as-lightweight-threads.mdx` |
| Deferred | ❌ NOT COVERED |
| Queue | `decouple-fibers-with-queue-pubsub.mdx` (partial) |
| PubSub | `decouple-fibers-with-queue-pubsub.mdx` (partial) |
| Semaphore | ❌ NOT COVERED |
| Latch | ❌ NOT COVERED |
| Race/Competing Effects | `race-concurrent-effects.mdx` |

**Priority Gaps:**
- **HIGH:** Deferred - promise-like primitive
- **HIGH:** Semaphore - concurrency control
- **HIGH:** Latch - coordination primitive
- **MEDIUM:** Queue patterns beyond decoupling
- **MEDIUM:** PubSub advanced patterns

**New Pattern Recommendations:**
1. `concurrency-deferred-future-value.mdx` - Using Deferred for async coordination
2. `concurrency-semaphore-rate-limiting.mdx` - Rate limiting with Semaphore
3. `concurrency-latch-coordination.mdx` - Multi-fiber coordination with Latch
4. `concurrency-queue-advanced-patterns.mdx` - Advanced queue usage (FIFO, backpressure)
5. `concurrency-pubsub-broadcast.mdx` - Pub/Sub for event broadcasting

---

### 9. Streams
**Documented Topics:** 5+ (Introduction, Creating, Consuming, Error Handling, Operations, Resourceful)
**Existing Patterns:** 8+
**Coverage:** ⚠️ **55%** - SIGNIFICANT GAP

| Topic | Covered By Pattern(s) |
|-------|----------------------|
| Stream Basics | `process-streaming-data-with-stream.mdx` |
| Creating Streams | `stream-from-iterable.mdx`, `stream-from-file.mdx`, `stream-from-paginated-api.mdx` |
| Consuming Streams | `stream-collect-results.mdx`, `stream-run-for-effects.mdx` |
| Error Handling | `stream-retry-on-failure.mdx` |
| Operations/Transforms | ❌ MINIMAL - map, filter, fold missing |
| Batching | `stream-process-in-batches.mdx` |
| Concurrency | `stream-process-concurrently.mdx` |
| Resource Management | `stream-manage-resources.mdx` |

**Priority Gaps:**
- **HIGH:** Stream transformation patterns (map, filter, fold, scan)
- **HIGH:** Stream merging and combining (merge, concat, interleave)
- **HIGH:** Backpressure handling
- **MEDIUM:** Stream debugging and inspection
- **MEDIUM:** Advanced stream operators

**New Pattern Recommendations:**
1. `stream-transform-map-filter.mdx` - Stream transformations
2. `stream-merge-combine.mdx` - Merging multiple streams
3. `stream-backpressure-control.mdx` - Handling backpressure
4. `stream-stateful-operations.mdx` - Scan, fold, stateful operations
5. `stream-grouping-windowing.mdx` - Windowing and grouping

---

### 10. Sinks
**Documented Topics:** 5 (Introduction, Creating, Operations, Concurrency, Leftovers)
**Existing Patterns:** 0
**Coverage:** ❌ **0%** - CRITICAL GAP

**Priority Gaps:**
- **HIGH:** What are Sinks and when to use them
- **HIGH:** Creating custom sinks
- **HIGH:** Sink operations and combinators
- **MEDIUM:** Concurrent sink operations
- **MEDIUM:** Sink error handling

**New Pattern Recommendations:**
1. `sink-introduction-concepts.mdx` - Understanding Sinks
2. `sink-create-custom.mdx` - Creating custom sinks
3. `sink-operations-combinators.mdx` - Sink transformations
4. `sink-concurrent-handling.mdx` - Concurrent sink usage
5. `sink-collecting-results.mdx` - Using sinks to collect stream data

---

### 11. Data Types
**Documented Types:** 11 (BigDecimal, Cause, Chunk, Data, DateTime, Duration, Either, Exit, HashSet, Option, Redacted)
**Existing Patterns:** 11+
**Coverage:** ✅ **100%** - EXCELLENT

| Type | Covered By Pattern(s) |
|-----|----------------------|
| BigDecimal | `data-bigdecimal.mdx` |
| Cause | `data-cause.mdx` |
| Chunk | `data-chunk.mdx`, `use-chunk-for-high-performance-collections.mdx` |
| Data | `data-class.mdx`, `data-case.mdx` |
| DateTime | `data-datetime.mdx` |
| Duration | `data-duration.mdx`, `representing-time-spans-with-duration.mdx` |
| Either | `data-either.mdx`, `accumulate-multiple-errors-with-either.mdx` |
| Exit | `data-exit.mdx` |
| HashSet | `data-hashset.mdx` |
| Option | `data-option.mdx`, `model-optional-values-with-option.mdx` |
| Redacted | `data-redacted.mdx` |

**Gaps:** None identified

---

### 12. Schema
**Documented Topics:** 15+
**Existing Patterns:** 16
**Coverage:** ✅ **100%** - EXCELLENT

| Topic | Covered By Pattern(s) |
|-----|----------------------|
| Fundamentals | Module 11 comprehensive |
| Getting Started | `parse-with-schema-decode.mdx` |
| Validation | `schema/form-validation`, `schema/web-standards-validation` |
| Transformations | `transform-data-with-schema.mdx`, `schema/transformations` |
| Error Handling | `schema/error-handling` |
| Composition | `schema/composition` |
| Async Validation | `schema/async-validation` |
| AI Integration | `schema/defining-ai-output-schemas`, `schema/parsing-ai-responses` |

**Gaps:** None identified

---

### 13. Platform (@effect/platform)
**Documented Modules:** 7+ (Command, FileSystem, KeyValueStore, Path, PlatformLogger, Runtime, Terminal)
**Existing Patterns:** 3
**Coverage:** ⚠️ **30%** - SIGNIFICANT GAP

| Module | Covered By Pattern(s) |
|--------|----------------------|
| Command | ❌ NOT COVERED |
| FileSystem | `stream-from-file.mdx` (minimal) |
| KeyValueStore | ❌ NOT COVERED |
| Path | ❌ NOT COVERED |
| PlatformLogger | ❌ NOT COVERED |
| Runtime | `create-reusable-runtime-from-layers.mdx` (partial) |
| Terminal | ❌ NOT COVERED |

**Priority Gaps:**
- **HIGH:** Command execution patterns
- **HIGH:** FileSystem operations (read, write, list, delete)
- **HIGH:** KeyValueStore for persistent state
- **MEDIUM:** Path manipulation
- **MEDIUM:** Terminal I/O

**New Pattern Recommendations:**
1. `platform-command-execution.mdx` - Running shell commands
2. `platform-filesystem-operations.mdx` - File I/O patterns
3. `platform-keyvaluestore-persistence.mdx` - Persistent storage
4. `platform-terminal-interactive.mdx` - Interactive terminal applications
5. `platform-path-manipulation.mdx` - Cross-platform path handling

---

### 14. Testing
**Documented Topics:** 1 (TestClock)
**Existing Patterns:** 1+
**Coverage:** ✅ **100%** - EXCELLENT

| Topic | Covered By Pattern(s) |
|-------|----------------------|
| TestClock | `mocking-dependencies-in-tests.mdx` (partial) |

**Gaps:** Could expand with more advanced testing patterns

---

### 15. Code Style & Guidelines
**Documented Topics:** 4 (Guidelines, Dual APIs, Branded Types, Pattern Matching)
**Existing Patterns:** 3+
**Coverage:** ✅ **75%** - GOOD

| Topic | Covered By Pattern(s) |
|-------|----------------------|
| Branded Types | `brand-model-domain-type.mdx`, `model-validated-domain-types-with-brand.mdx` |
| Pattern Matching | `pattern-match.mdx`, `pattern-matching-effect.mdx`, `pattern-matchtag.mdx` |
| Best Practices | `use-gen-for-business-logic.mdx` |

**Gaps:** Dual APIs not covered

---

## Coverage Summary by Importance & Gap Size

### 🔴 CRITICAL GAPS (High Importance × Large Gap)

| Category | Current | Target | Priority | Estimated Patterns Needed |
|----------|---------|--------|----------|--------------------------|
| Sinks | 0 | 5 | 🔴 **CRITICAL** | 5 new patterns |
| Scheduling | 1 | 5 | 🔴 **CRITICAL** | 4 new patterns |
| Concurrency (advanced) | 2 | 7 | 🔴 **CRITICAL** | 5 new patterns |
| Streams (transforms) | 3 | 8 | 🟠 **HIGH** | 5 new patterns |

### 🟠 HIGH PRIORITY GAPS (High Importance × Medium Gap)

| Category | Current | Target | Priority | Estimated Patterns Needed |
|----------|---------|--------|----------|--------------------------|
| Platform | 2 | 7 | 🟠 **HIGH** | 5 new patterns |
| Error Management (advanced) | 6 | 10 | 🟠 **HIGH** | 3 new patterns |
| State Management (advanced) | 2 | 3 | 🟡 **MEDIUM** | 2 new patterns |

### 🟡 MEDIUM PRIORITY GAPS (Medium Importance × Medium Gap)

| Category | Current | Target | Priority | Estimated Patterns Needed |
|----------|---------|--------|----------|--------------------------|
| Testing & Mocking | 2 | 4 | 🟡 **MEDIUM** | 2 new patterns |

---

## Top 20 Recommended New Patterns (Prioritized by Impact)

### Tier 1: CRITICAL (Implement First)

1. **`sink-introduction-concepts.mdx`** - Foundational Sink knowledge (0→1)
2. **`schedule-exponential-backoff.mdx`** - Exponential backoff scheduling (1→2)
3. **`concurrency-semaphore-rate-limiting.mdx`** - Rate limiting primitive (2→3)
4. **`stream-transform-map-filter.mdx`** - Core stream operations (3→4)
5. **`sink-create-custom.mdx`** - Custom sink creation (1→2)

### Tier 2: HIGH (Implement Soon)

6. **`concurrency-deferred-future-value.mdx`** - Deferred/async coordination
7. **`schedule-cron-patterns.mdx`** - Cron scheduling
8. **`platform-command-execution.mdx`** - Shell command execution
9. **`stream-merge-combine.mdx`** - Stream composition
10. **`platform-filesystem-operations.mdx`** - File I/O operations

### Tier 3: HIGH (Implement Soon)

11. **`concurrency-latch-coordination.mdx`** - Multi-fiber coordination
12. **`stream-backpressure-control.mdx`** - Backpressure handling
13. **`schedule-conditional-scheduling.mdx`** - Conditional repetition
14. **`platform-keyvaluestore-persistence.mdx`** - Persistent storage
15. **`stream-stateful-operations.mdx`** - Scan, fold operations

### Tier 4: MEDIUM (Implement Later)

16. **`sink-operations-combinators.mdx`** - Sink transformations
17. **`error-accumulation-multiple.mdx`** - Collecting multiple errors
18. **`sink-concurrent-handling.mdx`** - Concurrent sinks
19. **`platform-terminal-interactive.mdx`** - Terminal I/O
20. **`state-synchronizedref-thread-safe.mdx`** - Thread-safe state

---

## Current Pattern Distribution

### By Category

```
Core Patterns:              131 patterns (89%)
├── Core Concepts:         ~8 patterns (6%)
├── Error Management:      ~8 patterns (5%)
├── Dependency Injection:  ~6 patterns (4%)
├── Resource Management:   ~2 patterns (1%)
├── Observability:         ~5 patterns (3%)
├── Scheduling:            ~1 pattern  (1%)  ⚠️
├── State Management:      ~2 patterns (1%)  ⚠️
├── Concurrency:           ~4 patterns (3%)  ⚠️
├── Streams:               ~8 patterns (6%)  ⚠️
├── Data Types:            ~11 patterns (8%)
├── HTTP/Networking:       ~8 patterns (6%)
├── Control Flow:          ~15 patterns (11%)
├── Schema:                ~34 patterns (25%)  ✅ Well covered
└── Other:                 ~20 patterns (15%)

Schema Patterns:           16 patterns (11%)
├── Form Validation:       1 pattern
├── API Responses:         1 pattern
├── Async Validation:      1 pattern
├── Transformations:       1 pattern
├── Error Handling:        1 pattern
├── Composition:           1 pattern
├── Others:                10 patterns
```

### Coverage Heat Map

```
EXCELLENT (90-100%)   ██████████ Dependency Injection, Resource Mgmt, Observability, Data Types, Schema
GOOD (70-89%)         ███████    Core Concepts, Error Management
ACCEPTABLE (50-69%)   ████       State Management, Streams (Core)
SIGNIFICANT GAP (30-49%)  ██     Concurrency, Platform
CRITICAL (0-29%)      █          Sinks, Scheduling
```

---

## Strategic Recommendations

### Phase 1: Fill Critical Gaps (Next 2 Weeks)
Focus on **Sinks** and **Scheduling** - these are foundational primitives with zero coverage.
- Create 5 Sink patterns
- Create 4 Scheduling patterns
- Estimated effort: 40-50 hours

### Phase 2: Concurrency & Streams (Following Month)
Expand advanced concurrency and stream transformation patterns.
- Create 5 Concurrency patterns
- Create 5 Stream patterns
- Estimated effort: 50-60 hours

### Phase 3: Platform Integration (Following Month)
Add cross-platform effect/platform utilities.
- Create 5 Platform patterns
- Estimated effort: 30-40 hours

### Phase 4: Advanced Topics (Ongoing)
Continue expanding error management, state management, and testing patterns.
- Create 8-10 advanced patterns
- Estimated effort: 40-50 hours total

---

## Technical Metrics

| Metric | Value |
|--------|-------|
| Total Documented API Topics | 100+ |
| Current Pattern Coverage | 147 patterns |
| Coverage Percentage | ~60-65% |
| Critical Gaps | 4 categories |
| High Priority Gaps | 3 categories |
| Recommended New Patterns | 20 patterns |
| Estimated Coverage After Phase 1 | ~70-75% |
| Estimated Coverage After All Phases | ~90%+ |

---

## Maintenance & Updates

This analysis should be **re-run quarterly** as Effect.website documentation evolves. Key metrics to track:

- New topics added to Effect documentation
- Coverage percentage trend
- Pattern quality scores (views, feedback, maintenance)
- Time to implement new patterns
- User requests for pattern coverage

---

**Last Updated:** December 17, 2025  
**Analysis Version:** 1.0  
**Next Review:** March 17, 2026
