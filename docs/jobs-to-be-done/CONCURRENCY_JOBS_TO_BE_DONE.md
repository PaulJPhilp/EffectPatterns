# Concurrency Jobs-to-be-Done

## What is this?

This document lists the **jobs** a developer needs to accomplish when using Effect's concurrency primitives.

---

## 1. Getting Started with Concurrency ✅ COMPLETE

### Jobs:
- [x] Run effects in parallel (Effect.all)
- [x] Understand what a Fiber is
- [x] Race effects and handle timeouts
- [x] Fork background work

### Patterns (4 beginner):
- **NEW** `concurrency-hello-world` - Your First Parallel Operation
- **NEW** `concurrency-understanding-fibers` - Understanding Fibers
- **NEW** `concurrency-fork-basics` - Fork Background Work
- **NEW** `concurrency-race-timeout` - Race Effects and Handle Timeouts

---

## 2. Parallel Execution ⚠️ NO BEGINNER

### Jobs:
- [x] Run independent effects in parallel
- [x] Process collections in parallel
- [x] Race for fastest result

### Current Patterns:
- "Run Independent Effects in Parallel with Effect.all" (intermediate)
- "Process a Collection in Parallel with Effect.forEach" (intermediate)
- "Race Concurrent Effects for the Fastest Result" (intermediate)

---

## 3. Fiber Management ⚠️ NO BEGINNER

### Jobs:
- [x] Fork background tasks
- [x] Run long-running apps
- [x] Understand fibers

### Current Patterns:
- "Run Background Tasks with Effect.fork" (advanced)
- "Execute Long-Running Apps with Effect.runFork" (advanced)
- "Understand Fibers as Lightweight Threads" (advanced)

---

## 4. Coordination Primitives ✅

### Jobs:
- [x] Coordinate with Deferred
- [x] Use Semaphore for rate limiting
- [x] Coordinate with Latch
- [x] Distribute work with Queue
- [x] Broadcast with PubSub
- [x] Race and timeout

### Current Patterns: 6 intermediate patterns

---

## 5. Shared State ✅

### Jobs:
- [x] Manage state with Ref
- [x] Synchronized state with SynchronizedRef
- [x] Observable state with SubscriptionRef

### Current Patterns:
- "Manage Shared State Safely with Ref" (intermediate)
- "State Management Pattern 1: SynchronizedRef" (advanced)
- "State Management Pattern 2: SubscriptionRef" (advanced)

---

## 6. Resource & Lifecycle ✅

### Jobs:
- [x] Manage resources with Scope
- [x] Graceful shutdown
- [x] Add caching

### Current Patterns:
- "Manage Resource Lifecycles with Scope" (advanced)
- "Implement Graceful Shutdown" (advanced)
- "Add Caching by Wrapping a Layer" (advanced)

---

## Audit Summary

| Category | Jobs | Patterns | Beginner | Status |
|----------|------|----------|----------|--------|
| Getting Started | 4 | 4 | 4 | ✅ NEW |
| Parallel Execution | 3 | 3 | 0 | ✅ |
| Fiber Management | 3 | 3 | 0 | ✅ |
| Coordination | 6 | 6 | 0 | ✅ |
| Shared State | 3 | 3 | 0 | ✅ |
| Resource/Lifecycle | 3 | 3 | 0 | ✅ |

**Total: 22 jobs, 24 patterns, 4 beginner**

---

## Structure

```
concurrency-getting-started/  (4) NEW - Parallel, fibers, fork, race
concurrency/                  (20) All coordination and state patterns
```

Previously 3 fragmented categories → Now 2 coherent categories

