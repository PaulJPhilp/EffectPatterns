---
name: effect-patterns-testing
description: Effect-TS patterns for Testing. Use when working with testing in Effect-TS applications.
---
# Effect-TS Patterns: Testing
This skill provides 10 curated Effect-TS patterns for testing.
Use this skill when working on tasks related to:
- testing
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Your First Effect Test

**Rule:** Use Effect.runPromise in tests to run and assert on Effect results.

**Good Example:**

```typescript
import { describe, it, expect } from "vitest"
import { Effect } from "effect"

// ============================================
// Code to test
// ============================================

const add = (a: number, b: number): Effect.Effect<number> =>
  Effect.succeed(a + b)

const divide = (a: number, b: number): Effect.Effect<number, Error> =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

const fetchUser = (id: string): Effect.Effect<{ id: string; name: string }> =>
  Effect.succeed({ id, name: `User ${id}` })

// ============================================
// Tests
// ============================================

describe("Basic Effect Tests", () => {
  it("should add two numbers", async () => {
    const result = await Effect.runPromise(add(2, 3))
    expect(result).toBe(5)
  })

  it("should divide numbers", async () => {
    const result = await Effect.runPromise(divide(10, 2))
    expect(result).toBe(5)
  })

  it("should fail on divide by zero", async () => {
    await expect(Effect.runPromise(divide(10, 0))).rejects.toThrow(
      "Cannot divide by zero"
    )
  })

  it("should fetch a user", async () => {
    const user = await Effect.runPromise(fetchUser("123"))
    
    expect(user).toEqual({
      id: "123",
      name: "User 123",
    })
  })
})

// ============================================
// Testing Effect.gen programs
// ============================================

const calculateDiscount = (price: number, quantity: number) =>
  Effect.gen(function* () {
    if (price <= 0) {
      return yield* Effect.fail(new Error("Invalid price"))
    }
    
    const subtotal = price * quantity
    const discount = quantity >= 10 ? 0.1 : 0
    const total = subtotal * (1 - discount)
    
    return { subtotal, discount, total }
  })

describe("Effect.gen Tests", () => {
  it("should calculate without discount", async () => {
    const result = await Effect.runPromise(calculateDiscount(10, 5))
    
    expect(result.subtotal).toBe(50)
    expect(result.discount).toBe(0)
    expect(result.total).toBe(50)
  })

  it("should apply bulk discount", async () => {
    const result = await Effect.runPromise(calculateDiscount(10, 10))
    
    expect(result.subtotal).toBe(100)
    expect(result.discount).toBe(0.1)
    expect(result.total).toBe(90)
  })

  it("should fail for invalid price", async () => {
    await expect(
      Effect.runPromise(calculateDiscount(-5, 10))
    ).rejects.toThrow("Invalid price")
  })
})
```

**Rationale:**

Test Effect programs by running them with `Effect.runPromise` and using standard test assertions on the results.

---


Testing Effect code is straightforward:

1. **Effects are values** - Build them in tests like any other value
2. **Run to get results** - Use `Effect.runPromise` to execute
3. **Assert normally** - Standard assertions work on the results

---

---

### Test Effects with Services

**Rule:** Provide test implementations of services to make Effect programs testable.

**Good Example:**

```typescript
import { describe, it, expect } from "vitest"
import { Effect, Context } from "effect"

// ============================================
// 1. Define a service
// ============================================

class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User | null>
    readonly save: (user: User) => Effect.Effect<void>
  }
>() {}

interface User {
  id: string
  name: string
  email: string
}

// ============================================
// 2. Code that uses the service
// ============================================

const getUser = (id: string) =>
  Effect.gen(function* () {
    const repo = yield* UserRepository
    const user = yield* repo.findById(id)
    
    if (!user) {
      return yield* Effect.fail(new Error(`User ${id} not found`))
    }
    
    return user
  })

const createUser = (name: string, email: string) =>
  Effect.gen(function* () {
    const repo = yield* UserRepository
    
    const user: User = {
      id: crypto.randomUUID(),
      name,
      email,
    }
    
    yield* repo.save(user)
    return user
  })

// ============================================
// 3. Create a test implementation
// ============================================

const makeTestUserRepository = (initialUsers: User[] = []) => {
  const users = new Map(initialUsers.map(u => [u.id, u]))
  
  return UserRepository.of({
    findById: (id) => Effect.succeed(users.get(id) ?? null),
    save: (user) => Effect.sync(() => { users.set(user.id, user) }),
  })
}

// ============================================
// 4. Write tests
// ============================================

describe("User Service Tests", () => {
  it("should find an existing user", async () => {
    const testUser: User = {
      id: "123",
      name: "Alice",
      email: "alice@example.com",
    }
    
    const testRepo = makeTestUserRepository([testUser])
    
    const result = await Effect.runPromise(
      getUser("123").pipe(
        Effect.provideService(UserRepository, testRepo)
      )
    )
    
    expect(result).toEqual(testUser)
  })

  it("should fail when user not found", async () => {
    const testRepo = makeTestUserRepository([])
    
    await expect(
      Effect.runPromise(
        getUser("999").pipe(
          Effect.provideService(UserRepository, testRepo)
        )
      )
    ).rejects.toThrow("User 999 not found")
  })

  it("should create and save a user", async () => {
    const savedUsers: User[] = []
    
    const trackingRepo = UserRepository.of({
      findById: () => Effect.succeed(null),
      save: (user) => Effect.sync(() => { savedUsers.push(user) }),
    })
    
    const result = await Effect.runPromise(
      createUser("Bob", "bob@example.com").pipe(
        Effect.provideService(UserRepository, trackingRepo)
      )
    )
    
    expect(result.name).toBe("Bob")
    expect(result.email).toBe("bob@example.com")
    expect(savedUsers).toHaveLength(1)
    expect(savedUsers[0].name).toBe("Bob")
  })
})
```

**Rationale:**

When testing Effects that require services, provide test implementations using `Effect.provideService` or test layers.

---


Effect's service pattern makes testing easy:

1. **Declare dependencies** - Effects specify what they need
2. **Inject test doubles** - Provide fake implementations for tests
3. **No mocking libraries** - Just provide different service implementations
4. **Type-safe** - Compiler ensures you provide all dependencies

---

---


## 🟡 Intermediate Patterns

### Accessing the Current Time with Clock

**Rule:** Use the Clock service to get the current time, enabling deterministic testing with TestClock.

**Good Example:**

This example shows a function that checks if a token is expired. Its logic depends on `Clock`, making it fully testable.

```typescript
import { Effect, Clock, Duration } from "effect";

interface Token {
  readonly value: string;
  readonly expiresAt: number; // UTC milliseconds
}

// This function is pure and testable because it depends on Clock
const isTokenExpired = (
  token: Token
): Effect.Effect<boolean, never, Clock.Clock> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((now) => now > token.expiresAt),
    Effect.tap((expired) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((currentTime) =>
          Effect.log(
            `Token expired? ${expired} (current time: ${new Date(currentTime).toISOString()})`
          )
        )
      )
    )
  );

// Create a test clock service that advances time
const makeTestClock = (timeMs: number): Clock.Clock => ({
  currentTimeMillis: Effect.succeed(timeMs),
  currentTimeNanos: Effect.succeed(BigInt(timeMs * 1_000_000)),
  sleep: (duration: Duration.Duration) => Effect.succeed(void 0),
  unsafeCurrentTimeMillis: () => timeMs,
  unsafeCurrentTimeNanos: () => BigInt(timeMs * 1_000_000),
  [Clock.ClockTypeId]: Clock.ClockTypeId,
});

// Create a token that expires in 1 second
const token = { value: "abc", expiresAt: Date.now() + 1000 };

// Check token expiry with different clocks
const program = Effect.gen(function* () {
  // Check with current time
  yield* Effect.log("Checking with current time...");
  yield* isTokenExpired(token);

  // Check with past time
  yield* Effect.log("\nChecking with past time (1 minute ago)...");
  const pastClock = makeTestClock(Date.now() - 60_000);
  yield* isTokenExpired(token).pipe(
    Effect.provideService(Clock.Clock, pastClock)
  );

  // Check with future time
  yield* Effect.log("\nChecking with future time (1 hour ahead)...");
  const futureClock = makeTestClock(Date.now() + 3600_000);
  yield* isTokenExpired(token).pipe(
    Effect.provideService(Clock.Clock, futureClock)
  );
});

// Run the program with default clock
Effect.runPromise(
  program.pipe(Effect.provideService(Clock.Clock, makeTestClock(Date.now())))
);
```

---

**Anti-Pattern:**

Directly calling `Date.now()` inside your business logic. This creates an impure function that cannot be tested reliably without manipulating the system clock, which is a bad practice.

```typescript
import { Effect } from "effect";

interface Token {
  readonly expiresAt: number;
}

// ❌ WRONG: This function's behavior changes every millisecond.
const isTokenExpiredUnsafely = (token: Token): Effect.Effect<boolean> =>
  Effect.sync(() => Date.now() > token.expiresAt);

// Testing this function would require complex mocking of global APIs
// or would be non-deterministic.
```

**Rationale:**

Whenever you need to get the current time within an `Effect`, do not call `Date.now()` directly. Instead, depend on the `Clock` service and use one of its methods, such as `Clock.currentTimeMillis`.

---


Directly calling `Date.now()` makes your code impure and tightly coupled to the system clock. This makes testing difficult and unreliable, as the output of your function will change every time it's run.

The `Clock` service is Effect's solution to this problem. It's an abstraction for "the current time."

- In **production**, the default `Live` `Clock` implementation uses the real system time.
- In **tests**, you can provide the `TestClock` layer. This gives you a virtual clock that you can manually control, allowing you to set the time to a specific value or advance it by a specific duration.

This makes any time-dependent logic pure, deterministic, and easy to test with perfect precision.

---

---

### Write Tests That Adapt to Application Code

**Rule:** Write tests that adapt to application code.

**Good Example:**

```typescript
import { Effect } from "effect";

// Define our types
interface User {
  id: number;
  name: string;
}

class NotFoundError extends Error {
  readonly _tag = "NotFoundError";
  constructor(readonly id: number) {
    super(`User ${id} not found`);
  }
}

// Define database service interface
interface DatabaseServiceApi {
  getUserById: (id: number) => Effect.Effect<User, NotFoundError>;
}

// Implement the service with mock data
class DatabaseService extends Effect.Service<DatabaseService>()(
  "DatabaseService",
  {
    sync: () => ({
      getUserById: (id: number) => {
        // Simulate database lookup
        if (id === 404) {
          return Effect.fail(new NotFoundError(id));
        }
        return Effect.succeed({ id, name: `User ${id}` });
      },
    }),
  }
) {}

// Test service implementation for testing
class TestDatabaseService extends Effect.Service<TestDatabaseService>()(
  "TestDatabaseService",
  {
    sync: () => ({
      getUserById: (id: number) => {
        // Test data with predictable responses
        const testUsers = [
          { id: 1, name: "Test User 1" },
          { id: 2, name: "Test User 2" },
          { id: 123, name: "User 123" },
        ];

        const user = testUsers.find((u) => u.id === id);
        if (user) {
          return Effect.succeed(user);
        }
        return Effect.fail(new NotFoundError(id));
      },
    }),
  }
) {}

// Business logic that uses the database service
const getUserWithFallback = (id: number) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    return yield* Effect.gen(function* () {
      const user = yield* db.getUserById(id);
      return user;
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          if (error instanceof NotFoundError) {
            yield* Effect.logInfo(`User ${id} not found, using fallback`);
            return { id, name: `Fallback User ${id}` };
          }
          return yield* Effect.fail(error);
        })
      )
    );
  });

// Create a program that demonstrates the service
const program = Effect.gen(function* () {
  yield* Effect.logInfo(
    "=== Writing Tests that Adapt to Application Code Demo ==="
  );

  const db = yield* DatabaseService;

  // Example 1: Successful user lookup
  yield* Effect.logInfo("\n1. Looking up existing user 123...");
  const user = yield* Effect.gen(function* () {
    try {
      return yield* db.getUserById(123);
    } catch (error) {
      yield* Effect.logError(
        `Failed to get user: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return { id: -1, name: "Error" };
    }
  });
  yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`);

  // Example 2: Handle non-existent user with proper error handling
  yield* Effect.logInfo("\n2. Looking up non-existent user 404...");
  const notFoundUser = yield* Effect.gen(function* () {
    try {
      return yield* db.getUserById(404);
    } catch (error) {
      if (error instanceof NotFoundError) {
        yield* Effect.logInfo(
          `✅ Properly handled NotFoundError: ${error.message}`
        );
        return { id: 404, name: "Not Found" };
      }
      yield* Effect.logError(
        `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return { id: -1, name: "Error" };
    }
  });
  yield* Effect.logInfo(`Result: ${JSON.stringify(notFoundUser)}`);

  // Example 3: Business logic with fallback
  yield* Effect.logInfo("\n3. Business logic with fallback for missing user:");
  const userWithFallback = yield* getUserWithFallback(999);
  yield* Effect.logInfo(
    `User with fallback: ${JSON.stringify(userWithFallback)}`
  );

  // Example 4: Testing with different service implementation
  yield* Effect.logInfo("\n4. Testing with test service implementation:");
  yield* Effect.provide(
    Effect.gen(function* () {
      const testDb = yield* TestDatabaseService;

      // Test existing user
      const testUser1 = yield* Effect.gen(function* () {
        try {
          return yield* testDb.getUserById(1);
        } catch (error) {
          yield* Effect.logError(
            `Test failed: ${error instanceof Error ? error.message : "Unknown error"}`
          );
          return { id: -1, name: "Test Error" };
        }
      });
      yield* Effect.logInfo(`Test user 1: ${JSON.stringify(testUser1)}`);

      // Test non-existing user
      const testUser404 = yield* Effect.gen(function* () {
        try {
          return yield* testDb.getUserById(404);
        } catch (error) {
          yield* Effect.logInfo(
            `✅ Test service properly threw NotFoundError: ${error instanceof Error ? error.message : "Unknown error"}`
          );
          return { id: 404, name: "Test Not Found" };
        }
      });
      yield* Effect.logInfo(`Test result: ${JSON.stringify(testUser404)}`);
    }),
    TestDatabaseService.Default
  );

  yield* Effect.logInfo(
    "\n✅ Tests that adapt to application code demonstration completed!"
  );
  yield* Effect.logInfo(
    "The same business logic works with different service implementations!"
  );
});

// Run the program with the default database service
Effect.runPromise(
  Effect.provide(program, DatabaseService.Default) as Effect.Effect<
    void,
    never,
    never
  >
);
```

**Explanation:**  
Tests should reflect the real interface and behavior of your code, not force changes to it.

**Anti-Pattern:**

Any action where the test dictates a change to the application code. Do not modify a service file to add a method just because a test needs it. If a test fails, fix the test.

**Rationale:**

Tests are secondary artifacts that serve to validate the application. The application's code and interfaces are the source of truth. When a test fails, fix the test's logic or setup, not the production code.


Treating application code as immutable during testing prevents the introduction of bugs and false test confidence. The goal of a test is to verify real-world behavior; changing that behavior to suit the test invalidates its purpose.

---

### Use the Auto-Generated .Default Layer in Tests

**Rule:** Use the auto-generated .Default layer in tests.

**Good Example:**

```typescript
import { Effect } from "effect";

// Define MyService using Effect.Service pattern
class MyService extends Effect.Service<MyService>()("MyService", {
  sync: () => ({
    doSomething: () =>
      Effect.succeed("done").pipe(
        Effect.tap(() => Effect.log("MyService did something!"))
      ),
  }),
}) {}

// Create a program that uses MyService
const program = Effect.gen(function* () {
  yield* Effect.log("Getting MyService...");
  const service = yield* MyService;

  yield* Effect.log("Calling doSomething()...");
  const result = yield* service.doSomething();

  yield* Effect.log(`Result: ${result}`);
});

// Run the program with default service implementation
Effect.runPromise(Effect.provide(program, MyService.Default));
```

**Explanation:**  
This approach ensures your tests are idiomatic, maintainable, and take full advantage of Effect's dependency injection system.

**Anti-Pattern:**

Do not create manual layers for your service in tests (`Layer.succeed(...)`) or try to provide the service class directly. This bypasses the intended dependency injection mechanism.

**Rationale:**

In your tests, provide service dependencies using the static `.Default` property that `Effect.Service` automatically attaches to your service class.


The `.Default` layer is the canonical way to provide a service in a test environment. It's automatically created, correctly scoped, and handles resolving any transitive dependencies, making tests cleaner and more robust.

---

### Mocking Dependencies in Tests

**Rule:** Provide mock service implementations via a test-specific Layer to isolate the unit under test.

**Good Example:**

We want to test a `Notifier` service that uses an `EmailClient` to send emails. In our test, we provide a mock `EmailClient` that doesn't actually send emails but just returns a success value.

```typescript
import { Effect, Layer } from "effect";

// --- The Services ---
interface EmailClientService {
  send: (address: string, body: string) => Effect.Effect<void>;
}

class EmailClient extends Effect.Service<EmailClientService>()("EmailClient", {
  sync: () => ({
    send: (address: string, body: string) =>
      Effect.sync(() => Effect.log(`Sending email to ${address}: ${body}`)),
  }),
}) {}

interface NotifierService {
  notifyUser: (userId: number, message: string) => Effect.Effect<void>;
}

class Notifier extends Effect.Service<NotifierService>()("Notifier", {
  effect: Effect.gen(function* () {
    const emailClient = yield* EmailClient;
    return {
      notifyUser: (userId: number, message: string) =>
        emailClient.send(`user-${userId}@example.com`, message),
    };
  }),
  dependencies: [EmailClient.Default],
}) {}

// Create a program that uses the Notifier service
const program = Effect.gen(function* () {
  yield* Effect.log("Using default EmailClient implementation...");
  const notifier = yield* Notifier;
  yield* notifier.notifyUser(123, "Your invoice is ready.");

  // Create mock EmailClient that logs differently
  yield* Effect.log("\nUsing mock EmailClient implementation...");
  const mockEmailClient = Layer.succeed(EmailClient, {
    send: (address: string, body: string) =>
      // Directly return the Effect.log without nesting it in Effect.sync
      Effect.log(`MOCK: Would send to ${address} with body: ${body}`),
  } as EmailClientService);

  // Run the same notification with mock client
  yield* Effect.gen(function* () {
    const notifier = yield* Notifier;
    yield* notifier.notifyUser(123, "Your invoice is ready.");
  }).pipe(Effect.provide(mockEmailClient));
});

// Run the program
Effect.runPromise(Effect.provide(program, Notifier.Default));
```

---

**Anti-Pattern:**

Testing your business logic using the "live" implementation of its dependencies. This creates an integration test, not a unit test. It will be slow, unreliable, and may have real-world side effects (like actually sending an email).

```typescript
import { Effect } from "effect";
import { NotifierLive } from "./somewhere";
import { EmailClientLive } from "./somewhere"; // The REAL email client

// ❌ WRONG: This test will try to send a real email.
it("sends a real email", () =>
  Effect.gen(function* () {
    const notifier = yield* Notifier;
    yield* notifier.notifyUser(123, "This is a test email!");
  }).pipe(
    Effect.provide(NotifierLive),
    Effect.provide(EmailClientLive), // Using the live layer makes this an integration test
    Effect.runPromise
  ));
```

**Rationale:**

To test a piece of code in isolation, identify its service dependencies and provide mock implementations for them using a test-specific `Layer`. The most common way to create a mock layer is with `Layer.succeed(ServiceTag, mockImplementation)`.

---


The primary goal of a unit test is to verify the logic of a single unit of code, independent of its external dependencies. Effect's dependency injection system is designed to make this easy and type-safe.

By providing a mock `Layer` in your test, you replace a real dependency (like an `HttpClient` that makes network calls) with a fake one that returns predictable data. This provides several key benefits:

- **Determinism:** Your tests always produce the same result, free from the flakiness of network or database connections.
- **Speed:** Tests run instantly without waiting for slow I/O operations.
- **Type Safety:** The TypeScript compiler ensures your mock implementation perfectly matches the real service's interface, preventing your tests from becoming outdated.
- **Explicitness:** The test setup clearly documents all the dependencies required for the code to run.

---

---


## 🟠 Advanced Patterns

### Organize Layers into Composable Modules

**Rule:** Organize services into modular Layers that are composed hierarchically to manage complexity in large applications.

**Good Example:**

This example shows a `BaseLayer` with a `Logger`, a `UserModule` that uses the `Logger`, and a final `AppLayer` that wires them together.

### 1. The Base Infrastructure Layer

```typescript
// src/core/Logger.ts
import { Effect } from "effect";

export class Logger extends Effect.Service<Logger>()("App/Core/Logger", {
  sync: () => ({
    log: (msg: string) => Effect.log(`[LOG] ${msg}`),
  }),
}) {}

// src/features/User/UserRepository.ts
export class UserRepository extends Effect.Service<UserRepository>()(
  "App/User/UserRepository",
  {
    // Define implementation that uses Logger
    effect: Effect.gen(function* () {
      const logger = yield* Logger;
      return {
        findById: (id: number) =>
          Effect.gen(function* () {
            yield* logger.log(`Finding user ${id}`);
            return { id, name: `User ${id}` };
          }),
      };
    }),
    // Declare Logger dependency
    dependencies: [Logger.Default],
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const repo = yield* UserRepository;
  const user = yield* repo.findById(1);
  return user;
});

// Run with default implementations
Effect.runPromise(Effect.provide(program, UserRepository.Default));

const programWithLogging = Effect.gen(function* () {
  const result = yield* program;
  yield* Effect.log(`Program result: ${JSON.stringify(result)}`);
  return result;
});

Effect.runPromise(Effect.provide(programWithLogging, UserRepository.Default));
```

### 2. The Feature Module Layer

```typescript
// src/core/Logger.ts
import { Effect } from "effect";

export class Logger extends Effect.Service<Logger>()("App/Core/Logger", {
  sync: () => ({
    log: (msg: string) => Effect.sync(() => console.log(`[LOG] ${msg}`)),
  }),
}) {}

// src/features/User/UserRepository.ts
export class UserRepository extends Effect.Service<UserRepository>()(
  "App/User/UserRepository",
  {
    // Define implementation that uses Logger
    effect: Effect.gen(function* () {
      const logger = yield* Logger;
      return {
        findById: (id: number) =>
          Effect.gen(function* () {
            yield* logger.log(`Finding user ${id}`);
            return { id, name: `User ${id}` };
          }),
      };
    }),
    // Declare Logger dependency
    dependencies: [Logger.Default],
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const repo = yield* UserRepository;
  const user = yield* repo.findById(1);
  return user;
});

// Run with default implementations
Effect.runPromise(Effect.provide(program, UserRepository.Default)).then(
  console.log
);
```

### 3. The Final Application Composition

```typescript
// src/layers.ts
import { Layer } from "effect";
import { BaseLayer } from "./core";
import { UserModuleLive } from "./features/User";
// import { ProductModuleLive } from "./features/Product";

const AllModules = Layer.mergeAll(UserModuleLive /*, ProductModuleLive */);

// Provide the BaseLayer to all modules at once, creating a self-contained AppLayer.
export const AppLayer = Layer.provide(AllModules, BaseLayer);
```

---

**Anti-Pattern:**

A flat composition strategy for a large application. While simple at first, it quickly becomes difficult to manage.

```typescript
// ❌ This file becomes huge and hard to navigate in a large project.
const AppLayer = Layer.mergeAll(
  LoggerLive,
  ConfigLive,
  DatabaseLive,
  TracerLive,
  UserServiceLive,
  UserRepositoryLive,
  ProductServiceLive,
  ProductRepositoryLive,
  BillingServiceLive
  // ...and 50 other services
);
```

**Rationale:**

For large applications, avoid a single, flat list of services. Instead, structure your application by creating hierarchical layers:

1.  **`BaseLayer`**: Provides application-wide infrastructure (Logger, Config, Database).
2.  **`FeatureModule` Layers**: Provide the services for a specific business domain (e.g., `UserModule`, `ProductModule`). These depend on the `BaseLayer`.
3.  **`AppLayer`**: The top-level layer that composes the feature modules by providing them with the `BaseLayer`.

---


As an application grows, a flat composition strategy where all services are merged into one giant layer becomes unwieldy and hard to reason about. The Composable Modules pattern solves this by introducing structure.

This approach creates a clean, scalable, and highly testable architecture where complexity is contained within each module. The top-level composition becomes a clear, high-level diagram of your application's architecture, and feature modules can be tested in isolation by providing them with a mocked `BaseLayer`.

---

---

### Test Streaming Effects

**Rule:** Use Stream.runCollect and assertions to verify stream behavior.

**Good Example:**

```typescript
import { describe, it, expect } from "vitest"
import { Effect, Stream, Chunk, Ref } from "effect"

describe("Stream Testing", () => {
  // ============================================
  // 1. Test basic stream operations
  // ============================================

  it("should transform stream elements", async () => {
    const result = await Effect.runPromise(
      Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
        Stream.map((n) => n * 2),
        Stream.runCollect
      )
    )

    expect(Chunk.toReadonlyArray(result)).toEqual([2, 4, 6, 8, 10])
  })

  it("should filter stream elements", async () => {
    const result = await Effect.runPromise(
      Stream.fromIterable([1, 2, 3, 4, 5, 6]).pipe(
        Stream.filter((n) => n % 2 === 0),
        Stream.runCollect
      )
    )

    expect(Chunk.toReadonlyArray(result)).toEqual([2, 4, 6])
  })

  // ============================================
  // 2. Test stream aggregation
  // ============================================

  it("should fold stream to single value", async () => {
    const result = await Effect.runPromise(
      Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
        Stream.runFold(0, (acc, n) => acc + n)
      )
    )

    expect(result).toBe(15)
  })

  it("should count stream elements", async () => {
    const count = await Effect.runPromise(
      Stream.fromIterable(["a", "b", "c", "d"]).pipe(
        Stream.runCount
      )
    )

    expect(count).toBe(4)
  })

  // ============================================
  // 3. Test error handling in streams
  // ============================================

  it("should catch errors in stream", async () => {
    const result = await Effect.runPromise(
      Stream.fromIterable([1, 2, 3]).pipe(
        Stream.mapEffect((n) =>
          n === 2
            ? Effect.fail(new Error("Failed on 2"))
            : Effect.succeed(n * 10)
        ),
        Stream.catchAll((error) =>
          Stream.succeed(-1)  // Replace error with sentinel
        ),
        Stream.runCollect
      )
    )

    expect(Chunk.toReadonlyArray(result)).toEqual([10, -1])
  })

  it("should handle errors and continue with orElse", async () => {
    const failingStream = Stream.fail(new Error("Primary failed"))
    const fallbackStream = Stream.fromIterable([1, 2, 3])

    const result = await Effect.runPromise(
      failingStream.pipe(
        Stream.orElse(() => fallbackStream),
        Stream.runCollect
      )
    )

    expect(Chunk.toReadonlyArray(result)).toEqual([1, 2, 3])
  })

  // ============================================
  // 4. Test stream chunking
  // ============================================

  it("should chunk stream elements", async () => {
    const result = await Effect.runPromise(
      Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
        Stream.grouped(2),
        Stream.runCollect
      )
    )

    const chunks = Chunk.toReadonlyArray(result).map(Chunk.toReadonlyArray)
    expect(chunks).toEqual([[1, 2], [3, 4], [5]])
  })

  // ============================================
  // 5. Test stream with effects
  // ============================================

  it("should run effects for each element", async () => {
    const processed: number[] = []

    await Effect.runPromise(
      Stream.fromIterable([1, 2, 3]).pipe(
        Stream.tap((n) =>
          Effect.sync(() => {
            processed.push(n)
          })
        ),
        Stream.runDrain
      )
    )

    expect(processed).toEqual([1, 2, 3])
  })

  // ============================================
  // 6. Test stream resource management
  // ============================================

  it("should release resources on completion", async () => {
    const acquired: string[] = []
    const released: string[] = []

    const managedStream = Stream.acquireRelease(
      Effect.gen(function* () {
        acquired.push("resource")
        return "resource"
      }),
      () =>
        Effect.sync(() => {
          released.push("resource")
        })
    ).pipe(
      Stream.flatMap(() => Stream.fromIterable([1, 2, 3]))
    )

    await Effect.runPromise(Stream.runDrain(managedStream))

    expect(acquired).toEqual(["resource"])
    expect(released).toEqual(["resource"])
  })

  it("should release resources on error", async () => {
    const released: string[] = []

    const managedStream = Stream.acquireRelease(
      Effect.succeed("resource"),
      () => Effect.sync(() => { released.push("released") })
    ).pipe(
      Stream.flatMap(() =>
        Stream.fromEffect(Effect.fail(new Error("Oops")))
      )
    )

    await Effect.runPromise(
      Stream.runDrain(managedStream).pipe(
        Effect.catchAll(() => Effect.void)
      )
    )

    expect(released).toEqual(["released"])
  })

  // ============================================
  // 7. Test stream timing with take/drop
  // ============================================

  it("should take first N elements", async () => {
    const result = await Effect.runPromise(
      Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
        Stream.take(3),
        Stream.runCollect
      )
    )

    expect(Chunk.toReadonlyArray(result)).toEqual([1, 2, 3])
  })

  it("should drop first N elements", async () => {
    const result = await Effect.runPromise(
      Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
        Stream.drop(2),
        Stream.runCollect
      )
    )

    expect(Chunk.toReadonlyArray(result)).toEqual([3, 4, 5])
  })

  // ============================================
  // 8. Test stream merging
  // ============================================

  it("should merge streams", async () => {
    const stream1 = Stream.fromIterable([1, 3, 5])
    const stream2 = Stream.fromIterable([2, 4, 6])

    const result = await Effect.runPromise(
      Stream.merge(stream1, stream2).pipe(
        Stream.runCollect
      )
    )

    const array = Chunk.toReadonlyArray(result)
    expect(array).toHaveLength(6)
    expect(array).toContain(1)
    expect(array).toContain(6)
  })
})
```

**Rationale:**

Test streams by collecting results and verifying transformations, error handling, and resource management.

---


Stream tests verify:

1. **Transformations** - map, filter, flatMap work correctly
2. **Error handling** - Failures are caught and handled
3. **Resource safety** - Resources are released
4. **Backpressure** - Data flow is controlled

---

---

### Test Concurrent Code

**Rule:** Use TestClock and controlled concurrency to make concurrent tests deterministic.

**Good Example:**

```typescript
import { describe, it, expect } from "vitest"
import { Effect, Fiber, Ref, TestClock, Duration, Deferred } from "effect"

describe("Concurrent Code Testing", () => {
  // ============================================
  // 1. Test parallel execution
  // ============================================

  it("should run effects in parallel", async () => {
    const executionOrder: string[] = []

    const task1 = Effect.gen(function* () {
      yield* Effect.sleep("100 millis")
      executionOrder.push("task1")
      return 1
    })

    const task2 = Effect.gen(function* () {
      yield* Effect.sleep("50 millis")
      executionOrder.push("task2")
      return 2
    })

    const program = Effect.all([task1, task2], { concurrency: 2 })

    // Use TestClock to control time
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* Effect.fork(program)

        // Advance time to trigger both tasks
        yield* TestClock.adjust("100 millis")

        return yield* Fiber.join(fiber)
      }).pipe(Effect.provide(TestClock.live))
    )

    expect(result).toEqual([1, 2])
    // With real time, task2 would complete first
    expect(executionOrder).toContain("task1")
    expect(executionOrder).toContain("task2")
  })

  // ============================================
  // 2. Test race conditions
  // ============================================

  it("should handle race condition correctly", async () => {
    const counter = await Effect.runPromise(
      Effect.gen(function* () {
        const ref = yield* Ref.make(0)

        // Simulate concurrent increments
        const increment = Ref.update(ref, (n) => n + 1)

        // Run 100 concurrent increments
        yield* Effect.all(
          Array.from({ length: 100 }, () => increment),
          { concurrency: "unbounded" }
        )

        return yield* Ref.get(ref)
      })
    )

    // Ref is atomic, so all increments should be counted
    expect(counter).toBe(100)
  })

  // ============================================
  // 3. Test with controlled fiber execution
  // ============================================

  it("should test fiber lifecycle", async () => {
    const events: string[] = []

    const program = Effect.gen(function* () {
      const fiber = yield* Effect.fork(
        Effect.gen(function* () {
          events.push("started")
          yield* Effect.sleep("1 second")
          events.push("completed")
          return "result"
        })
      )

      events.push("forked")

      // Interrupt the fiber
      yield* Fiber.interrupt(fiber)
      events.push("interrupted")

      const exit = yield* Fiber.await(fiber)
      return exit
    })

    await Effect.runPromise(program)

    expect(events).toEqual(["forked", "started", "interrupted"])
    expect(events).not.toContain("completed")
  })

  // ============================================
  // 4. Test timeout behavior
  // ============================================

  it("should timeout slow operations", async () => {
    const slowOperation = Effect.gen(function* () {
      yield* Effect.sleep("10 seconds")
      return "completed"
    })

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* Effect.fork(
          slowOperation.pipe(Effect.timeout("1 second"))
        )

        // Advance past the timeout
        yield* TestClock.adjust("2 seconds")

        return yield* Fiber.join(fiber)
      }).pipe(Effect.provide(TestClock.live))
    )

    // Result is Option.None due to timeout
    expect(result._tag).toBe("None")
  })

  // ============================================
  // 5. Test with Deferred for synchronization
  // ============================================

  it("should synchronize fibers correctly", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const deferred = yield* Deferred.make<string>()
        const results: string[] = []

        // Consumer waits for producer
        const consumer = Effect.fork(
          Effect.gen(function* () {
            const value = yield* Deferred.await(deferred)
            results.push(`consumed: ${value}`)
          })
        )

        // Producer completes the deferred
        const producer = Effect.gen(function* () {
          results.push("producing")
          yield* Deferred.succeed(deferred, "data")
          results.push("produced")
        })

        yield* consumer
        yield* producer

        // Wait for consumer to process
        yield* Effect.sleep("10 millis")

        return results
      })
    )

    expect(result).toContain("producing")
    expect(result).toContain("produced")
    expect(result).toContain("consumed: data")
  })

  // ============================================
  // 6. Test for absence of deadlocks
  // ============================================

  it("should not deadlock with proper resource ordering", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const ref1 = yield* Ref.make(0)
        const ref2 = yield* Ref.make(0)

        // Two fibers accessing refs in same order (no deadlock)
        const fiber1 = yield* Effect.fork(
          Effect.gen(function* () {
            yield* Ref.update(ref1, (n) => n + 1)
            yield* Ref.update(ref2, (n) => n + 1)
          })
        )

        const fiber2 = yield* Effect.fork(
          Effect.gen(function* () {
            yield* Ref.update(ref1, (n) => n + 1)
            yield* Ref.update(ref2, (n) => n + 1)
          })
        )

        yield* Fiber.join(fiber1)
        yield* Fiber.join(fiber2)

        return [yield* Ref.get(ref1), yield* Ref.get(ref2)]
      }).pipe(Effect.timeout("1 second"))
    )

    expect(result._tag).toBe("Some")
    expect(result.value).toEqual([2, 2])
  })
})
```

**Rationale:**

Use Effect's TestClock and fiber control to make concurrent tests deterministic and repeatable.

---


Concurrent code is hard to test:

1. **Non-determinism** - Different runs, different results
2. **Race conditions** - Timing-dependent bugs
3. **Deadlocks** - Hard to reproduce
4. **Flaky tests** - Pass sometimes, fail others

Effect's test utilities provide control over timing and concurrency.

---

---

### Property-Based Testing with Effect

**Rule:** Use property-based testing to find edge cases your example-based tests miss.

**Good Example:**

```typescript
import { describe, it, expect } from "vitest"
import { Effect, Option, Either, Schema } from "effect"
import * as fc from "fast-check"

describe("Property-Based Testing with Effect", () => {
  // ============================================
  // 1. Test pure function properties
  // ============================================

  it("should satisfy array reverse properties", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        // Reversing twice returns original
        const reversed = arr.slice().reverse()
        const doubleReversed = reversed.slice().reverse()

        return JSON.stringify(arr) === JSON.stringify(doubleReversed)
      })
    )
  })

  it("should satisfy sort idempotence", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = arr.slice().sort((a, b) => a - b)
        const sortedTwice = sorted.slice().sort((a, b) => a - b)

        return JSON.stringify(sorted) === JSON.stringify(sortedTwice)
      })
    )
  })

  // ============================================
  // 2. Test Effect operations
  // ============================================

  it("should map then flatMap equals flatMap with mapping", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer(), async (n) => {
        const f = (x: number) => x * 2
        const g = (x: number) => Effect.succeed(x + 1)

        // map then flatMap
        const result1 = await Effect.runPromise(
          Effect.succeed(n).pipe(
            Effect.map(f),
            Effect.flatMap(g)
          )
        )

        // flatMap with mapping inside
        const result2 = await Effect.runPromise(
          Effect.succeed(n).pipe(
            Effect.flatMap((x) => g(f(x)))
          )
        )

        return result1 === result2
      })
    )
  })

  // ============================================
  // 3. Test Option properties
  // ============================================

  it("should satisfy Option map identity", () => {
    fc.assert(
      fc.property(fc.option(fc.integer(), { nil: undefined }), (maybeN) => {
        const option = maybeN === undefined ? Option.none() : Option.some(maybeN)

        // Mapping identity function returns same Option
        const mapped = Option.map(option, (x) => x)

        return Option.getOrElse(option, () => -1) ===
               Option.getOrElse(mapped, () => -1)
      })
    )
  })

  // ============================================
  // 4. Test Schema encode/decode roundtrip
  // ============================================

  it("should roundtrip through Schema", async () => {
    const UserSchema = Schema.Struct({
      name: Schema.String,
      age: Schema.Number.pipe(Schema.int(), Schema.positive()),
    })

    const userArbitrary = fc.record({
      name: fc.string({ minLength: 1 }),
      age: fc.integer({ min: 1, max: 120 }),
    })

    await fc.assert(
      fc.asyncProperty(userArbitrary, async (user) => {
        const encode = Schema.encode(UserSchema)
        const decode = Schema.decode(UserSchema)

        // Encode then decode should return equivalent value
        const encoded = await Effect.runPromise(encode(user))
        const decoded = await Effect.runPromise(decode(encoded))

        return decoded.name === user.name && decoded.age === user.age
      })
    )
  })

  // ============================================
  // 5. Test error handling properties
  // ============================================

  it("should recover from any error", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        async (errorMsg, fallback) => {
          const failing = Effect.fail(new Error(errorMsg))

          const result = await Effect.runPromise(
            failing.pipe(
              Effect.catchAll(() => Effect.succeed(fallback))
            )
          )

          return result === fallback
        }
      )
    )
  })

  // ============================================
  // 6. Custom generators for domain types
  // ============================================

  interface Email {
    readonly _tag: "Email"
    readonly value: string
  }

  const emailArbitrary = fc.emailAddress().map((value): Email => ({
    _tag: "Email",
    value,
  }))

  interface UserId {
    readonly _tag: "UserId"
    readonly value: string
  }

  const userIdArbitrary = fc.uuid().map((value): UserId => ({
    _tag: "UserId",
    value,
  }))

  it("should handle domain types correctly", () => {
    fc.assert(
      fc.property(emailArbitrary, userIdArbitrary, (email, userId) => {
        // Test your domain functions with generated domain types
        return email.value.includes("@") && userId.value.length > 0
      })
    )
  })

  // ============================================
  // 7. Test algebraic properties
  // ============================================

  it("should satisfy monoid properties for string concat", () => {
    const empty = ""
    const concat = (a: string, b: string) => a + b

    fc.assert(
      fc.property(fc.string(), fc.string(), fc.string(), (a, b, c) => {
        // Identity: empty + a = a = a + empty
        const leftIdentity = concat(empty, a) === a
        const rightIdentity = concat(a, empty) === a

        // Associativity: (a + b) + c = a + (b + c)
        const associative = concat(concat(a, b), c) === concat(a, concat(b, c))

        return leftIdentity && rightIdentity && associative
      })
    )
  })

  // ============================================
  // 8. Test with constraints
  // ============================================

  it("should handle positive numbers", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.integer({ min: 1, max: 1000000 }),
        (a, b) => {
          // Division of positives is positive
          const result = a / b
          return result > 0
        }
      )
    )
  })
})
```

**Rationale:**

Use property-based testing with fast-check to test invariants and find edge cases automatically.

---


Property-based testing finds bugs that example tests miss:

1. **Edge cases** - Empty arrays, negative numbers, unicode
2. **Invariants** - Properties that should always hold
3. **Shrinking** - Minimal failing examples
4. **Coverage** - Many inputs from one test

---

---


