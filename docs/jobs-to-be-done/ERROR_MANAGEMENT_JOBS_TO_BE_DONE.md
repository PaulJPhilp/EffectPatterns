# Error Management Jobs-to-be-Done

## What is this?

This document lists the **jobs** a developer needs to accomplish when handling errors in Effect. We audit patterns against these jobs to find gaps.

---

## 1. Getting Started with Errors ✅

### Jobs:
- [x] Catch any error with catchAll
- [x] Handle specific errors by tag
- [x] Understand the error channel

### Patterns (3):
- `error-management-hello-world.mdx` - Your First Error Handler
- `catch-tag.mdx` - Handle Errors with catchTag, catchTags, and catchAll
- `catch-specific.mdx` - Handling Specific Errors with catchTag and catchTags

---

## 2. Pattern Matching on Results ✅

### Jobs:
- [x] Match on success and failure
- [x] Match on Option and Either
- [x] Match on tagged unions
- [x] Use effectful pattern matching

### Patterns (5):
- `pattern-match.mdx` - Matching on Success and Failure with match
- `pattern-option-either-match.mdx` - Pattern Match on Option and Either
- `pattern-option-either-checks.mdx` - Checking Option and Either Cases
- `match-tag.mdx` - Matching Tagged Unions with matchTag and matchTags
- `match-effect.mdx` - Effectful Pattern Matching with matchEffect

---

## 3. Error Transformation ✅

### Jobs:
- [x] Map errors to domain types
- [x] Propagate errors up the stack
- [x] Accumulate multiple errors

### Patterns (3):
- `map-error.mdx` - Mapping Errors to Fit Your Domain
- `error-propagation.mdx` - Error Handling Pattern 2: Error Propagation and Chains
- `accumulate-errors.mdx` - Error Handling Pattern 1: Accumulating Multiple Errors

---

## 4. Retries and Resilience ✅

### Jobs:
- [x] Retry failed operations
- [x] Retry with exponential backoff
- [x] Handle flaky operations with timeouts
- [x] Retry based on error type

### Patterns (4):
- `retry-flaky.mdx` - Handle Flaky Operations with Retries and Timeouts
- `exponential-backoff.mdx` - Scheduling Pattern 2: Implement Exponential Backoff
- `retry-specific.mdx` - Retry Operations Based on Specific Errors
- `control-repetition.mdx` - Control Repetition with Schedule

---

## 5. Advanced Error Handling ✅

### Jobs:
- [x] Inspect error causes
- [x] Implement custom error strategies
- [x] Branch workflows on errors

### Patterns (3):
- `inspect-cause.mdx` - Handle Unexpected Errors by Inspecting the Cause
- `custom-strategies.mdx` - Error Handling Pattern 3: Custom Error Strategies
- `conditional-branching.mdx` - Conditionally Branching Workflows

---

## 6. Observability ✅

### Jobs:
- [x] Log errors structurally

### Patterns (1):
- `structured-logging.mdx` - Leverage Effect's Built-in Structured Logging

---

## Summary

| Category | Jobs | Covered | Gaps |
|----------|------|---------|------|
| Getting Started with Errors | 3 | 3 | 0 |
| Pattern Matching on Results | 4 | 4 | 0 |
| Error Transformation | 3 | 3 | 0 |
| Retries and Resilience | 4 | 4 | 0 |
| Advanced Error Handling | 3 | 3 | 0 |
| Observability | 1 | 1 | 0 |
| **Total** | **18** | **18** | **0** |

### Coverage: 100%

Error management is comprehensively covered with 19 patterns.

