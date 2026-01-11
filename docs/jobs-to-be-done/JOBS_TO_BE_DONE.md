# Effect Developer Jobs-to-be-Done

## What is this?

This document lists the **jobs** a developer needs to accomplish when building with Effect. Each job represents a real task, not an API feature. We audit our patterns against these jobs to find gaps.

---

## 1. Getting Started

### Jobs:
- [ ] Set up a new Effect project
- [ ] Run my first Effect program
- [ ] Understand what Effect gives me over plain TypeScript
- [ ] Convert existing async/await code to Effect

### Patterns needed:
- Project setup guide
- "Hello World" with Effect
- Why Effect (comparison with Promise)
- Migration from async/await

---

## 2. Creating Effects

### Jobs:
- [ ] Wrap a synchronous value in an Effect
- [ ] Wrap an async operation (Promise) in an Effect
- [ ] Wrap a callback-based API in an Effect
- [ ] Create an Effect that always fails
- [ ] Create an Effect from a nullable value

### Patterns needed:
- Effect.succeed, Effect.fail
- Effect.tryPromise
- Effect.async (callbacks)
- Effect.fromNullable

---

## 3. Transforming Effects

### Jobs:
- [ ] Transform the success value of an Effect
- [ ] Chain Effects together (do one, then another)
- [ ] Run multiple Effects and collect results
- [ ] Run Effects conditionally

### Patterns needed:
- Effect.map
- Effect.flatMap / Effect.andThen
- Effect.all, Effect.forEach
- Effect.if, Effect.when

---

## 4. Handling Errors

### Jobs:
- [ ] Catch and recover from an error
- [ ] Catch a specific error type
- [ ] Provide a fallback value on error
- [ ] Transform an error into a different error
- [ ] Accumulate multiple errors (validation)
- [ ] Retry an operation that failed

### Patterns needed:
- Effect.catchAll, Effect.catchTag
- Effect.orElse, Effect.orElseSucceed
- Effect.mapError
- Effect.validate, Effect.all({ mode: "validate" })
- Effect.retry with Schedule

---

## 5. Managing Resources

### Jobs:
- [ ] Acquire a resource and ensure it's released
- [ ] Use a database connection safely
- [ ] Open a file and ensure it's closed
- [ ] Manage multiple resources together
- [ ] Scope resource lifetime

### Patterns needed:
- Effect.acquireRelease
- Effect.ensuring
- Scope and Effect.scoped
- Resource composition

---

## 6. Running Concurrent Operations

### Jobs:
- [ ] Run multiple tasks in parallel
- [ ] Race tasks and take the first result
- [ ] Timeout an operation
- [ ] Limit how many tasks run at once
- [ ] Coordinate between concurrent tasks
- [ ] Cancel a running task

### Patterns needed:
- Effect.all with concurrency
- Effect.race, Effect.raceAll
- Effect.timeout
- Semaphore for rate limiting
- Deferred, Latch for coordination
- Fiber interruption

---

## 7. Processing Streams of Data

### Jobs:
- [ ] Create a stream from an array/iterable
- [ ] Create a stream from a paginated API
- [ ] Transform stream elements
- [ ] Filter stream elements
- [ ] Batch stream elements
- [ ] Handle stream errors
- [ ] Write stream to a destination (Sink)

### Patterns needed:
- Stream.fromIterable, Stream.unfold
- Stream.map, Stream.filter
- Stream.grouped, Stream.sliding
- Stream error handling
- Sink patterns

---

## 8. Scheduling and Retrying

### Jobs:
- [ ] Retry a failed operation with backoff
- [ ] Repeat an operation on an interval
- [ ] Run something on a cron schedule
- [ ] Debounce or throttle operations
- [ ] Combine retry strategies

### Patterns needed:
- Schedule.exponential, Schedule.fixed
- Schedule.cron
- Schedule combinators
- Effect.retry, Effect.repeat

---

## 9. Managing State

### Jobs:
- [ ] Share mutable state between operations
- [ ] Update state atomically
- [ ] Subscribe to state changes
- [ ] Manage state with transactions

### Patterns needed:
- Ref basics
- SynchronizedRef for atomic updates
- SubscriptionRef for reactive state

---

## 10. Building Services

### Jobs:
- [ ] Define a service interface
- [ ] Implement a service
- [ ] Compose services with Layers
- [ ] Test with mock services
- [ ] Access configuration

### Patterns needed:
- Context and Tag
- Layer.succeed, Layer.effect
- Layer composition
- Testing with test implementations
- Config module

---

## 11. Making HTTP Requests

### Jobs:
- [ ] Make a GET request
- [ ] Make a POST request with body
- [ ] Handle HTTP errors
- [ ] Parse JSON responses with Schema
- [ ] Add authentication headers

### Patterns needed:
- HttpClient basics
- Request/Response handling
- Schema integration
- Authentication patterns

---

## 12. Observing and Debugging

### Jobs:
- [ ] Log what's happening
- [ ] Trace operations across boundaries
- [ ] Measure performance/metrics
- [ ] Debug a failing Effect

### Patterns needed:
- Effect.log, structured logging
- Tracing with spans
- Metrics collection
- Debugging tools

---

## 13. Platform Operations

### Jobs:
- [ ] Read/write files
- [ ] Run shell commands
- [ ] Interactive terminal I/O
- [ ] Persist data with key-value store

### Patterns needed:
- FileSystem module
- Command module
- Terminal module
- KeyValueStore module

---

## 14. Validating Data

### Jobs:
- [ ] Validate user input
- [ ] Parse JSON safely
- [ ] Define complex schemas
- [ ] Get helpful error messages

### Patterns needed:
- Schema basics
- Schema composition
- Error formatting
- Form validation

---

## Audit Status (December 18, 2025)

| Category | Jobs | Patterns | Coverage |
|----------|------|----------|----------|
| 1. Getting Started | 4 | 18 | ✅ Full |
| 2. Creating Effects | 5 | 52 | ✅ Full |
| 3. Transforming Effects | 4 | 72 | ✅ Full |
| 4. Handling Errors | 6 | 43 | ✅ Full |
| 5. Managing Resources | 5 | 21 | ✅ Full |
| 6. Concurrent Operations | 6 | 27 | ✅ Full |
| 7. Processing Streams | 7 | 39 | ✅ Full |
| 8. Scheduling/Retrying | 5 | 13 | ✅ Full |
| 9. Managing State | 4 | 20 | ✅ Full |
| 10. Building Services | 5 | 40 | ✅ Full |
| 11. HTTP Requests | 5 | 24 | ✅ Full |
| 12. Observing/Debugging | 4 | 23 | ✅ Full |
| 13. Platform Operations | 4 | 11 | ✅ Full |
| 14. Validating Data | 4 | 39 | ✅ Full |

**Total Jobs: 68**
**Total Patterns: 169 (core)**
**Coverage: 100% of job categories**

---

## Next Steps

1. Audit each job against existing patterns
2. Mark gaps where no pattern helps with the job
3. Prioritize gaps by developer need
4. Create patterns to fill gaps

