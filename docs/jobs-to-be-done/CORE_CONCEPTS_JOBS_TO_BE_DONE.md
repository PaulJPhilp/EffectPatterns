# Core Concepts Jobs-to-be-Done

## What is this?

This document lists the **jobs** a developer needs to accomplish when learning Effect's core concepts. We audit patterns against these jobs to find gaps.

---

## 1. Understanding Effects ✅

### Jobs:
- [x] Understand that Effects are lazy descriptions
- [x] Understand the three type parameters (A, E, R)
- [x] Run Effects synchronously and asynchronously

### Patterns (4):
- `understand-effects-are-lazy.mdx` - Understand that Effects are Lazy Blueprints
- `understand-three-channels.mdx` - Understand the Three Effect Channels (A, E, R)
- `execute-sync.mdx` - Execute Synchronous Effects with Effect.runSync
- `execute-async.mdx` - Execute Asynchronous Effects with Effect.runPromise

---

## 2. Creating Effects ✅

### Jobs:
- [x] Create Effects from values (succeed, fail)
- [x] Wrap synchronous code in Effects
- [x] Wrap asynchronous/Promise code in Effects
- [x] Create from nullable/Option/Either values

### Patterns (5):
- `create-pre-resolved.mdx` - Create Pre-resolved Effects with succeed and fail
- `wrap-sync.mdx` - Wrap Synchronous Computations with sync and try
- `wrap-async.mdx` - Wrap Asynchronous Computations with tryPromise
- `creating-from-sync-callback.mdx` - Creating from Synchronous and Callback Code
- `converting-from-nullable.mdx` - Converting from Nullable, Option, or Either

---

## 3. Transforming Effects ✅

### Jobs:
- [x] Transform success values with map
- [x] Chain Effects with flatMap
- [x] Combine values with zip
- [x] Filter results

### Patterns (5):
- `transforming-with-map.mdx` - Transforming Values with map
- `chaining-with-flatmap.mdx` - Chaining Computations with flatMap
- `combining-with-zip.mdx` - Combining Values with zip
- `filtering-results.mdx` - Filtering Results with filter
- `transform-effect-values.mdx` - Transform Effect Values with map and flatMap

---

## 4. Sequencing and Control Flow ✅

### Jobs:
- [x] Write sequential code with generators
- [x] Use andThen, tap, and flatten
- [x] Branch conditionally (if, when, cond)
- [x] Use pipe for composition

### Patterns (5):
- `write-sequential-with-gen.mdx` - Write Sequential Code with Effect.gen
- `sequencing-with-andthen.mdx` - Sequencing with andThen, tap, and flatten
- `conditional-branching.mdx` - Conditional Branching with if, when, and cond
- `control-flow-conditionals.mdx` - Control Flow with Conditional Combinators
- `use-pipe-for-composition.mdx` - Use .pipe for Composition

---

## 5. Working with Collections ✅

### Jobs:
- [x] Process collections with forEach and all
- [x] Use Chunk for high-performance lists
- [x] Create Effects from collections

### Patterns (4):
- `mapping-chaining-foreach-all.mdx` - Mapping and Chaining over Collections
- `use-chunk.mdx` - Use Chunk for High-Performance Collections
- `creating-from-collections.mdx` - Creating from Collections
- `working-with-arrays.mdx` - Working with Immutable Arrays

---

## 6. Data Types ✅

### Jobs:
- [x] Work with Option for missing values
- [x] Work with Either for errors
- [x] Use Duration for time spans
- [x] Use DateTime for dates and times
- [x] Use BigDecimal for precise numbers

### Patterns (7):
- `model-optional-values.mdx` - Model Optional Values Safely with Option
- `optional-pattern-1.mdx` - Handling None and Some Values
- `optional-pattern-2.mdx` - Optional Chaining and Composition
- `accumulate-errors-either.mdx` - Accumulate Multiple Errors with Either
- `duration.mdx` - Representing Time Spans with Duration
- `datetime.mdx` - Work with Dates and Times using DateTime
- `bigdecimal.mdx` - Work with Arbitrary-Precision Numbers

---

## 7. Data Modeling ✅

### Jobs:
- [x] Create structurally equal data with Data.struct
- [x] Model tagged unions with Data.case
- [x] Work with tuples
- [x] Use HashSet for sets
- [x] Compare data by value

### Patterns (6):
- `data-struct.mdx` - Comparing Data by Value with Data.struct
- `data-case.mdx` - Modeling Tagged Unions with Data.case
- `data-tuple.mdx` - Working with Tuples with Data.tuple
- `hashset.mdx` - Work with Immutable Sets using HashSet
- `structural-equality.mdx` - Comparing Data by Value with Structural Equality
- `type-classes.mdx` - Type Classes for Equality, Ordering, and Hashing

---

## 8. Context and Configuration ✅

### Jobs:
- [x] Access configuration from context
- [x] Define type-safe configuration schemas
- [x] Provide configuration via layers

### Patterns (3):
- `access-config-context.mdx` - Access Configuration from the Context
- `define-config-schema.mdx` - Define a Type-Safe Configuration Schema
- `provide-config-layer.mdx` - Provide Configuration to Your App via a Layer

---

## 9. Layers and Runtime ✅

### Jobs:
- [x] Understand layers for dependency injection
- [x] Create a reusable runtime
- [x] Model results with Exit

### Patterns (3):
- `understand-layers.mdx` - Understand Layers for Dependency Injection
- `create-runtime.mdx` - Create a Reusable Runtime from Layers
- `exit.mdx` - Modeling Effect Results with Exit

---

## 10. Utilities ✅

### Jobs:
- [x] Redact sensitive data
- [x] Handle unexpected errors (Cause)
- [x] Process streaming data

### Patterns (3):
- `redact-sensitive.mdx` - Redact and Handle Sensitive Data
- `inspect-cause.mdx` - Handle Unexpected Errors by Inspecting the Cause
- `process-stream.mdx` - Process Streaming Data with Stream

---

## Summary

| Category | Jobs | Covered | Gaps |
|----------|------|---------|------|
| Understanding Effects | 3 | 3 | 0 |
| Creating Effects | 4 | 4 | 0 |
| Transforming Effects | 4 | 4 | 0 |
| Sequencing and Control Flow | 4 | 4 | 0 |
| Working with Collections | 3 | 3 | 0 |
| Data Types | 5 | 5 | 0 |
| Data Modeling | 5 | 5 | 0 |
| Context and Configuration | 3 | 3 | 0 |
| Layers and Runtime | 3 | 3 | 0 |
| Utilities | 3 | 3 | 0 |
| **Total** | **37** | **37** | **0** |

### Coverage: 100%

Core concepts are thoroughly covered with 55 patterns.

