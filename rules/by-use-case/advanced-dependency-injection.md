# Advanced Dependency Injection Patterns

## Manually Manage Lifecycles with `Scope`

Use `Effect.scope` and `Scope.addFinalizer` for fine-grained control over resource cleanup.

### Example

```typescript
import { Effect, Console } from "effect";

// Mocking a complex file operation
const openFile = (path: string) =>
  Effect.succeed({ path, handle: Math.random() }).pipe(
    Effect.tap((f) => Effect.log(`Opened ${f.path}`)),
  );
const createTempFile = (path: string) =>
  Effect.succeed({ path: `${path}.tmp`, handle: Math.random() }).pipe(
    Effect.tap((f) => Effect.log(`Created temp file ${f.path}`)),
  );
const closeFile = (file: { path: string }) =>
  Effect.sync(() => Effect.log(`Closed ${file.path}`));
const deleteFile = (file: { path: string }) =>
  Effect.sync(() => Effect.log(`Deleted ${file.path}`));

// This program acquires two resources (a file and a temp file)
// and ensures both are cleaned up correctly using acquireRelease.
const program = Effect.gen(function* () {
  const file = yield* Effect.acquireRelease(
    openFile("data.csv"),
    (f) => closeFile(f)
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

