# Application Architecture Patterns

## Compose Resource Lifecycles with `Layer.merge`

Compose multiple scoped layers using `Layer.merge` or by providing one layer to another.

### Example

```typescript
import { Effect, Layer, Console } from "effect";

// --- Service 1: Database ---
interface DatabaseOps {
  query: (sql: string) => Effect.Effect<string, never, never>;
}

class Database extends Effect.Service<DatabaseOps>()(
  "Database",
  {
    sync: () => ({
      query: (sql: string): Effect.Effect<string, never, never> =>
        Effect.sync(() => `db says: ${sql}`)
    })
  }
) {}

// --- Service 2: API Client ---
interface ApiClientOps {
  fetch: (path: string) => Effect.Effect<string, never, never>;
}

class ApiClient extends Effect.Service<ApiClientOps>()(
  "ApiClient",
  {
    sync: () => ({
      fetch: (path: string): Effect.Effect<string, never, never> =>
        Effect.sync(() => `api says: ${path}`)
    })
  }
) {}

// --- Application Layer ---
// We merge the two independent layers into one.
const AppLayer = Layer.merge(Database.Default, ApiClient.Default);

// This program uses both services, unaware of their implementation details.
const program = Effect.gen(function* () {
  const db = yield* Database;
  const api = yield* ApiClient;

  const dbResult = yield* db.query("SELECT *");
  const apiResult = yield* api.fetch("/users");

  yield* Effect.log(dbResult);
  yield* Effect.log(apiResult);
});

// Provide the combined layer to the program.
Effect.runPromise(Effect.provide(program, AppLayer));

/*
Output (note the LIFO release order):
Database pool opened
API client session started
db says: SELECT *
api says: /users
API client session ended
Database pool closed
*/
```

**Explanation:**
We define two completely independent services, `Database` and `ApiClient`, each with its own resource lifecycle. By combining them with `Layer.merge`, we create a single `AppLayer`. When `program` runs, Effect acquires the resources for both layers. When `program` finishes, Effect closes the application's scope, releasing the resources in the reverse order they were acquired (`ApiClient` then `Database`), ensuring a clean and predictable shutdown.

---

## Create a Service Layer from a Managed Resource

Provide a managed resource to the application context using `Layer.scoped`.

### Example

```typescript
import { Effect, Console } from "effect";

// 1. Define the service interface
interface DatabaseService {
  readonly query: (sql: string) => Effect.Effect<string[], never, never>
}

// 2. Define the service implementation with scoped resource management
class Database extends Effect.Service<DatabaseService>()(
  "Database",
  {
    // The scoped property manages the resource lifecycle
    scoped: Effect.gen(function* () {
      const id = Math.floor(Math.random() * 1000);
      
      // Acquire the connection
      yield* Effect.log(`[Pool ${id}] Acquired`);
      
      // Setup cleanup to run when scope closes
      yield* Effect.addFinalizer(() => Effect.log(`[Pool ${id}] Released`));
      
      // Return the service implementation
      return {
        query: (sql: string) => Effect.sync(() => 
          [`Result for '${sql}' from pool ${id}`]
        )
      };
    })
  }
) {}

// 3. Use the service in your program
const program = Effect.gen(function* () {
  const db = yield* Database;
  const users = yield* db.query("SELECT * FROM users");
  yield* Effect.log(`Query successful: ${users[0]}`);
});

// 4. Run the program with scoped resource management
Effect.runPromise(
  Effect.scoped(program).pipe(
    Effect.provide(Database.Default)
  )
);

/*
Output:
[Pool 458] Acquired
Query successful: Result for 'SELECT * FROM users' from pool 458
[Pool 458] Released
*/
```

**Explanation:**
The `Effect.Service` helper creates the `Database` class, which acts as both the service definition and its context key (Tag). The `Database.Live` layer connects this service to a concrete, lifecycle-managed implementation. When `program` asks for the `Database` service, the Effect runtime uses the `Live` layer to run the `acquire` effect once, caches the resulting `DbPool`, and injects it. The `release` effect is automatically run when the program completes.

---

