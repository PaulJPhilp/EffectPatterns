import { FileSystem } from '@effect/platform';
import { NodeFileSystem } from '@effect/platform-node';
import type { PlatformError } from '@effect/platform/Error';
import { Effect, Stream } from 'effect';
import * as path from 'node:path';

const processFile = (
  filePath: string,
  content: string
): Effect.Effect<void, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    // Write content to file
    yield* fs.writeFileString(filePath, content);

    // Create a stream from file content
    const fileStream = Stream.fromEffect(fs.readFileString(filePath))
      .pipe(
        // Split content into lines
        Stream.map((content: string) => content.split('\n')),
        Stream.flatMap(Stream.fromIterable),
        // Process each line
        Stream.tap((line) => Effect.log(`Processing: ${line}`))
      );

    // Run the stream to completion
    yield* Stream.runDrain(fileStream);

    // Clean up file
    yield* fs.remove(filePath);
  });

const program = Effect.gen(function* () {
  const filePath = path.join(__dirname, 'large-file.txt');

  yield* processFile(
    filePath,
    'line 1\nline 2\nline 3'
  ).pipe(
    Effect.catchAll((error: PlatformError) =>
      Effect.logError(`Error processing file: ${error.message}`)
    )
  );
});

Effect.runPromise(
  program.pipe(
    Effect.provide(NodeFileSystem.layer)
  )
).catch(console.error);
/*
Output:
... level=INFO msg="Processing: line 1"
... level=INFO msg="Processing: line 2"
... level=INFO msg="Processing: line 3"
*/