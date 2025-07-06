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