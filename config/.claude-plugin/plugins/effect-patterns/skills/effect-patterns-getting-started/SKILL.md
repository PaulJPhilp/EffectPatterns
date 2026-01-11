---
name: effect-patterns-getting-started
description: Effect-TS patterns for Getting Started. Use when working with getting started in Effect-TS applications.
---
# Effect-TS Patterns: Getting Started
This skill provides 6 curated Effect-TS patterns for getting started.
Use this skill when working on tasks related to:
- getting started
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Retry a Failed Operation with Effect.retry

**Rule:** Retry failed operations with Effect.retry.

**Good Example:**

```typescript
import { Effect, Schedule, pipe } from "effect";

class ApiError {
  readonly _tag = "ApiError";
  constructor(readonly status: number) {}
}

const fetchUserData = (userId: string) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new ApiError(response.status);
      return response.json();
    },
    catch: (error) => error as ApiError,
  });

// Retry up to 3 times with 500ms between attempts
const fetchWithRetry = (userId: string) =>
  pipe(
    fetchUserData(userId),
    Effect.retry(
      Schedule.recurs(3).pipe(Schedule.addDelay(() => "500 millis"))
    ),
    Effect.catchAll((error) =>
      Effect.succeed({ error: `Failed after retries: ${error._tag}` })
    )
  );
```

**Rationale:**

Use `Effect.retry` to automatically retry an Effect that fails. Combine it
with a `Schedule` to control how many times to retry and how long to wait
between attempts.


Network requests fail. Databases time out. Services go down temporarily.
Instead of failing immediately, you often want to retry a few times.
Effect makes this a one-liner.

---

### Hello World: Your First Effect

**Rule:** Create your first Effect program with Effect.succeed.

**Good Example:**

```typescript
import { Effect } from "effect";

// Step 1: Create an Effect that succeeds with a value
const helloWorld = Effect.succeed("Hello, Effect!");

// Step 2: Run the Effect and get the result
const result = Effect.runSync(helloWorld);

console.log(result); // "Hello, Effect!"
```

**Rationale:**

Create your first Effect using `Effect.succeed` to wrap a value, then run it
with `Effect.runSync` to see the result.


Every journey starts with "Hello World". In Effect, you create computations
by describing what you want to happen, then you run them. This separation is
what makes Effect powerful.

---

### Transform Values with Effect.map

**Rule:** Transform Effect values with map.

**Good Example:**

```typescript
import { Effect } from "effect";

// Start with an Effect that succeeds with a number
const getNumber = Effect.succeed(5);

// Transform it: multiply by 2
const doubled = Effect.map(getNumber, (n) => n * 2);

// Transform again: convert to string
const asString = Effect.map(doubled, (n) => `The result is ${n}`);

// Run to see the result
const result = Effect.runSync(asString);
console.log(result); // "The result is 10"
```

**Rationale:**

Use `Effect.map` to transform the success value inside an Effect. The
transformation function receives the value and returns a new value.


Just like `Array.map` transforms array elements, `Effect.map` transforms
the success value of an Effect. This lets you build pipelines of
transformations without running anything until the end.

---

### Handle Your First Error with Effect.fail and catchAll

**Rule:** Handle errors with Effect.fail and catchAll.

**Good Example:**

```typescript
import { Effect, pipe } from "effect";

class UserNotFound {
  readonly _tag = "UserNotFound";
  constructor(readonly id: string) {}
}

const findUser = (id: string) =>
  id === "123"
    ? Effect.succeed({ id, name: "Alice" })
    : Effect.fail(new UserNotFound(id));

const program = pipe(
  findUser("456"),
  Effect.catchTag("UserNotFound", (e) =>
    Effect.succeed({ id: e.id, name: "Guest" })
  ),
  Effect.map((user) => `Hello, ${user.name}!`)
);

const result = Effect.runSync(program);
console.log(result); // "Hello, Guest!"
```

**Rationale:**

Use `Effect.fail` to create an Effect that fails with an error, and
`Effect.catchAll` to recover from that failure.


Real programs fail. Effect makes failures explicit in the type system so you
can't forget to handle them. Unlike try/catch, Effect errors are tracked in
types.

---

### Run Multiple Effects in Parallel with Effect.all

**Rule:** Run multiple Effects in parallel with Effect.all.

**Good Example:**

```typescript
import { Effect, pipe } from "effect";

// Simulate fetching data from different sources
const fetchUser = Effect.succeed({ id: 1, name: "Alice" }).pipe(
  Effect.delay("100 millis")
);

const fetchPosts = Effect.succeed([
  { id: 1, title: "Hello World" },
  { id: 2, title: "Effect is awesome" },
]).pipe(Effect.delay("150 millis"));

const fetchSettings = Effect.succeed({ theme: "dark" }).pipe(
  Effect.delay("50 millis")
);

// Fetch all data in parallel
const program = Effect.gen(function* () {
  const [user, posts, settings] = yield* Effect.all(
    [fetchUser, fetchPosts, fetchSettings],
    { concurrency: "unbounded" }
  );

  yield* Effect.log(`Loaded ${user.name} with ${posts.length} posts`);
  return { user, posts, settings };
});

Effect.runPromise(program);
```

**Rationale:**

Use `Effect.all` to run multiple Effects concurrently and wait for all of
them to complete. By default, Effects run sequentially - add the
`concurrency` option to run them in parallel.


Real applications often need to do multiple things at once - fetch data from
several APIs, process multiple files, etc. `Effect.all` lets you express
this naturally without callback hell or complex Promise.all patterns.

---

### Why Effect? Comparing Effect to Promise

**Rule:** Understand why Effect is better than raw Promises.

**Rationale:**

Effect solves three problems that Promises don't:
1. **Errors are typed** - You know exactly what can go wrong
2. **Dependencies are tracked** - You know what services are needed
3. **Effects are lazy** - Nothing runs until you say so

---


