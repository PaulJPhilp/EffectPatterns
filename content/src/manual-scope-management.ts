import { Effect, Console } from "effect";

// Mocking a complex file operation
const openFile = (path: string) =>
  Effect.succeed({ path, handle: Math.random() }).pipe(
    Effect.tap((f) => Console.log(`Opened ${f.path}`)),
  );
const createTempFile = (path: string) =>
  Effect.succeed({ path: `${path}.tmp`, handle: Math.random() }).pipe(
    Effect.tap((f) => Console.log(`Created temp file ${f.path}`)),
  );
const closeFile = (file: { path: string }) =>
  Effect.sync(() => Console.log(`Closed ${file.path}`));
const deleteFile = (file: { path: string }) =>
  Effect.sync(() => Console.log(`Deleted ${file.path}`));

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

  yield* Console.log("...writing data from temp file to main file...");
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