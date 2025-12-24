# resource-management Patterns

## Compose Resource Lifecycles with `Layer.merge`

Compose multiple scoped layers using `Layer.merge` or by providing one layer to another.

### Example

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

---

## Create a Managed Runtime for Scoped Resources

Create a managed runtime for scoped resources.

### Example

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

---

## Create a Service Layer from a Managed Resource

Provide a managed resource to the application context using `Layer.scoped`.

### Example

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

---

## Handle Resource Timeouts

Always set timeouts on resource acquisition to prevent indefinite waits.

### Example

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

---

## Manage Hierarchical Resources

Use nested Scopes to manage resources with parent-child dependencies.

### Example

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

---

## Manually Manage Lifecycles with `Scope`

Use `Effect.scope` and `Scope.addFinalizer` for fine-grained control over resource cleanup.

### Example

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

---

## Pool Resources for Reuse

Use Pool to manage expensive resources that can be reused across operations.

### Example

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

---

## Safely Bracket Resource Usage with `acquireRelease`

Bracket the use of a resource between an `acquire` and a `release` effect.

### Example

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

---

