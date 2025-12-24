# getting-started Patterns

## Handle Your First Error with Effect.fail and catchAll

Handle errors with Effect.fail and catchAll.

### Example

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

---

## Hello World: Your First Effect

Create your first Effect program with Effect.succeed.

### Example

```typescript
import { Effect } from "effect";

// Step 1: Create an Effect that succeeds with a value
const helloWorld = Effect.succeed("Hello, Effect!");

// Step 2: Run the Effect and get the result
const result = Effect.runSync(helloWorld);

console.log(result); // "Hello, Effect!"
```

---

## Retry a Failed Operation with Effect.retry

Retry failed operations with Effect.retry.

### Example

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

---

## Run Multiple Effects in Parallel with Effect.all

Run multiple Effects in parallel with Effect.all.

### Example

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

---

## Transform Values with Effect.map

Transform Effect values with map.

### Example

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

---

## Why Effect? Comparing Effect to Promise

Understand why Effect is better than raw Promises.

---

