import { FileSystem } from '@effect/platform';
import { NodeFileSystem } from '@effect/platform-node';
import { Effect } from 'effect';
import * as path from 'node:path';

const processFile = (filePath: string, content: string): Effect.Effect<void, Error, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    try {
      yield* fs.writeFileString(filePath, content);
      const fileContent = yield* fs.readFileString(filePath);
      const lines = fileContent.split('\n');

      for (const line of lines) {
        yield* Effect.log(`Processing: ${line}`);
      }
    } finally {
      yield* fs.remove(filePath);
    }
  });

const program = Effect.gen(function* () {
  const filePath = path.join(__dirname, 'large-file.txt');

  yield* processFile(
    filePath,
    'line 1\nline 2\nline 3'
  );
}).pipe(
  Effect.catchAll((error) =>
    Effect.logError(`Error processing file: ${String(error)}`)
  )
);

Effect.runPromise(
  program.pipe(Effect.provide(NodeFileSystem.layer)) as Effect.Effect<undefined, never, never>
).catch(console.error);
/*
Output:
... level=INFO msg="Processing: line 1"
... level=INFO msg="Processing: line 2"
... level=INFO msg="Processing: line 3"
*/