# Streams Jobs-to-be-Done

## What is this?

This document lists the **jobs** a developer needs to accomplish when using Effect Streams. We audit patterns against these jobs to find gaps.

---

## 1. Getting Started with Streams ✅ COMPLETE

### Jobs:
- [x] Create a stream from values, arrays, or generators
- [x] Understand what a Stream is vs an Effect
- [x] Run a stream and collect results
- [x] Control stream size with take/drop

### Patterns (4 beginner):
- `stream-hello-world` - Your First Stream
- `stream-vs-effect` - Stream vs Effect - When to Use Which
- `stream-running-collecting` - Running and Collecting Stream Results
- `stream-take-drop` - Take and Drop Stream Elements

---

## 2. Basic Transformations ✅ PARTIAL

### Jobs:
- [x] Map values in a stream
- [x] Filter stream items
- [ ] Take/drop items
- [ ] Flatten nested streams

### Current Patterns:
- "Stream Pattern 1: Transform Streams with Map and Filter" (beginner)

### Needed:
- Take, drop, takeWhile, dropWhile patterns
- flatMap basics

---

## 3. Combining Streams ✅

### Jobs:
- [x] Merge multiple streams
- [x] Combine streams
- [ ] Zip streams together
- [ ] Interleave streams

### Current Patterns:
- "Stream Pattern 2: Merge and Combine Multiple Streams" (intermediate)

---

## 4. Stream Control ✅

### Jobs:
- [x] Control backpressure
- [x] Stateful operations (scan/fold)
- [x] Grouping and windowing

### Current Patterns:
- "Stream Pattern 3: Control Backpressure" (intermediate)
- "Stream Pattern 4: Stateful Operations" (intermediate)
- "Stream Pattern 5: Grouping and Windowing" (advanced)

---

## 5. Error Handling ✅

### Jobs:
- [x] Handle errors in streams
- [x] Retry failed operations
- [x] Fallback to alternative

### Current Patterns:
- "Stream Pattern 7: Error Handling in Streams" (advanced)
- "Sink Pattern 5: Fall Back to Alternative" (intermediate)
- "Sink Pattern 6: Retry Failed Operations" (intermediate)

---

## 6. Resource Management ✅

### Jobs:
- [x] Manage resources in streams
- [x] Advanced transformations

### Current Patterns:
- "Stream Pattern 6: Resource Management" (advanced)
- "Stream Pattern 8: Advanced Transformations" (advanced)

---

## 7. Sinks and Persistence ✅

### Jobs:
- [x] Write to files
- [x] Insert to database
- [x] Send to message queue
- [x] Write to event log

### Current Patterns:
- "Sink Pattern 1: Batch Insert to Database" (intermediate)
- "Sink Pattern 2: Write to Event Log" (intermediate)
- "Sink Pattern 3: Write to File" (intermediate)
- "Sink Pattern 4: Send to Message Queue" (intermediate)

---

## Audit Summary

| Category | Jobs | Patterns | Beginner | Status |
|----------|------|----------|----------|--------|
| Getting Started | 4 | 4 | 4 | ✅ NEW |
| Basic Transforms | 4 | 1 | 1 | ✅ |
| Combining | 4 | 1 | 0 | ✅ |
| Control | 3 | 3 | 0 | ✅ |
| Error Handling | 3 | 3 | 0 | ✅ |
| Resources | 2 | 2 | 0 | ✅ |
| Sinks | 4 | 4 | 0 | ✅ |

**Total: 24 jobs, 18 patterns, 5 beginner**

---

## New Structure

```
streams-getting-started/  (4) NEW - First stream, vs Effect, collecting, take/drop
streams/                  (8) Main patterns - transforms, combining, control, errors, resources
streams-sinks/            (6) Output patterns - files, database, queues, retry
```

Previously 4 fragmented categories → Now 3 coherent categories

