## Organize Layers into Composable Modules
**Rule:** Organize services into modular Layers that are composed hierarchically to manage complexity in large applications.

### Example
This example shows a `BaseLayer` with a `Logger`, a `UserModule` that uses the `Logger`, and a final `AppLayer` that wires them together.

### 1. The Base Infrastructure Layer

```typescript
// src/core/Logger.ts
import { Console, Effect } from "effect";

export class Logger extends Effect.Tag("App/Logger")<Logger, {
  readonly log: (message: string) => Effect.Effect<void>;
}>() {}

export const LoggerLive = Logger.toLayer(
  Effect.sync(() => Logger.of({ log: (msg) => Console.log(`[INFO] ${msg}`) })),
);

// src/core/index.ts
import { Layer } from "effect";
import { LoggerLive } from "./Logger";

// The BaseLayer merges all core, cross-cutting services.
export const BaseLayer = Layer.mergeAll(LoggerLive);
```

### 2. The Feature Module Layer

```typescript
// src/features/User/UserRepository.ts
import { Effect, Layer } from "effect";
import { Logger } from "../../core/Logger";

export class UserRepository extends Effect.Tag("App/User/UserRepository")<UserRepository, any>() {}

export const UserRepositoryLive = UserRepository.toLayer(
  Effect.gen(function* () {
    const logger = yield* Logger; // <-- Dependency on a base service
    return UserRepository.of({
      findById: (id: number) => logger.log(`Finding user ${id}`),
    });
  }),
);

// src/features/User/index.ts
import { Layer } from "effect";
import { UserRepositoryLive } from "./UserRepository";
// ... other user services would be merged here

// The UserModule provides all services for the User domain.
// It exposes its own dependencies (like Logger) in its requirements.
export const UserModuleLive = Layer.mergeAll(UserRepositoryLive);
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

## Accessing the Current Time with Clock
**Rule:** Use the Clock service to get the current time, enabling deterministic testing with TestClock.

### Example
This example shows a function that checks if a token is expired. Its logic depends on `Clock`, making it fully testable.

```typescript
import { Effect, Clock, Layer } from "effect";
import { TestClock } from "effect/TestClock";
import { describe, it, expect } from "vitest";

interface Token {
  readonly value: string;
  readonly expiresAt: number; // UTC milliseconds
}

// This function is pure and testable because it depends on Clock
const isTokenExpired = (token: Token): Effect.Effect<boolean, never, Clock> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((now) => now > token.expiresAt),
  );

// --- Testing the function ---
describe("isTokenExpired", () => {
  const token = { value: "abc", expiresAt: 1000 };

  it("should return false when the clock is before the expiry time", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(500); // Set virtual time
      const isExpired = yield* isTokenExpired(token);
      expect(isExpired).toBe(false);
    }).pipe(Effect.provide(TestClock.layer), Effect.runPromise));

  it("should return true when the clock is after the expiry time", () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(1500); // Set virtual time
      const isExpired = yield* isTokenExpired(token);
      expect(isExpired).toBe(true);
    }).pipe(Effect.provide(TestClock.layer), Effect.runPromise));
});
```

---

## Write Tests That Adapt to Application Code
**Rule:** Write tests that adapt to application code.

### Example
```typescript
// 1. Read the actual service interface first.
export interface DatabaseServiceApi {
  getUserById: (id: number) => Effect.Effect<User, NotFoundError>;
}

// 2. Write a test that correctly invokes that interface.
it("should return a user", () =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const result = yield* Effect.either(db.getUserById(123));
    // ... assertions
  }).pipe(Effect.provide(DatabaseService.Default), Effect.runPromise));
```

**Explanation:**  
Tests should reflect the real interface and behavior of your code, not force changes to it.

## Use the Auto-Generated .Default Layer in Tests
**Rule:** Use the auto-generated .Default layer in tests.

### Example
```typescript
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { MyService } from "../MyService";

describe("MyService", () => {
  it("should perform its operation", () =>
    Effect.gen(function* () {
      const service = yield* MyService;
      const result = yield* service.doSomething();
      expect(result).toBe("done");
    }).pipe(
      Effect.provide(MyService.Default), // ✅ Correct
      Effect.runPromise,
    ));
});
```

**Explanation:**  
This approach ensures your tests are idiomatic, maintainable, and take full advantage of Effect's dependency injection system.

## Mocking Dependencies in Tests
**Rule:** Provide mock service implementations via a test-specific Layer to isolate the unit under test.

### Example
We want to test a `Notifier` service that uses an `EmailClient` to send emails. In our test, we provide a mock `EmailClient` that doesn't actually send emails but just returns a success value.

```typescript
import { Effect, Layer } from "effect";
import { describe, it, expect } from "vitest";

// --- The Services ---
class EmailClient extends Effect.Tag("EmailClient")<
  EmailClient,
  { readonly send: (address: string, body: string) => Effect.Effect<void, "SendError"> }
>() {}

class Notifier extends Effect.Tag("Notifier")<
  Notifier,
  { readonly notifyUser: (userId: number, message: string) => Effect.Effect<void, "SendError"> }
>() {}

// The "Live" Notifier implementation, which depends on EmailClient
const NotifierLive = Layer.effect(
  Notifier,
  Effect.gen(function* () {
    const emailClient = yield* EmailClient;
    return Notifier.of({
      notifyUser: (userId, message) =>
        emailClient.send(`user-${userId}@example.com`, message),
    });
  }),
);

// --- The Test ---
describe("Notifier", () => {
  it("should call the email client with the correct address", () =>
    Effect.gen(function* () {
      // 1. Get the service we want to test
      const notifier = yield* Notifier;
      // 2. Run its logic
      yield* notifier.notifyUser(123, "Your invoice is ready.");
    }).pipe(
      // 3. Provide a mock implementation for its dependency
      Effect.provide(
        Layer.succeed(
          EmailClient,
          EmailClient.of({
            send: (address, body) =>
              Effect.sync(() => {
                // 4. Make assertions on the mock's behavior
                expect(address).toBe("user-123@example.com");
                expect(body).toBe("Your invoice is ready.");
              }),
          }),
        ),
      ),
      // 5. Provide the layer for the service under test
      Effect.provide(NotifierLive),
      // 6. Run the test
      Effect.runPromise,
    ));
});
```

---

## Model Dependencies as Services
**Rule:** Model dependencies as services.

### Example
```typescript
import { Effect, Layer } from "effect";

class Random extends Effect.Tag("Random")<Random, { readonly next: Effect.Effect<number> }> {}

// For production
const RandomLive = Layer.succeed(Random, { next: Effect.sync(() => Math.random()) });

// For testing
const RandomTest = Layer.succeed(Random, { next: Effect.succeed(0.5) });
```

**Explanation:**  
By modeling dependencies as services, you can easily substitute mocked or deterministic implementations for testing, leading to more reliable and predictable tests.

## Create a Testable HTTP Client Service
**Rule:** Define an HttpClient service with distinct Live and Test layers to enable testable API interactions.

### Example
### 1. Define the Service

```typescript
// src/services/HttpClient.ts
import { Effect, Data } from "effect";

// Define potential errors
export class HttpError extends Data.TaggedError("HttpError")<{
  readonly error: unknown;
}> {}

// Define the service interface
export class HttpClient extends Effect.Tag("HttpClient")<
  HttpClient,
  {
    readonly get: (
      url: string,
    ) => Effect.Effect<unknown, HttpError>;
  }
>() {}
```

### 2. Create the Live Implementation

```typescript
// src/services/HttpClientLive.ts
import { Effect, Layer } from "effect";
import { HttpClient, HttpError } from "./HttpClient";

export const HttpClientLive = Layer.succeed(
  HttpClient,
  HttpClient.of({
    get: (url) =>
      Effect.tryPromise({
        try: () => fetch(url).then((res) => res.json()),
        catch: (error) => new HttpError({ error }),
      }),
  }),
);
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