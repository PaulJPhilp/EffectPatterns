## Create a Stream from a List
**Rule:** Use Stream.fromIterable to begin a pipeline from an in-memory collection.

### Example
This example takes a simple array of numbers, creates a stream from it, performs a transformation on each number, and then runs the stream to collect the results.

```typescript
import { Effect, Stream, Chunk } from 'effect';

const numbers = [1, 2, 3, 4, 5];

// Create a stream from the array of numbers.
const program = Stream.fromIterable(numbers).pipe(
  // Perform a simple, synchronous transformation on each item.
  Stream.map((n) => `Item: ${n}`),
  // Run the stream and collect all the transformed items into a Chunk.
  Stream.runCollect
);

Effect.runPromise(program).then((processedItems) => {
  console.log(Chunk.toArray(processedItems));
});
/*
Output:
[ 'Item: 1', 'Item: 2', 'Item: 3', 'Item: 4', 'Item: 5' ]
*/
```

## Turn a Paginated API into a Single Stream
**Rule:** Use Stream.paginateEffect to model a paginated data source as a single, continuous stream.

### Example
This example simulates fetching users from a paginated API. The `fetchUsersPage` function gets one page of data and returns the next page number. `Stream.paginateEffect` uses this function to create a single stream of all users across all pages.

```typescript
import { Effect, Stream, Chunk, Option } from 'effect';

// --- Mock Paginated API ---
interface User {
  id: number;
  name: string;
}

const allUsers: User[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
}));

// This function simulates fetching a page of users from an API.
const fetchUsersPage = (
  page: number
): Effect.Effect<[Chunk.Chunk<User>, Option.Option<number>], Error> => {
  const pageSize = 10;
  const offset = (page - 1) * pageSize;
  const users = Chunk.fromIterable(allUsers.slice(offset, offset + pageSize));

  const nextPage =
    Chunk.isNonEmpty(users) && allUsers.length > offset + pageSize
      ? Option.some(page + 1)
      : Option.none();

  return Effect.succeed([users, nextPage]).pipe(
    Effect.tap(() => Effect.log(`Fetched page ${page}`))
  );
};

// --- The Pattern ---
// Use paginateEffect, providing an initial state (page 1) and the fetch function.
const userStream = Stream.paginateEffect(1, fetchUsersPage);

const program = userStream.pipe(
  Stream.runCollect,
  Effect.map((users) => users.length)
);

Effect.runPromise(program).then((totalUsers) => {
  console.log(`Total users fetched from all pages: ${totalUsers}`);
});
/*
Output:
... level=INFO msg="Fetched page 1"
... level=INFO msg="Fetched page 2"
... level=INFO msg="Fetched page 3"
Total users fetched from all pages: 25
*/
```

## Process Items Concurrently
**Rule:** Use Stream.mapEffect with the `concurrency` option to process stream items in parallel.

### Example
This example processes four items, each taking one second. By setting `concurrency: 2`, the total runtime is approximately two seconds instead of four, because items are processed in parallel pairs.

```typescript
import { Effect, Stream } from 'effect';

// A mock function that simulates a slow I/O operation
const processItem = (id: number): Effect.Effect<string, Error> =>
  Effect.log(`Starting item ${id}...`).pipe(
    Effect.delay('1 second'),
    Effect.map(() => `Finished item ${id}`),
    Effect.tap(Effect.log)
  );

const ids = [1, 2, 3, 4];

const program = Stream.fromIterable(ids).pipe(
  // Process up to 2 items concurrently
  Stream.mapEffect(processItem, { concurrency: 2 }),
  Stream.runDrain
);

// Measure the total time taken
const timedProgram = Effect.timed(program);

Effect.runPromise(timedProgram).then(([duration, _]) => {
  console.log(`\nTotal time: ${Math.round(duration.millis / 1000)} seconds`);
});
/*
Output:
... level=INFO msg="Starting item 1..."
... level=INFO msg="Starting item 2..."
... level=INFO msg="Finished item 1"
... level=INFO msg="Starting item 3..."
... level=INFO msg="Finished item 2"
... level=INFO msg="Starting item 4..."
... level=INFO msg="Finished item 3"
... level=INFO msg="Finished item 4"

Total time: 2 seconds
*/
```

## Process Items in Batches
**Rule:** Use Stream.grouped(n) to transform a stream of items into a stream of batched chunks.

### Example
This example processes 10 users. By using `Stream.grouped(5)`, it transforms the stream of 10 individual users into a stream of two chunks (each a batch of 5). The `saveUsersInBulk` function is then called only twice, once for each batch.

```typescript
import { Effect, Stream, Chunk } from 'effect';

// A mock function that simulates a bulk database insert
const saveUsersInBulk = (
  userBatch: Chunk.Chunk<{ id: number }>
): Effect.Effect<void, Error> =>
  Effect.log(
    `Saving batch of ${userBatch.length} users: ${Chunk.toArray(userBatch)
      .map((u) => u.id)
      .join(', ')}`
  );

const userIds = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));

const program = Stream.fromIterable(userIds).pipe(
  // Group the stream of users into batches of 5
  Stream.grouped(5),
  // Process each batch with our bulk save function
  Stream.mapEffect(saveUsersInBulk, { concurrency: 1 }),
  Stream.runDrain
);

Effect.runPromise(program);
/*
Output:
... level=INFO msg="Saving batch of 5 users: 1, 2, 3, 4, 5"
... level=INFO msg="Saving batch of 5 users: 6, 7, 8, 9, 10"
*/
```

## Manage Resources Safely in a Pipeline
**Rule:** Use Stream.acquireRelease to safely manage the lifecycle of a resource within a pipeline.

### Example
This example creates and writes to a temporary file. `Stream.acquireRelease` is used to acquire a readable stream from that file. The pipeline then processes the file but is designed to fail partway through. The logs demonstrate that the `release` effect (which deletes the file) is still executed, preventing any resource leaks.

```typescript
import { Effect, Stream } from 'effect';
import { NodeFileSystem } from '@effect/platform-node';
import * as path from 'node:path';
import * as fs from 'node:fs';

// The resource we want to manage: a file handle
const acquire = Effect.gen(function* () {
  const fs = yield* NodeFileSystem;
  const filePath = path.join(__dirname, 'temp-resource.txt');
  yield* fs.writeFileString(filePath, 'data 1\ndata 2\nFAIL\ndata 4');
  yield* Effect.log('Resource ACQUIRED: Opened file for reading.');
  return fs.createReadStream(filePath);
});

// The release function for our resource
const release = (stream: fs.ReadStream) =>
  Effect.gen(function* () {
    const fs = yield* NodeFileSystem;
    const filePath = path.join(__dirname, 'temp-resource.txt');
    yield* fs.remove(filePath);
    yield* Effect.log('Resource RELEASED: Closed and deleted file.');
  });

// The stream that uses the acquired resource
const stream = Stream.acquireRelease(acquire, release).pipe(
  Stream.flatMap((readable) => Stream.fromReadable(() => readable)),
  Stream.decodeText('utf-8'),
  Stream.splitLines,
  Stream.tap((line) => Effect.log(`Processing: ${line}`)),
  // Introduce a failure to demonstrate release is still called
  Stream.mapEffect((line) =>
    line === 'FAIL' ? Effect.fail('Boom!') : Effect.succeed(line)
  )
);

// We expect this program to fail, but the release logic should still execute.
const program = Stream.runDrain(stream);

Effect.runPromiseExit(program).then((exit) => {
  if (exit._tag === 'Failure') {
    console.log('\nPipeline failed as expected, but resources were cleaned up.');
  }
});
/*
Output:
... level=INFO msg="Resource ACQUIRED: Opened file for reading."
... level=INFO msg="Processing: data 1"
... level=INFO msg="Processing: data 2"
... level=INFO msg="Processing: FAIL"
... level=INFO msg="Resource RELEASED: Closed and deleted file."

Pipeline failed as expected, but resources were cleaned up.
*/
```

## Run a Pipeline for its Side Effects
**Rule:** Use Stream.runDrain to execute a stream for its side effects when you don't need the final values.

### Example
This example creates a stream of tasks. For each task, it performs a side effect (logging it as "complete"). `Stream.runDrain` executes the pipeline, ensuring all logs are written, but without collecting the `void` results of each logging operation.

```typescript
import { Effect, Stream } from 'effect';

const tasks = ['task 1', 'task 2', 'task 3'];

// A function that performs a side effect for a task
const completeTask = (task: string): Effect.Effect<void, never> =>
  Effect.log(`Completing ${task}`);

const program = Stream.fromIterable(tasks).pipe(
  // For each task, run the side-effectful operation
  Stream.mapEffect(completeTask, { concurrency: 1 }),
  // Run the stream for its effects, discarding the `void` results
  Stream.runDrain
);

Effect.runPromise(program).then(() => {
  console.log('\nAll tasks have been processed.');
});
/*
Output:
... level=INFO msg="Completing task 1"
... level=INFO msg="Completing task 2"
... level=INFO msg="Completing task 3"

All tasks have been processed.
*/
```

## Process collections of data asynchronously
**Rule:** Leverage Stream to process collections effectfully with built-in concurrency control and resource safety.

### Example
This example processes a list of IDs by fetching user data for each one. `Stream.mapEffect` is used to apply an effectful function (`getUserById`) to each element, with concurrency limited to 2 simultaneous requests.

```typescript
import { Effect, Stream, Chunk } from 'effect';

// A mock function that simulates fetching a user from a database
const getUserById = (id: number): Effect.Effect<{ id: number; name: string }, Error> =>
  Effect.succeed({ id, name: `User ${id}` }).pipe(
    Effect.delay('100 millis'),
    Effect.tap(() => Effect.log(`Fetched user ${id}`))
  );

// The stream-based program
const program = Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
  // Process each item with an Effect, limiting concurrency to 2
  Stream.mapEffect(getUserById, { concurrency: 2 }),
  // Run the stream and collect all results into a Chunk
  Stream.runCollect
);

Effect.runPromise(program).then((users) => {
  console.log('All users fetched:', Chunk.toArray(users));
});
```

## Process a Large File with Constant Memory
**Rule:** Use Stream.fromReadable with a Node.js Readable stream to process files efficiently.

### Example
This example demonstrates reading a text file, splitting it into individual lines, and processing each line. The combination of `Stream.fromReadable`, `Stream.decodeText`, and `Stream.splitLines` is a powerful and common pattern for handling text-based files.

```typescript
import { Effect, Stream } from 'effect';
import { NodeFileSystem } from '@effect/platform-node';
import * as fs from 'node:fs';
import * as path from 'node:path';

// This program reads a file named 'large-file.txt' line by line.
// First, let's ensure the file exists for the example.
const program = Effect.gen(function* () {
  const fs = yield* NodeFileSystem;
  const filePath = path.join(__dirname, 'large-file.txt');

  // Create a dummy file for the example
  yield* fs.writeFileString(filePath, 'line 1\nline 2\nline 3');

  // Create a Node.js readable stream and convert it to an Effect Stream
  const stream = Stream.fromReadable(() => fs.createReadStream(filePath)).pipe(
    // Decode the raw buffer chunks into text
    Stream.decodeText('utf-8'),
    // Split the text stream into a stream of individual lines
    Stream.splitLines,
    // Process each line
    Stream.tap((line) => Effect.log(`Processing: ${line}`))
  );

  // Run the stream for its side effects and ignore the output
  yield* Stream.runDrain(stream);

  // Clean up the dummy file
  yield* fs.remove(filePath);
});

Effect.runPromise(program);
/*
Output:
... level=INFO msg="Processing: line 1"
... level=INFO msg="Processing: line 2"
... level=INFO msg="Processing: line 3"
*/
```

## Collect All Results into a List
**Rule:** Use Stream.runCollect to execute a stream and collect all its emitted values into a Chunk.

### Example
This example creates a stream of numbers, filters for only the even ones, transforms them into strings, and then uses `runCollect` to gather the final results into a `Chunk`.

```typescript
import { Effect, Stream, Chunk } from 'effect';

const program = Stream.range(1, 10).pipe(
  // Find all the even numbers
  Stream.filter((n) => n % 2 === 0),
  // Transform them into strings
  Stream.map((n) => `Even number: ${n}`),
  // Run the stream and collect the results
  Stream.runCollect
);

Effect.runPromise(program).then((results) => {
  console.log('Collected results:', Chunk.toArray(results));
});
/*
Output:
Collected results: [
  'Even number: 2',
  'Even number: 4',
  'Even number: 6',
  'Even number: 8',
  'Even number: 10'
]
*/
```

## Automatically Retry Failed Operations
**Rule:** Compose a Stream with the .retry(Schedule) operator to automatically recover from transient failures.

### Example
This example simulates an API that fails the first two times it's called. The stream processes a list of IDs, and the `retry` operator ensures that the failing operation for `id: 2` is automatically retried until it succeeds.

````typescript
import { Effect, Stream, Schedule } from 'effect';

let attempts = 0;
// A mock function that simulates a flaky API call
const processItem = (id: number): Effect.Effect<string, Error> =>
  Effect.gen(function* () {
    yield* Effect.log(`Attempting to process item ${id}...`);
    if (id === 2 && attempts < 2) {
      attempts++;
      yield* Effect.log(`Item ${id} failed, attempt ${attempts}.`);
      return yield* Effect.fail(new Error('API is temporarily down'));
    }
    return `Successfully processed item ${id}`;
  });

const ids = [1, 2, 3];

// Define a retry policy: 3 attempts with a fixed 100ms delay
const retryPolicy = Schedule.recurs(3).pipe(Schedule.addDelay('100 millis'));

const program = Stream.fromIterable(ids).pipe(
  // Apply the processing function to each item
  Stream.mapEffect(processItem, { concurrency: 1 }),
  // Apply the retry policy to the entire stream
  Stream.retry(retryPolicy),
  Stream.runDrain
);

Effect.runPromise(program);
/*
Output:
... level=INFO msg="Attempting to process item 1..."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Item 2 failed, attempt 1."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Item 2 failed, attempt 2."
... level=INFO msg="Attempting to process item 2..."
... level=INFO msg="Attempting to process item 3..."
*/
````