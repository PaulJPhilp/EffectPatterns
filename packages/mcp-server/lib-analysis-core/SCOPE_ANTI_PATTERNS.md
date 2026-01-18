# Scope Anti-Patterns (Effect)

These anti-patterns indicate incorrect resource lifetime management in Effect-TS codebases. They lead to leaks, dangling connections, and shutdown issues. Scope anti-patterns pair naturally with refactoring fixes and are some of the **highest ROI** Pro features.

## Overview

Scope anti-patterns are critical because they:
- Lead to resource leaks and memory issues
- Cause dangling connections and file handles
- Create shutdown hangs and cleanup failures
- Are often invisible until production load

---

## 1. Resources Created Without acquireRelease

**Rule ID**: `resources-without-acquire-release`  
**Severity**: High  
**Category**: resources  
**Fix ID**: `wrap-with-acquire-release`

### The Problem

Manual open/close logic inside Effect.

**Why this is bad:**
- Cleanup not guaranteed
- Easy to miss failure paths
- No automatic cleanup on errors

### Better Approach

```typescript
// ❌ Bad - Manual cleanup, easy to miss paths
Effect.gen(function* () {
  const file = yield* openFile("data.txt");
  try {
    const data = yield* readFile(file);
    yield* closeFile(file);
    return data;
  } catch (error) {
    yield* closeFile(file); // Easy to forget!
    throw error;
  }
});

// ✅ Good - Guaranteed cleanup
Effect.acquireRelease(
  openFile("data.txt"),
  (file) => closeFile(file)
).pipe(
  Effect.flatMap((file) => readFile(file))
);

// ✅ Better - Using platform services
import { FileSystem } from "@effect/platform";

Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const data = yield* fs.readFileString("data.txt");
  return data;
});
```

---

## 2. Returning Resources Instead of Effects

**Rule ID**: `returning-resources-instead-of-effects`  
**Severity**: High  
**Category**: resources  
**Fix ID**: `return-scoped-effect`

### The Problem

```typescript
// ❌ Bad - Resource lifetime escapes
Effect.succeed(resource)
```

**Why this is bad:**
- Lifetime escapes scope
- Callers can misuse resource
- Cleanup responsibility unclear

### Better Approach

```typescript
// ❌ Bad - Returns raw connection
const getConnection = (): Effect.Effect<Connection> =>
  Effect.gen(function* () {
    const conn = yield* createConnection();
    return Effect.succeed(conn); // Lifetime escapes!
  });

// ✅ Good - Returns scoped effect
const withConnection = <A, E>(
  use: (conn: Connection) => Effect.Effect<A, E>
): Effect.Effect<A, E> =>
  Effect.acquireRelease(
    createConnection(),
    (conn) => conn.close()
  ).pipe(
    Effect.flatMap(use)
  );

// Usage
withConnection((conn) =>
  Effect.gen(function* () {
    const result = yield* conn.query("SELECT * FROM users");
    return result;
  })
);
```

---

## 3. Creating Scopes Without Binding Them

**Rule ID**: `creating-scopes-without-binding`  
**Severity**: High  
**Category**: resources  
**Fix ID**: `bind-scope-to-lifetime`

### The Problem

Creating a `Scope` but not tying it to the effect lifetime.

**Why this is bad:**
- Cleanup never runs
- Leaks are invisible
- Resources accumulate

### Better Approach

```typescript
// ❌ Bad - Scope not bound
Effect.gen(function* () {
  const scope = yield* Scope.make();
  // Scope never closed!
});

// ✅ Good - Scoped effect
Effect.scoped(
  Effect.gen(function* () {
    const resource = yield* Effect.acquireRelease(
      acquire,
      release
    );
    return yield* use(resource);
  })
);

// ✅ Better - Using layers
const ResourceLayer = Layer.scoped(
  Resource,
  Effect.acquireRelease(
    createResource(),
    (r) => r.cleanup()
  )
);
```

---

## 4. Long-Lived Resources in Short-Lived Scopes

**Rule ID**: `long-lived-resources-in-short-scopes`  
**Severity**: High  
**Category**: resources  
**Fix ID**: `move-resource-to-app-layer`

### The Problem

Database clients, HTTP pools inside request scopes.

**Why this is bad:**
- Reconnection storms
- Performance degradation
- Resource exhaustion

### Better Approach

```typescript
// ❌ Bad - DB connection per request
const handleRequest = (req: Request) =>
  Effect.gen(function* () {
    const db = yield* Effect.acquireRelease(
      connectToDatabase(),
      (db) => db.close()
    );
    // New connection every request!
    return yield* db.query("SELECT ...");
  });

// ✅ Good - DB connection at app level
class DatabaseService extends Effect.Service<DatabaseService>()(
  "DatabaseService",
  {
    scoped: Effect.gen(function* () {
      const db = yield* Effect.acquireRelease(
        connectToDatabase(),
        (db) => db.close()
      );
      return {
        query: (sql: string) => db.query(sql)
      };
    })
  }
) {}

// Use in requests
const handleRequest = (req: Request) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    return yield* db.query("SELECT ...");
  });
```

---

## 5. Using Global Singletons Instead of Layers

**Rule ID**: `global-singletons-instead-of-layers`  
**Severity**: Medium  
**Category**: resources  
**Fix ID**: `convert-singleton-to-layer`

### The Problem

```typescript
// ❌ Bad - Global singleton
const client = new Client()
```

**Why this is bad:**
- Hard to test
- Hard to swap implementations
- Hidden lifecycle

### Better Approach

```typescript
// ❌ Bad - Global singleton
const httpClient = new HttpClient({
  baseURL: "https://api.example.com"
});

export const fetchUser = (id: string) =>
  Effect.tryPromise(() => httpClient.get(`/users/${id}`));

// ✅ Good - Effect layer
class HttpClientService extends Effect.Service<HttpClientService>()(
  "HttpClientService",
  {
    scoped: Effect.gen(function* () {
      const client = yield* Effect.acquireRelease(
        Effect.sync(() => new HttpClient({
          baseURL: "https://api.example.com"
        })),
        (client) => Effect.sync(() => client.close())
      );
      return {
        get: (path: string) => Effect.tryPromise(() => client.get(path))
      };
    })
  }
) {}

export const fetchUser = (id: string) =>
  Effect.gen(function* () {
    const http = yield* HttpClientService;
    return yield* http.get(`/users/${id}`);
  });
```

---

## 6. Closing Resources Manually

**Rule ID**: `closing-resources-manually`  
**Severity**: Medium  
**Category**: resources  
**Fix ID**: `remove-manual-close`

### The Problem

Calling `.close()` explicitly inside Effect logic.

**Why this is bad:**
- Double-close bugs
- Missed paths
- Error-prone

### Better Approach

```typescript
// ❌ Bad - Manual close
Effect.gen(function* () {
  const conn = yield* openConnection();
  const result = yield* conn.query("SELECT ...");
  yield* Effect.sync(() => conn.close()); // Manual!
  return result;
});

// ✅ Good - Automatic cleanup
Effect.acquireRelease(
  openConnection(),
  (conn) => Effect.sync(() => conn.close())
).pipe(
  Effect.flatMap((conn) => conn.query("SELECT ..."))
);
```

---

## 7. Effect.run* While Resources Are Open

**Rule ID**: `effect-run-with-open-resources`  
**Severity**: High  
**Category**: resources  
**Fix ID**: `scope-resources-before-run`

### The Problem

Running effects before all resources are scoped.

**Why this is bad:**
- Cleanup skipped
- Shutdown hangs
- Resource leaks

### Better Approach

```typescript
// ❌ Bad - Running with open resources
const conn = await createConnection();
await Effect.runPromise(
  Effect.gen(function* () {
    return yield* conn.query("SELECT ...");
  })
);
// conn never closed!

// ✅ Good - Scope before run
await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      const conn = yield* Effect.acquireRelease(
        createConnection(),
        (c) => c.close()
      );
      return yield* conn.query("SELECT ...");
    })
  )
);
```

---

## 8. Nested Resource Acquisition

**Rule ID**: `nested-resource-acquisition`  
**Severity**: Medium  
**Category**: resources  
**Fix ID**: `flatten-resource-acquisition`

### The Problem

Deeply nested `acquireRelease` blocks.

**Why this is bad:**
- Hard to reason about lifetime
- Indicates missing composition
- Difficult to maintain

### Better Approach

```typescript
// ❌ Bad - Deeply nested
Effect.acquireRelease(acquire1, release1).pipe(
  Effect.flatMap((r1) =>
    Effect.acquireRelease(acquire2, release2).pipe(
      Effect.flatMap((r2) =>
        Effect.acquireRelease(acquire3, release3).pipe(
          Effect.flatMap((r3) => use(r1, r2, r3))
        )
      )
    )
  )
);

// ✅ Good - Composable layers
const Resource1 = Layer.scoped(
  Tag1,
  Effect.acquireRelease(acquire1, release1)
);

const Resource2 = Layer.scoped(
  Tag2,
  Effect.acquireRelease(acquire2, release2)
);

const Resource3 = Layer.scoped(
  Tag3,
  Effect.acquireRelease(acquire3, release3)
);

const AllResources = Layer.mergeAll(Resource1, Resource2, Resource3);

// Usage
Effect.gen(function* () {
  const r1 = yield* Tag1;
  const r2 = yield* Tag2;
  const r3 = yield* Tag3;
  return use(r1, r2, r3);
}).pipe(Effect.provide(AllResources));
```

---

## 9. Using Scope.global for Convenience

**Rule ID**: `using-scope-global-for-convenience`  
**Severity**: Medium  
**Category**: resources  
**Fix ID**: `use-explicit-scope`

### The Problem

**Why this is bad:**
- Hides ownership
- Makes cleanup implicit
- Hard to track lifetime

### Better Approach

```typescript
// ❌ Bad - Using global scope
Effect.gen(function* () {
  const resource = yield* Effect.acquireRelease(
    acquire,
    release
  ).pipe(Effect.provideService(Scope.Scope, Scope.global));
  // Cleanup timing unclear!
});

// ✅ Good - Explicit scope
Effect.scoped(
  Effect.gen(function* () {
    const resource = yield* Effect.acquireRelease(
      acquire,
      release
    );
    return yield* use(resource);
  })
);
```

---

## 10. Forgetting to Provide Required Layers

**Rule ID**: `forgetting-to-provide-layers`  
**Severity**: Medium  
**Category**: resources  
**Fix ID**: `add-layer-provision`

### The Problem

Effect expects a resource but relies on ambient context.

**Why this is bad:**
- Runtime failures
- Environment confusion
- Hard to debug

### Better Approach

```typescript
// ❌ Bad - Missing layer provision
const program = Effect.gen(function* () {
  const db = yield* DatabaseService;
  return yield* db.query("SELECT ...");
});

// Fails at runtime: Service not found!
await Effect.runPromise(program);

// ✅ Good - Explicit provision
const program = Effect.gen(function* () {
  const db = yield* DatabaseService;
  return yield* db.query("SELECT ...");
});

await Effect.runPromise(
  program.pipe(Effect.provide(DatabaseService.Default))
);

// ✅ Better - Type-safe requirements
const program: Effect.Effect<Result, DbError, DatabaseService> =
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    return yield* db.query("SELECT ...");
  });

// Compiler enforces provision
await Effect.runPromise(
  program.pipe(Effect.provide(DatabaseService.Default))
);
```

---

## Detection Strategy

### AST Patterns to Match

1. **Manual cleanup**: Open/close patterns without acquireRelease
2. **Bare resources**: `Effect.succeed(resource)` returning resources
3. **Unbound scopes**: `Scope.make()` without binding
4. **Request-scoped DB**: Database connections in request handlers
5. **Global singletons**: `const client = new Client()` at module level
6. **Manual close**: `.close()` calls inside Effect logic
7. **Run before scope**: `Effect.runPromise` before `Effect.scoped`
8. **Deep nesting**: Multiple nested `acquireRelease` calls
9. **Scope.global**: Usage of `Scope.global`
10. **Missing provision**: Effects with requirements not provided

### Heuristics

- Detect resource creation without corresponding acquireRelease
- Find Effect.succeed wrapping resource-like objects
- Identify Scope.make without Effect.scoped
- Locate database/HTTP client creation in request scopes
- Find module-level client instantiation
- Detect explicit .close() calls
- Identify Effect.run* calls outside scoped blocks
- Count acquireRelease nesting depth (threshold: ≥3)
- Find Scope.global usage
- Analyze Effect type requirements vs provisions

---

## Implementation Status

✅ **Fully Integrated** - All 10 scope anti-patterns are now part of the Effect Patterns analysis system:

- Type definitions updated with rule IDs and fix IDs
- Fix definitions added for all 10 patterns
- Rule definitions with comprehensive messages
- Test coverage complete (133 expect calls)
- Available via MCP server for code analysis

## Summary Statistics

- **Total Anti-Patterns**: Now 68 (58 previous + 10 scope)
- **Total Fix Definitions**: Now 60 (50 previous + 10 scope)
- **Severity Distribution**:
  - High: 28 rules (5 new scope)
  - Medium: 38 rules (5 new scope)
  - Low: 2 rules

## Educational Value

These rules have **extremely high educational value** because they:

1. **Prevent resource leaks** - Catch issues that cause memory and connection leaks
2. **Teach scope patterns** - Promote proper resource lifetime management
3. **Improve reliability** - Prevent shutdown hangs and cleanup failures
4. **Enable safe resource use** - Guide developers toward Effect's resource management

## Ideal Use Cases

- **Highest ROI Pro features** - These fixes have immediate, measurable impact
- **Production readiness** - Critical for production deployments
- **Code review** - Essential resource management checks
- **Team education** - Learn Effect scope and resource patterns

These scope anti-patterns are **high-ROI** rules that help teams avoid resource leaks, shutdown issues, and cleanup failures that are often invisible until production load.
