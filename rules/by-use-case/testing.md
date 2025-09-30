# Testing Patterns

## Accessing the Current Time with Clock

Use the Clock service to get the current time, enabling deterministic testing with TestClock.

### Example

This example shows a function that checks if a token is expired. Its logic depends on `Clock`, making it fully testable.

```typescript
import { Effect, Clock, Duration } from "effect";

interface Token {
  readonly value: string;
  readonly expiresAt: number; // UTC milliseconds
}

// This function is pure and testable because it depends on Clock
const isTokenExpired = (token: Token): Effect.Effect<boolean, never, Clock.Clock> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((now) => now > token.expiresAt),
    Effect.tap((expired) => 
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((currentTime) => 
          Effect.log(`Token expired? ${expired} (current time: ${new Date(currentTime).toISOString()})`)
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
  program.pipe(
    Effect.provideService(Clock.Clock, makeTestClock(Date.now()))
  )
);
```

---

---

## Create a Testable HTTP Client Service

Define an HttpClient service with distinct Live and Test layers to enable testable API interactions.

### Example

### 1. Define the Service

```typescript
import { Effect, Data, Layer } from "effect";

interface HttpErrorType {
  readonly _tag: "HttpError";
  readonly error: unknown;
}

const HttpError = Data.tagged<HttpErrorType>("HttpError");

interface HttpClientType {
  readonly get: <T>(url: string) => Effect.Effect<T, HttpErrorType>;
}

class HttpClient extends Effect.Service<HttpClientType>()("HttpClient", {
  sync: () => ({
    get: <T>(url: string): Effect.Effect<T, HttpErrorType> =>
      Effect.tryPromise<T>(() =>
        fetch(url).then((res) => res.json() as T)
      ).pipe(
        Effect.catchAll((error) => Effect.fail(HttpError({ error })))
      ),
  }),
}) {}

// Test implementation
const TestLayer = Layer.succeed(
  HttpClient,
  HttpClient.of({
    get: <T>(_url: string) => Effect.succeed({ title: "Mock Data" } as T),
  })
);

// Example usage
const program = Effect.gen(function* () {
  const client = yield* HttpClient;
  yield* Effect.logInfo("Fetching data...");
  const data = yield* client.get<{ title: string }>(
    "https://api.example.com/data"
  );
  yield* Effect.logInfo(`Received data: ${JSON.stringify(data)}`);
});

// Run with test implementation
Effect.runPromise(Effect.provide(program, TestLayer));

```

### 2. Create the Live Implementation

```typescript
import { Effect, Data, Layer } from "effect"

interface HttpErrorType {
  readonly _tag: "HttpError"
  readonly error: unknown
}

const HttpError = Data.tagged<HttpErrorType>("HttpError")

interface HttpClientType {
  readonly get: <T>(url: string) => Effect.Effect<T, HttpErrorType>
}

class HttpClient extends Effect.Service<HttpClientType>()(
  "HttpClient",
  {
    sync: () => ({
      get: <T>(url: string): Effect.Effect<T, HttpErrorType> =>
        Effect.tryPromise({
          try: () => fetch(url).then((res) => res.json()),
          catch: (error) => HttpError({ error })
        })
    })
  }
) {}

// Test implementation
const TestLayer = Layer.succeed(
  HttpClient,
  HttpClient.of({
    get: <T>(_url: string) => Effect.succeed({ title: "Mock Data" } as T)
  })
)

// Example usage
const program = Effect.gen(function* () {
  const client = yield* HttpClient
  yield* Effect.logInfo("Fetching data...")
  const data = yield* client.get<{ title: string }>("https://api.example.com/data")
  yield* Effect.logInfo(`Received data: ${JSON.stringify(data)}`)
})

// Run with test implementation
Effect.runPromise(
  Effect.provide(program, TestLayer)
)
```

### 3. Create the Test Implementation

```typescript
// src/services/HttpClientTest.ts
import { Effect, Layer } from "effect";
import { HttpClient } from "./HttpClient";

export const HttpClientTest = Layer.succeed(
  HttpClient,
  HttpClient.of({
    get: (url) => Effect.succeed({ mock: "data", url }),
  }),
);
```

### 4. Usage in Business Logic

Your business logic is now clean and only depends on the abstract `HttpClient`.

```typescript
// src/features/User/UserService.ts
import { Effect } from "effect";
import { HttpClient } from "../../services/HttpClient";

export const getUserFromApi = (id: number) =>
  Effect.gen(function* () {
    const client = yield* HttpClient;
    const data = yield* client.get(`https://api.example.com/users/${id}`);
    // ... logic to parse and return user
    return data;
  });
```

---

---

## Mocking Dependencies in Tests

Provide mock service implementations via a test-specific Layer to isolate the unit under test.

### Example

We want to test a `Notifier` service that uses an `EmailClient` to send emails. In our test, we provide a mock `EmailClient` that doesn't actually send emails but just returns a success value.

```typescript
import { Effect, Layer } from "effect";

// --- The Services ---
interface EmailClientService {
  send: (address: string, body: string) => Effect.Effect<void>
}

class EmailClient extends Effect.Service<EmailClientService>()(
  "EmailClient",
  {
    sync: () => ({
      send: (address: string, body: string) => 
        Effect.sync(() => Effect.log(`Sending email to ${address}: ${body}`))
    })
  }
) {}

interface NotifierService {
  notifyUser: (userId: number, message: string) => Effect.Effect<void>
}

class Notifier extends Effect.Service<NotifierService>()(
  "Notifier",
  {
    effect: Effect.gen(function* () {
      const emailClient = yield* EmailClient;
      return {
        notifyUser: (userId: number, message: string) =>
          emailClient.send(`user-${userId}@example.com`, message)
      };
    }),
    dependencies: [EmailClient.Default]
  }
) {}

// Create a program that uses the Notifier service
const program = Effect.gen(function* () {
  yield* Effect.log("Using default EmailClient implementation...");
  const notifier = yield* Notifier;
  yield* notifier.notifyUser(123, "Your invoice is ready.");

  // Create mock EmailClient that logs differently
  yield* Effect.log("\nUsing mock EmailClient implementation...");
  const mockEmailClient = Layer.succeed(
    EmailClient,
    {
      send: (address: string, body: string) =>
        // Directly return the Effect.log without nesting it in Effect.sync
        Effect.log(`MOCK: Would send to ${address} with body: ${body}`)
    } as EmailClientService
  );

  // Run the same notification with mock client
  yield* Effect.gen(function* () {
    const notifier = yield* Notifier;
    yield* notifier.notifyUser(123, "Your invoice is ready.");
  }).pipe(
    Effect.provide(mockEmailClient)
  );
});

// Run the program
Effect.runPromise(
  Effect.provide(program, Notifier.Default)
);
```

---

---

## Model Dependencies as Services

Model dependencies as services.

### Example

```typescript
import { Effect } from "effect";

// Define Random service with production implementation as default
export class Random extends Effect.Service<Random>()(
  "Random",
  {
    // Default production implementation
    sync: () => ({
      next: Effect.sync(() => Math.random())
    })
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const random = yield* Random;
  const value = yield* random.next;
  return value;
});

// Run with default implementation
const programWithLogging = Effect.gen(function* () {
  const value = yield* Effect.provide(program, Random.Default);
  yield* Effect.log(`Random value: ${value}`);
  return value;
});

Effect.runPromise(programWithLogging);
```

**Explanation:**  
By modeling dependencies as services, you can easily substitute mocked or deterministic implementations for testing, leading to more reliable and predictable tests.

---

## Organize Layers into Composable Modules

Organize services into modular Layers that are composed hierarchically to manage complexity in large applications.

### Example

This example shows a `BaseLayer` with a `Logger`, a `UserModule` that uses the `Logger`, and a final `AppLayer` that wires them together.

### 1. The Base Infrastructure Layer

```typescript
// src/core/Logger.ts
import { Effect } from "effect";

export class Logger extends Effect.Service<Logger>()(
  "App/Core/Logger",
  {
    sync: () => ({
      log: (msg: string) => Effect.log(`[LOG] ${msg}`)
    })
  }
) {}

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
          })
      };
    }),
    // Declare Logger dependency
    dependencies: [Logger.Default]
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const repo = yield* UserRepository;
  const user = yield* repo.findById(1);
  return user;
});

// Run with default implementations
Effect.runPromise(
  Effect.provide(
    program,
    UserRepository.Default
  )
);

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

export class Logger extends Effect.Service<Logger>()(
  "App/Core/Logger",
  {
    sync: () => ({
      log: (msg: string) => Effect.sync(() => console.log(`[LOG] ${msg}`))
    })
  }
) {}

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
          })
      };
    }),
    // Declare Logger dependency
    dependencies: [Logger.Default]
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const repo = yield* UserRepository;
  const user = yield* repo.findById(1);
  return user;
});

// Run with default implementations
Effect.runPromise(
  Effect.provide(
    program,
    UserRepository.Default
  )
).then(console.log);
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

---

## Use the Auto-Generated .Default Layer in Tests

Use the auto-generated .Default layer in tests.

### Example

```typescript
import { Effect } from "effect";

// Define MyService using Effect.Service pattern
class MyService extends Effect.Service<MyService>()(
  "MyService",
  {
    sync: () => ({
      doSomething: () => 
        Effect.succeed("done").pipe(
          Effect.tap(() => Effect.log("MyService did something!"))
        )
    })
  }
) {}

// Create a program that uses MyService
const program = Effect.gen(function* () {
  yield* Effect.log("Getting MyService...");
  const service = yield* MyService;
  
  yield* Effect.log("Calling doSomething()...");
  const result = yield* service.doSomething();
  
  yield* Effect.log(`Result: ${result}`);
});

// Run the program with default service implementation
Effect.runPromise(
  Effect.provide(program, MyService.Default)
);
```

**Explanation:**  
This approach ensures your tests are idiomatic, maintainable, and take full advantage of Effect's dependency injection system.

---

## Write Tests That Adapt to Application Code

Write tests that adapt to application code.

### Example

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
      yield* Effect.logError(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      yield* Effect.logError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          yield* Effect.logError(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            `✅ Test service properly threw NotFoundError: ${error instanceof Error ? error.message : 'Unknown error'}`
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
  Effect.provide(program, DatabaseService.Default) as Effect.Effect<void, never, never>
);

```

**Explanation:**  
Tests should reflect the real interface and behavior of your code, not force changes to it.

---

