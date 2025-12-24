# streams-getting-started Patterns

## Running and Collecting Stream Results

Choose the right Stream.run* method based on what you need from the results.

### Example

```typescript
import { Effect, Stream, Option } from "effect"

const numbers = Stream.make(1, 2, 3, 4, 5)

// ============================================
// runCollect - Get all results as a Chunk
// ============================================

const collectAll = numbers.pipe(
  Stream.map((n) => n * 10),
  Stream.runCollect
)

Effect.runPromise(collectAll).then((chunk) => {
  console.log([...chunk])  // [10, 20, 30, 40, 50]
})

// ============================================
// runForEach - Process each item
// ============================================

const processEach = numbers.pipe(
  Stream.runForEach((n) =>
    Effect.log(`Processing: ${n}`)
  )
)

Effect.runPromise(processEach)
// Logs: Processing: 1, Processing: 2, etc.

// ============================================
// runDrain - Run for side effects only
// ============================================

const withSideEffects = numbers.pipe(
  Stream.tap((n) => Effect.log(`Saw: ${n}`)),
  Stream.runDrain  // Discard values, just run
)

// ============================================
// runHead - Get first value only
// ============================================

const getFirst = numbers.pipe(
  Stream.runHead
)

Effect.runPromise(getFirst).then((option) => {
  if (Option.isSome(option)) {
    console.log(`First: ${option.value}`)  // First: 1
  }
})

// ============================================
// runLast - Get last value only
// ============================================

const getLast = numbers.pipe(
  Stream.runLast
)

Effect.runPromise(getLast).then((option) => {
  if (Option.isSome(option)) {
    console.log(`Last: ${option.value}`)  // Last: 5
  }
})

// ============================================
// runFold - Accumulate into single result
// ============================================

const sum = numbers.pipe(
  Stream.runFold(0, (acc, n) => acc + n)
)

Effect.runPromise(sum).then((total) => {
  console.log(`Sum: ${total}`)  // Sum: 15
})

// ============================================
// runCount - Count elements
// ============================================

const count = numbers.pipe(Stream.runCount)

Effect.runPromise(count).then((n) => {
  console.log(`Count: ${n}`)  // Count: 5
})
```

---

## Stream vs Effect - When to Use Which

Use Effect for single values, Stream for sequences of values.

### Example

```typescript
import { Effect, Stream } from "effect"

// ============================================
// EFFECT: Single result operations
// ============================================

// Fetch one user - returns Effect<User>
const fetchUser = (id: string) =>
  Effect.tryPromise(() =>
    fetch(`/api/users/${id}`).then((r) => r.json())
  )

// Read entire config - returns Effect<Config>
const loadConfig = Effect.tryPromise(() =>
  fetch("/config.json").then((r) => r.json())
)

// ============================================
// STREAM: Multiple values operations
// ============================================

// Process file line by line - returns Stream<string>
const fileLines = Stream.fromIterable([
  "line 1",
  "line 2",
  "line 3",
])

// Generate events over time - returns Stream<Event>
const events = Stream.make(
  { type: "click", x: 10 },
  { type: "click", x: 20 },
  { type: "scroll", y: 100 },
)

// ============================================
// CONVERTING BETWEEN THEM
// ============================================

// Effect → Stream (single value becomes 1-element stream)
const effectToStream = Stream.fromEffect(fetchUser("123"))

// Stream → Effect (collect all values into array)
const streamToEffect = Stream.runCollect(fileLines)

// Stream → Effect (process each value for side effects)
const processAll = fileLines.pipe(
  Stream.runForEach((line) => Effect.log(`Processing: ${line}`))
)

// ============================================
// DECISION GUIDE
// ============================================

// Use Effect when:
// - Fetching a single resource
// - Computing a single result
// - Performing one action

// Use Stream when:
// - Reading files line by line
// - Processing paginated API results
// - Handling real-time events
// - Processing large datasets
// - Building data pipelines
```

---

## Take and Drop Stream Elements

Use take/drop to control stream size, takeWhile/dropWhile for conditional limits.

### Example

```typescript
import { Effect, Stream } from "effect"

const numbers = Stream.make(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

// ============================================
// take - Get first N elements
// ============================================

const firstThree = numbers.pipe(
  Stream.take(3),
  Stream.runCollect
)

Effect.runPromise(firstThree).then((chunk) => {
  console.log([...chunk])  // [1, 2, 3]
})

// ============================================
// drop - Skip first N elements
// ============================================

const skipThree = numbers.pipe(
  Stream.drop(3),
  Stream.runCollect
)

Effect.runPromise(skipThree).then((chunk) => {
  console.log([...chunk])  // [4, 5, 6, 7, 8, 9, 10]
})

// ============================================
// Combine for pagination (skip + limit)
// ============================================

const page2 = numbers.pipe(
  Stream.drop(3),   // Skip first page
  Stream.take(3),   // Take second page
  Stream.runCollect
)

Effect.runPromise(page2).then((chunk) => {
  console.log([...chunk])  // [4, 5, 6]
})

// ============================================
// takeWhile - Take while condition is true
// ============================================

const untilFive = numbers.pipe(
  Stream.takeWhile((n) => n < 5),
  Stream.runCollect
)

Effect.runPromise(untilFive).then((chunk) => {
  console.log([...chunk])  // [1, 2, 3, 4]
})

// ============================================
// dropWhile - Skip while condition is true
// ============================================

const afterFive = numbers.pipe(
  Stream.dropWhile((n) => n < 5),
  Stream.runCollect
)

Effect.runPromise(afterFive).then((chunk) => {
  console.log([...chunk])  // [5, 6, 7, 8, 9, 10]
})

// ============================================
// takeUntil - Take until condition becomes true
// ============================================

const untilSix = numbers.pipe(
  Stream.takeUntil((n) => n === 6),
  Stream.runCollect
)

Effect.runPromise(untilSix).then((chunk) => {
  console.log([...chunk])  // [1, 2, 3, 4, 5, 6]
})

// ============================================
// Practical: Process file with header
// ============================================

const fileLines = Stream.make(
  "# Header",
  "# Comment",
  "data1",
  "data2",
  "data3"
)

const dataOnly = fileLines.pipe(
  Stream.dropWhile((line) => line.startsWith("#")),
  Stream.runCollect
)

Effect.runPromise(dataOnly).then((chunk) => {
  console.log([...chunk])  // ["data1", "data2", "data3"]
})
```

---

## Your First Stream

Use Stream to process sequences of data lazily and efficiently.

### Example

```typescript
import { Effect, Stream } from "effect"

// Create a stream from explicit values
const numbers = Stream.make(1, 2, 3, 4, 5)

// Create a stream from an array
const fromArray = Stream.fromIterable([10, 20, 30])

// Create a single-value stream
const single = Stream.succeed("hello")

// Transform and run the stream
const program = numbers.pipe(
  Stream.map((n) => n * 2),           // Double each number
  Stream.filter((n) => n > 4),        // Keep only > 4
  Stream.runCollect                    // Collect results
)

Effect.runPromise(program).then((chunk) => {
  console.log([...chunk])  // [6, 8, 10]
})
```

---

