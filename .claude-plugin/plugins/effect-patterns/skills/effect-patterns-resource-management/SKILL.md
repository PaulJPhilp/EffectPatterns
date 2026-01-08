---
name: effect-patterns-resource-management
description: Effect-TS patterns for Resource Management. Use when working with resource management in Effect-TS applications.
---
# Effect-TS Patterns: Resource Management
This skill provides 8 curated Effect-TS patterns for resource management.
Use this skill when working on tasks related to:
- resource management
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Safely Bracket Resource Usage with `acquireRelease`

**Rule:** Bracket the use of a resource between an `acquire` and a `release` effect.

**Good Example:**

```typescript
import { Effect, Console } from "effect";

// A mock resource that needs to be managed
const getDbConnection = Effect.sync(() => ({ id: Math.random() })).pipe(
  Effect.tap(() => Effect.log("Connection Acquired"))
);

const closeDbConnection = (conn: {
  id: number;
}): Effect.Effect<void, never, never> =>
  Effect.log(`Connection ${conn.id} Released`);

// The program that uses the resource
const program = Effect.acquireRelease(
  getDbConnection, // 1. acquire
  (connection) => closeDbConnection(connection) // 2. cleanup
).pipe(
  Effect.tap((connection) =>
    Effect.log(`Using connection ${connection.id} to run query...`)
  )
);

Effect.runPromise(Effect.scoped(program));

/*
Output:
Connection Acquired
Using connection 0.12345... to run query...
Connection 0.12345... Released
*/
```

**Explanation:**
By using `Effect.acquireRelease`, the `closeDbConnection` logic is guaranteed to run after the main logic completes. This creates a self-contained, leak-proof unit of work that can be safely composed into larger programs.

**Anti-Pattern:**

Using a standard `try...finally` block with `async/await`. While it handles success and failure cases, it is **not interruption-safe**. If the fiber executing the `Promise` is interrupted by Effect's structured concurrency, the `finally` block is not guaranteed to run, leading to resource leaks.

```typescript
// ANTI-PATTERN: Not interruption-safe
async function getUser() {
  const connection = await getDbConnectionPromise(); // acquire
  try {
    return await useConnectionPromise(connection); // use
  } finally {
    // This block may not run if the fiber is interrupted!
    await closeConnectionPromise(connection); // release
  }
}
```

**Rationale:**

Wrap the acquisition, usage, and release of a resource within an `Effect.acquireRelease` call. This ensures the resource's cleanup logic is executed, regardless of whether the usage logic succeeds, fails, or is interrupted.


This pattern is the foundation of resource safety in Effect. It provides a composable and interruption-safe alternative to a standard `try...finally` block. The `release` effect is guaranteed to execute, preventing resource leaks which are common in complex asynchronous applications, especially those involving concurrency where tasks can be cancelled.

---


## 🟡 Intermediate Patterns

### Pool Resources for Reuse

**Rule:** Use Pool to manage expensive resources that can be reused across operations.

**Good Example:**

```typescript
import { Effect, Pool, Scope, Duration } from "effect"

// ============================================
// 1. Define a poolable resource
// ============================================

interface DatabaseConnection {
  readonly id: number
  readonly query: (sql: string) => Effect.Effect<unknown[]>
  readonly close: () => Effect.Effect<void>
}

let connectionId = 0

const createConnection = Effect.gen(function* () {
  const id = ++connectionId
  yield* Effect.log(`Creating connection ${id}`)
  
  // Simulate connection setup time
  yield* Effect.sleep("100 millis")
  
  const connection: DatabaseConnection = {
    id,
    query: (sql) => Effect.gen(function* () {
      yield* Effect.log(`[Conn ${id}] Executing: ${sql}`)
      return [{ result: "data" }]
    }),
    close: () => Effect.gen(function* () {
      yield* Effect.log(`Closing connection ${id}`)
    }),
  }
  
  return connection
})

// ============================================
// 2. Create a pool
// ============================================

const makeConnectionPool = Pool.make({
  acquire: createConnection,
  size: 5,  // Maximum 5 connections
})

// ============================================
// 3. Use the pool
// ============================================

const runQuery = (pool: Pool.Pool<DatabaseConnection>, sql: string) =>
  Effect.scoped(
    Effect.gen(function* () {
      // Get a connection from the pool
      const connection = yield* pool.get
      
      // Use it
      const results = yield* connection.query(sql)
      
      // Connection automatically returned to pool when scope ends
      return results
    })
  )

// ============================================
// 4. Run multiple queries concurrently
// ============================================

const program = Effect.scoped(
  Effect.gen(function* () {
    const pool = yield* makeConnectionPool
    
    yield* Effect.log("Starting concurrent queries...")
    
    // Run 10 queries with only 5 connections
    const queries = Array.from({ length: 10 }, (_, i) =>
      runQuery(pool, `SELECT * FROM users WHERE id = ${i}`)
    )
    
    const results = yield* Effect.all(queries, { concurrency: "unbounded" })
    
    yield* Effect.log(`Completed ${results.length} queries`)
    return results
  })
)

Effect.runPromise(program)
```

**Rationale:**

Use `Pool` to manage a collection of reusable resources. The pool handles acquisition, release, and lifecycle management automatically.

---


Creating resources is expensive:

1. **Database connections** - TCP handshake, authentication
2. **HTTP clients** - Connection setup, TLS negotiation
3. **Worker threads** - Spawn overhead
4. **File handles** - System calls

Pooling amortizes this cost across many operations.

---

---

### Create a Service Layer from a Managed Resource

**Rule:** Provide a managed resource to the application context using `Layer.scoped`.

**Good Example:**

```typescript
import { Effect, Console } from "effect";

// 1. Define the service interface
interface DatabaseService {
  readonly query: (sql: string) => Effect.Effect<string[], never, never>;
}

// 2. Define the service implementation with scoped resource management
class Database extends Effect.Service<DatabaseService>()("Database", {
  // The scoped property manages the resource lifecycle
  scoped: Effect.gen(function* () {
    const id = Math.floor(Math.random() * 1000);

    // Acquire the connection
    yield* Effect.log(`[Pool ${id}] Acquired`);

    // Setup cleanup to run when scope closes
    yield* Effect.addFinalizer(() => Effect.log(`[Pool ${id}] Released`));

    // Return the service implementation
    return {
      query: (sql: string) =>
        Effect.sync(() => [`Result for '${sql}' from pool ${id}`]),
    };
  }),
}) {}

// 3. Use the service in your program
const program = Effect.gen(function* () {
  const db = yield* Database;
  const users = yield* db.query("SELECT * FROM users");
  yield* Effect.log(`Query successful: ${users[0]}`);
});

// 4. Run the program with scoped resource management
Effect.runPromise(
  Effect.scoped(program).pipe(Effect.provide(Database.Default))
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

**Anti-Pattern:**

Creating and exporting a global singleton instance of a resource. This tightly couples your application to a specific implementation, makes testing difficult, and offers no guarantees about graceful shutdown.

```typescript
// ANTI-PATTERN: Global singleton
export const dbPool = makeDbPoolSync(); // Eagerly created, hard to test/mock

function someBusinessLogic() {
  // This function has a hidden dependency on the global dbPool
  return dbPool.query("SELECT * FROM products");
}
```

**Rationale:**

Define a service using `class MyService extends Effect.Service(...)`. Implement the service using the `scoped` property of the service class. This property should be a scoped `Effect` (typically from `Effect.acquireRelease`) that builds and releases the underlying resource.


This pattern is the key to building robust, testable, and leak-proof applications in Effect. It elevates a managed resource into a first-class service that can be used anywhere in your application. The `Effect.Service` helper simplifies defining the service's interface and context key. This approach decouples your business logic from the concrete implementation, as the logic only depends on the abstract service. The `Layer` declaratively handles the resource's entire lifecycle, ensuring it is acquired lazily, shared safely, and released automatically.

---

### Compose Resource Lifecycles with `Layer.merge`

**Rule:** Compose multiple scoped layers using `Layer.merge` or by providing one layer to another.

**Good Example:**

```typescript
import { Effect, Layer, Console } from "effect";

// --- Service 1: Database ---
interface DatabaseOps {
  query: (sql: string) => Effect.Effect<string, never, never>;
}

class Database extends Effect.Service<DatabaseOps>()("Database", {
  sync: () => ({
    query: (sql: string): Effect.Effect<string, never, never> =>
      Effect.sync(() => `db says: ${sql}`),
  }),
}) {}

// --- Service 2: API Client ---
interface ApiClientOps {
  fetch: (path: string) => Effect.Effect<string, never, never>;
}

class ApiClient extends Effect.Service<ApiClientOps>()("ApiClient", {
  sync: () => ({
    fetch: (path: string): Effect.Effect<string, never, never> =>
      Effect.sync(() => `api says: ${path}`),
  }),
}) {}

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

**Anti-Pattern:**

A manual, imperative startup and shutdown script. This approach is brittle and error-prone. The developer is responsible for maintaining the correct order of initialization and, more importantly, the reverse order for shutdown. This becomes unmanageable as an application grows.

```typescript
// ANTI-PATTERN: Manual, brittle, and error-prone
async function main() {
  const db = await initDb(); // acquire 1
  const client = await initApiClient(); // acquire 2

  try {
    await doWork(db, client); // use
  } finally {
    // This order is easy to get wrong!
    await client.close(); // release 2
    await db.close(); // release 1
  }
}
```

**Rationale:**

Combine multiple resource-managing `Layer`s into a single application layer using functions like `Layer.merge`. The Effect runtime will automatically build a dependency graph, acquire resources in the correct order, and release them in the reverse order.


This pattern is the ultimate payoff for defining services with `Layer`. It allows for true modularity. Each service can be defined in its own file, declaring its own resource requirements in its `Live` layer, completely unaware of other services.

When you assemble the final application layer, Effect analyzes the dependencies:

1.  **Acquisition Order:** It ensures resources are acquired in the correct order. For example, a `Logger` layer might be initialized before a `Database` layer that uses it for logging.
2.  **Release Order:** It guarantees that resources are released in the **exact reverse order** of their acquisition. This is critical for preventing shutdown errors, such as a `UserRepository` trying to log a final message after the `Logger` has already been shut down.

This automates one of the most complex and error-prone parts of application architecture.

---

### Handle Resource Timeouts

**Rule:** Always set timeouts on resource acquisition to prevent indefinite waits.

**Good Example:**

```typescript
import { Effect, Duration, Scope } from "effect"

// ============================================
// 1. Define a resource with slow acquisition
// ============================================

interface Connection {
  readonly id: string
  readonly query: (sql: string) => Effect.Effect<unknown>
}

const acquireConnection = Effect.gen(function* () {
  yield* Effect.log("Attempting to connect...")
  
  // Simulate slow connection
  yield* Effect.sleep("2 seconds")
  
  const connection: Connection = {
    id: crypto.randomUUID(),
    query: (sql) => Effect.succeed({ rows: [] }),
  }
  
  yield* Effect.log(`Connected: ${connection.id}`)
  return connection
})

const releaseConnection = (conn: Connection) =>
  Effect.log(`Released: ${conn.id}`)

// ============================================
// 2. Timeout on acquisition
// ============================================

const acquireWithTimeout = acquireConnection.pipe(
  Effect.timeout("1 second"),
  Effect.catchTag("TimeoutException", () =>
    Effect.fail(new Error("Connection timeout - database unreachable"))
  )
)

// ============================================
// 3. Timeout on usage
// ============================================

const queryWithTimeout = (conn: Connection, sql: string) =>
  conn.query(sql).pipe(
    Effect.timeout("5 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new Error(`Query timeout: ${sql}`))
    )
  )

// ============================================
// 4. Full resource lifecycle with timeouts
// ============================================

const useConnectionWithTimeouts = Effect.acquireRelease(
  acquireWithTimeout,
  releaseConnection
).pipe(
  Effect.flatMap((conn) =>
    Effect.gen(function* () {
      yield* Effect.log("Running queries...")
      
      // Each query has its own timeout
      const result1 = yield* queryWithTimeout(conn, "SELECT 1")
      const result2 = yield* queryWithTimeout(conn, "SELECT 2")
      
      return [result1, result2]
    })
  ),
  Effect.scoped
)

// ============================================
// 5. Timeout on entire operation
// ============================================

const entireOperationWithTimeout = useConnectionWithTimeouts.pipe(
  Effect.timeout("10 seconds"),
  Effect.catchTag("TimeoutException", () =>
    Effect.fail(new Error("Entire operation timed out"))
  )
)

// ============================================
// 6. Run with different scenarios
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("=== Testing timeouts ===")
  
  const result = yield* entireOperationWithTimeout.pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Failed: ${error.message}`)
        return []
      })
    )
  )
  
  yield* Effect.log(`Result: ${JSON.stringify(result)}`)
})

Effect.runPromise(program)
```

**Rationale:**

Set timeouts on resource acquisition and usage to ensure your application doesn't hang waiting for unavailable resources.

---


Resources can become unavailable:

1. **Network partitions** - Can't reach database
2. **Pool exhaustion** - All connections in use
3. **Deadlocks** - Resources held indefinitely
4. **Slow operations** - Query takes too long

Timeouts provide a safety net.

---

---


## 🟠 Advanced Patterns

### Manually Manage Lifecycles with `Scope`

**Rule:** Use `Effect.scope` and `Scope.addFinalizer` for fine-grained control over resource cleanup.

**Good Example:**

```typescript
import { Effect, Console } from "effect";

// Mocking a complex file operation
const openFile = (path: string) =>
  Effect.succeed({ path, handle: Math.random() }).pipe(
    Effect.tap((f) => Effect.log(`Opened ${f.path}`))
  );
const createTempFile = (path: string) =>
  Effect.succeed({ path: `${path}.tmp`, handle: Math.random() }).pipe(
    Effect.tap((f) => Effect.log(`Created temp file ${f.path}`))
  );
const closeFile = (file: { path: string }) =>
  Effect.sync(() => Effect.log(`Closed ${file.path}`));
const deleteFile = (file: { path: string }) =>
  Effect.sync(() => Effect.log(`Deleted ${file.path}`));

// This program acquires two resources (a file and a temp file)
// and ensures both are cleaned up correctly using acquireRelease.
const program = Effect.gen(function* () {
  const file = yield* Effect.acquireRelease(openFile("data.csv"), (f) =>
    closeFile(f)
  );

  const tempFile = yield* Effect.acquireRelease(
    createTempFile("data.csv"),
    (f) => deleteFile(f)
  );

  yield* Effect.log("...writing data from temp file to main file...");
});

// Run the program with a scope
Effect.runPromise(Effect.scoped(program));

/*
Output (note the LIFO cleanup order):
Opened data.csv
Created temp file data.csv.tmp
...writing data from temp file to main file...
Deleted data.csv.tmp
Closed data.csv
*/
```

**Explanation:**
`Effect.scope` creates a new `Scope` and provides it to the `program`. Inside `program`, we access this `Scope` and use `addFinalizer` to register cleanup actions immediately after acquiring each resource. When `Effect.scope` finishes executing `program`, it closes the scope, which in turn executes all registered finalizers in the reverse order of their addition.

**Anti-Pattern:**

Attempting to manage multiple, interdependent resource cleanups using nested `try...finally` blocks. This leads to a "pyramid of doom," is difficult to read, and remains unsafe in the face of interruptions.

```typescript
// ANTI-PATTERN: Nested, unsafe, and hard to read
async function complexOperation() {
  const file = await openFilePromise(); // acquire 1
  try {
    const tempFile = await createTempFilePromise(); // acquire 2
    try {
      await doWorkPromise(file, tempFile); // use
    } finally {
      // This block may not run on interruption!
      await deleteFilePromise(tempFile); // release 2
    }
  } finally {
    // This block may also not run on interruption!
    await closeFilePromise(file); // release 1
  }
}
```

**Rationale:**

For complex scenarios where a resource's lifecycle doesn't fit a simple `acquireRelease` pattern, use `Effect.scope` to create a boundary for finalizers. Inside this boundary, you can access the `Scope` service and manually register cleanup actions using `Scope.addFinalizer`.


While `Effect.acquireRelease` and `Layer.scoped` are sufficient for most use cases, sometimes you need more control. This pattern is essential when:

1.  A single logical operation acquires multiple resources that need independent cleanup.
2.  You are building a custom, complex `Layer` that orchestrates several dependent resources.
3.  You need to understand the fundamental mechanism that powers all of Effect's resource management.

By interacting with `Scope` directly, you gain precise, imperative-style control over resource cleanup within Effect's declarative, functional framework. Finalizers added to a scope are guaranteed to run in Last-In-First-Out (LIFO) order when the scope is closed.

---

### Manage Hierarchical Resources

**Rule:** Use nested Scopes to manage resources with parent-child dependencies.

**Good Example:**

```typescript
import { Effect, Scope, Exit } from "effect"

// ============================================
// 1. Define hierarchical resources
// ============================================

interface Database {
  readonly name: string
  readonly createConnection: () => Effect.Effect<Connection, never, Scope.Scope>
}

interface Connection {
  readonly id: string
  readonly database: string
  readonly beginTransaction: () => Effect.Effect<Transaction, never, Scope.Scope>
}

interface Transaction {
  readonly id: string
  readonly connectionId: string
  readonly execute: (sql: string) => Effect.Effect<void>
}

// ============================================
// 2. Create resources with proper lifecycle
// ============================================

const makeDatabase = (name: string): Effect.Effect<Database, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      yield* Effect.log(`Opening database: ${name}`)
      
      const db: Database = {
        name,
        createConnection: () => makeConnection(name),
      }
      
      return db
    }),
    (db) => Effect.log(`Closing database: ${db.name}`)
  )

const makeConnection = (dbName: string): Effect.Effect<Connection, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const id = `conn-${crypto.randomUUID().slice(0, 8)}`
      yield* Effect.log(`  Opening connection: ${id} to ${dbName}`)
      
      const conn: Connection = {
        id,
        database: dbName,
        beginTransaction: () => makeTransaction(id),
      }
      
      return conn
    }),
    (conn) => Effect.log(`  Closing connection: ${conn.id}`)
  )

const makeTransaction = (connId: string): Effect.Effect<Transaction, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const id = `tx-${crypto.randomUUID().slice(0, 8)}`
      yield* Effect.log(`    Beginning transaction: ${id}`)
      
      const tx: Transaction = {
        id,
        connectionId: connId,
        execute: (sql) => Effect.log(`      [${id}] ${sql}`),
      }
      
      return tx
    }),
    (tx) => Effect.log(`    Committing transaction: ${tx.id}`)
  )

// ============================================
// 3. Use hierarchical resources
// ============================================

const program = Effect.scoped(
  Effect.gen(function* () {
    yield* Effect.log("=== Starting hierarchical resource demo ===\n")
    
    // Level 1: Database
    const db = yield* makeDatabase("myapp")
    
    // Level 2: Connection (child of database)
    const conn = yield* db.createConnection()
    
    // Level 3: Transaction (child of connection)
    const tx = yield* conn.beginTransaction()
    
    // Use the transaction
    yield* tx.execute("INSERT INTO users (name) VALUES ('Alice')")
    yield* tx.execute("INSERT INTO users (name) VALUES ('Bob')")
    
    yield* Effect.log("\n=== Work complete, releasing resources ===\n")
    
    // Resources released in reverse order:
    // 1. Transaction committed
    // 2. Connection closed
    // 3. Database closed
  })
)

Effect.runPromise(program)

// ============================================
// 4. Multiple children at same level
// ============================================

const multipleConnections = Effect.scoped(
  Effect.gen(function* () {
    const db = yield* makeDatabase("myapp")
    
    // Create multiple connections
    const conn1 = yield* db.createConnection()
    const conn2 = yield* db.createConnection()
    
    // Each connection can have transactions
    const tx1 = yield* conn1.beginTransaction()
    const tx2 = yield* conn2.beginTransaction()
    
    // Use both transactions
    yield* Effect.all([
      tx1.execute("UPDATE table1 SET x = 1"),
      tx2.execute("UPDATE table2 SET y = 2"),
    ])
    
    // All released in proper order
  })
)
```

**Rationale:**

Use nested `Scope` to manage hierarchical resources where child resources depend on their parents and must be released first.

---


Resources often have dependencies:

1. **Database → Connections → Transactions** - Transaction needs connection
2. **Server → Routes → Handlers** - Handler needs server context
3. **File → Reader → Parser** - Parser needs reader

Release order matters: children before parents.

---

---

### Create a Managed Runtime for Scoped Resources

**Rule:** Create a managed runtime for scoped resources.

**Good Example:**

```typescript
import { Effect, Layer } from "effect";

class DatabasePool extends Effect.Service<DatabasePool>()("DbPool", {
  effect: Effect.gen(function* () {
    yield* Effect.log("Acquiring pool");
    return {
      query: () => Effect.succeed("result"),
    };
  }),
}) {}

// Create a program that uses the DatabasePool service
const program = Effect.gen(function* () {
  const db = yield* DatabasePool;
  yield* Effect.log("Using DB");
  yield* db.query();
});

// Run the program with the service implementation
Effect.runPromise(
  program.pipe(Effect.provide(DatabasePool.Default), Effect.scoped)
);
```

**Explanation:**  
`Layer.launch` ensures that resources are acquired and released safely, even
in the event of errors or interruptions.

**Anti-Pattern:**

Do not use `Layer.toRuntime` with layers that contain scoped resources. This
will acquire the resource, but the runtime has no mechanism to release it,
leading to resource leaks.

**Rationale:**

For services that manage resources needing explicit cleanup (e.g., a database
connection), define them in a `Layer` using `Layer.scoped`. Then, use
`Layer.launch` to provide this layer to your application.


`Layer.launch` is designed for resource safety. It acquires all resources,
provides them to your effect, and—crucially—guarantees that all registered
finalizers are executed upon completion or interruption.

---


