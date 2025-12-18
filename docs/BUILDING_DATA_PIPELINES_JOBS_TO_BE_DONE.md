# Building Data Pipelines Jobs-to-be-Done

## What is this?

This document lists the **jobs** a developer needs to accomplish when building data pipelines with Effect. We audit patterns against these jobs to find gaps.

---

## 1. Creating Pipelines ✅

### Jobs:
- [x] Create a pipeline from a list/array
- [x] Turn a paginated API into a stream
- [x] Process a large file with constant memory

### Patterns (3):
- `create-from-list.mdx` - Create a Stream from a List
- `paginated-api-stream.mdx` - Turn a Paginated API into a Single Stream
- `process-large-file.mdx` - Process a Large File with Constant Memory

---

## 2. Processing Data ✅

### Jobs:
- [x] Process items concurrently
- [x] Process items in batches
- [x] Process collections asynchronously

### Patterns (3):
- `process-concurrently.mdx` - Process Items Concurrently
- `process-batches.mdx` - Process Items in Batches
- `process-async.mdx` - Process collections of data asynchronously

---

## 3. Running Pipelines ✅

### Jobs:
- [x] Collect all results into a list
- [x] Run a pipeline for side effects only

### Patterns (2):
- `collect-results.mdx` - Collect All Results into a List
- `run-side-effects.mdx` - Run a Pipeline for its Side Effects

---

## 4. Resilience ✅

### Jobs:
- [x] Manage resources safely in a pipeline
- [x] Automatically retry failed operations

### Patterns (2):
- `manage-resources.mdx` - Manage Resources Safely in a Pipeline
- `auto-retry.mdx` - Automatically Retry Failed Operations

---

## 5. Advanced Pipeline Patterns

### Jobs:
- [ ] Implement backpressure
- [ ] Fan out to multiple consumers
- [ ] Merge multiple streams
- [ ] Implement dead letter queues

### Gap Analysis:
These advanced patterns would be useful:
- Backpressure and flow control
- Fan-out/fan-in patterns
- Stream merging and zipping
- Error routing to dead letter queues

---

## Summary

| Category | Jobs | Covered | Gaps |
|----------|------|---------|------|
| Creating Pipelines | 3 | 3 | 0 |
| Processing Data | 3 | 3 | 0 |
| Running Pipelines | 2 | 2 | 0 |
| Resilience | 2 | 2 | 0 |
| Advanced Pipeline Patterns | 4 | 0 | 4 |
| **Total** | **14** | **10** | **4** |

### Coverage: 71%

Core pipeline patterns are well covered. Advanced patterns (backpressure, fan-out, merging) could be added.

