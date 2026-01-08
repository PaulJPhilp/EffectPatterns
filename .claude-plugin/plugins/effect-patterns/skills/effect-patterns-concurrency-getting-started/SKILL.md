---
name: effect-patterns-concurrency-getting-started
description: Effect-TS patterns for Concurrency Getting Started. Use when working with concurrency getting started in Effect-TS applications.
---
# Effect-TS Patterns: Concurrency Getting Started
This skill provides 3 curated Effect-TS patterns for concurrency getting started.
Use this skill when working on tasks related to:
- concurrency getting started
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Race Effects and Handle Timeouts

**Rule:** Use Effect.race for fastest-wins, Effect.timeout for time limits.

**Good Example:**

```typescript
import { Effect, Option } from "effect"

// ============================================
// BASIC RACE: First one wins
// ============================================

const server1 = Effect.gen(function* () {
  yield* Effect.sleep("100 millis")
  return "Response from server 1"
})

const server2 = Effect.gen(function* () {
  yield* Effect.sleep("50 millis")
  return "Response from server 2"
})

const raceServers = Effect.race(server1, server2)

Effect.runPromise(raceServers).then((result) => {
  console.log(result) // "Response from server 2" (faster)
})

// ============================================
// BASIC TIMEOUT: Limit execution time
// ============================================

const slowOperation = Effect.gen(function* () {
  yield* Effect.sleep("5 seconds")
  return "Finally done"
})

// Returns Option.none if timeout
const withTimeout = slowOperation.pipe(
  Effect.timeout("1 second")
)

Effect.runPromise(withTimeout).then((result) => {
  if (Option.isNone(result)) {
    console.log("Operation timed out")
  } else {
    console.log(`Got: ${result.value}`)
  }
})

// ============================================
// TIMEOUT WITH FALLBACK
// ============================================

const withFallback = slowOperation.pipe(
  Effect.timeoutTo({
    duration: "1 second",
    onTimeout: () => Effect.succeed("Using cached value"),
  })
)

Effect.runPromise(withFallback).then((result) => {
  console.log(result) // "Using cached value"
})

// ============================================
// TIMEOUT FAIL: Throw error on timeout
// ============================================

class TimeoutError {
  readonly _tag = "TimeoutError"
}

const failOnTimeout = slowOperation.pipe(
  Effect.timeoutFail({
    duration: "1 second",
    onTimeout: () => new TimeoutError(),
  })
)

// ============================================
// RACE ALL: Multiple competing effects
// ============================================

const fetchFromCache = Effect.gen(function* () {
  yield* Effect.sleep("10 millis")
  return { source: "cache", data: "cached data" }
})

const fetchFromDB = Effect.gen(function* () {
  yield* Effect.sleep("100 millis")
  return { source: "db", data: "fresh data" }
})

const fetchFromAPI = Effect.gen(function* () {
  yield* Effect.sleep("200 millis")
  return { source: "api", data: "api data" }
})

const raceAll = Effect.raceAll([fetchFromCache, fetchFromDB, fetchFromAPI])

Effect.runPromise(raceAll).then((result) => {
  console.log(`Winner: ${result.source}`) // "cache"
})

// ============================================
// PRACTICAL: API with timeout and fallback
// ============================================

const fetchWithResilience = (url: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise(() =>
      fetch(url).then((r) => r.json())
    ).pipe(
      Effect.timeout("3 seconds"),
      Effect.flatMap((opt) =>
        Option.isSome(opt)
          ? Effect.succeed(opt.value)
          : Effect.succeed({ error: "timeout", cached: true })
      )
    )
    
    return response
  })
```

**Rationale:**

Use `Effect.race` when you want the first result from competing effects. Use `Effect.timeout` to limit how long an effect can run.

---


Racing and timeouts prevent your app from hanging:

1. **Redundant requests** - Race multiple servers, use fastest response
2. **Timeouts** - Fail fast if operation takes too long
3. **Fallbacks** - Try fast path, fall back to slow path

---

---

### Understanding Fibers

**Rule:** Fibers are lightweight threads managed by Effect, enabling efficient concurrency without OS thread overhead.

**Good Example:**

```typescript
import { Effect, Fiber } from "effect"

// ============================================
// WHAT IS A FIBER?
// ============================================

// A fiber is a running effect. When you run an effect,
// it executes on a fiber.

const myEffect = Effect.gen(function* () {
  yield* Effect.log("Hello from a fiber!")
  yield* Effect.sleep("100 millis")
  return 42
})

// This runs myEffect on the "main" fiber
Effect.runPromise(myEffect)

// ============================================
// FORKING: Create a new fiber
// ============================================

const withFork = Effect.gen(function* () {
  yield* Effect.log("Main fiber starting")
  
  // Fork creates a new fiber that runs independently
  const fiber = yield* Effect.fork(
    Effect.gen(function* () {
      yield* Effect.log("Child fiber running")
      yield* Effect.sleep("200 millis")
      yield* Effect.log("Child fiber done")
      return "child result"
    })
  )
  
  yield* Effect.log("Main fiber continues immediately")
  yield* Effect.sleep("100 millis")
  yield* Effect.log("Main fiber waiting for child...")
  
  // Wait for the forked fiber to complete
  const result = yield* Fiber.join(fiber)
  yield* Effect.log(`Got result: ${result}`)
})

Effect.runPromise(withFork)
/*
Output:
Main fiber starting
Child fiber running
Main fiber continues immediately
Main fiber waiting for child...
Child fiber done
Got result: child result
*/

// ============================================
// FIBER OPERATIONS
// ============================================

const fiberOps = Effect.gen(function* () {
  const fiber = yield* Effect.fork(
    Effect.gen(function* () {
      yield* Effect.sleep("1 second")
      return "done"
    })
  )
  
  // Check if fiber is done (non-blocking)
  const poll = yield* Fiber.poll(fiber)
  yield* Effect.log(`Poll result: ${poll}`) // None (still running)
  
  // Wait for completion
  const result = yield* Fiber.join(fiber)
  yield* Effect.log(`Join result: ${result}`)
  
  // Or interrupt if taking too long
  // yield* Fiber.interrupt(fiber)
})
```

**Rationale:**

Fibers are Effect's lightweight threads. They're cheap to create (thousands are fine), automatically managed, and can be interrupted cleanly.

---


Unlike OS threads:

1. **Lightweight** - Create thousands without performance issues
2. **Cooperative** - Yield control at effect boundaries
3. **Interruptible** - Can be cancelled cleanly
4. **Structured** - Parent fibers manage children

---

---

### Your First Parallel Operation

**Rule:** Use Effect.all with concurrency option to run independent effects in parallel.

**Good Example:**

```typescript
import { Effect } from "effect"

// Simulate async operations
const fetchUser = Effect.gen(function* () {
  yield* Effect.sleep("100 millis")
  return { id: 1, name: "Alice" }
})

const fetchProducts = Effect.gen(function* () {
  yield* Effect.sleep("150 millis")
  return [{ id: 1, name: "Widget" }, { id: 2, name: "Gadget" }]
})

const fetchCart = Effect.gen(function* () {
  yield* Effect.sleep("80 millis")
  return { items: 3, total: 99.99 }
})

// ============================================
// SEQUENTIAL: One after another (~330ms)
// ============================================

const sequential = Effect.all([fetchUser, fetchProducts, fetchCart])

// ============================================
// PARALLEL: All at once (~150ms)
// ============================================

const parallel = Effect.all(
  [fetchUser, fetchProducts, fetchCart],
  { concurrency: "unbounded" }
)

// ============================================
// PARALLEL WITH LIMIT: Max 2 at a time
// ============================================

const limited = Effect.all(
  [fetchUser, fetchProducts, fetchCart],
  { concurrency: 2 }
)

// ============================================
// DEMO
// ============================================

const demo = Effect.gen(function* () {
  const start = Date.now()
  
  const [user, products, cart] = yield* parallel
  
  const elapsed = Date.now() - start
  yield* Effect.log(`Fetched in ${elapsed}ms`)
  yield* Effect.log(`User: ${user.name}`)
  yield* Effect.log(`Products: ${products.length}`)
  yield* Effect.log(`Cart total: $${cart.total}`)
})

Effect.runPromise(demo)
// Output: Fetched in ~150ms (not ~330ms!)
```

**Rationale:**

Use `Effect.all` with `{ concurrency: "unbounded" }` to run independent effects in parallel. Without the option, effects run sequentially.

---


Parallel execution speeds up independent operations:

1. **Fetch multiple APIs** - Get user, products, cart simultaneously
2. **Process files** - Read multiple files at once
3. **Database queries** - Run independent queries in parallel

---

---


