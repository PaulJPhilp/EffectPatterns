import { Effect, Layer } from 'effect';
import { FileSystem } from '@effect/platform/FileSystem';
import { NodeFileSystem } from '@effect/platform-node';
import * as path from 'node:path';

interface ProcessError {
  readonly _tag: 'ProcessError'
  readonly message: string
}

const ProcessError = (message: string): ProcessError => ({
  _tag: 'ProcessError',
  message
});

interface FileServiceType {
  readonly createTempFile: () => Effect.Effect<{ filePath: string }, never>
  readonly cleanup: (filePath: string) => Effect.Effect<void, never>
  readonly readFile: (filePath: string) => Effect.Effect<string, never>
}

export class FileService extends Effect.Service<FileService>()(
  'FileService',
  {
    sync: () => {
      const filePath = path.join(__dirname, 'temp-resource.txt');
      return {
        createTempFile: () => 
          Effect.succeed({ filePath }),
        cleanup: (filePath: string) =>
          Effect.succeed(void 0),
        readFile: (filePath: string) =>
          Effect.succeed('data 1\ndata 2\nFAIL\ndata 4')
      };
    }
  }
) {}

// Process a single line
const processLine = (line: string): Effect.Effect<void, ProcessError> =>
  line === 'FAIL'
    ? Effect.fail(ProcessError('Failed to process line'))
    : Effect.sync(() => console.log(`Processed: ${line}`));

// Create and process the file
const program = Effect.gen(function* (_) {
  const fileService = yield* FileService;
  const { filePath } = yield* fileService.createTempFile();
  
  const cleanup = fileService.cleanup(filePath);
  
  const content = yield* fileService.readFile(filePath);
  const lines = content.split('\n');
  
  // Process each line
  const result = yield* Effect.forEach(
    lines,
    line => processLine(line),
    { concurrency: 1 }
  );
  
  yield* cleanup;
  return result;
});

// Run the program with FileService layer
Effect.runPromise(
  Effect.catchAll(
    Effect.provide(
      program,
      FileService.Default
    ),
    (error: ProcessError) => Effect.sync(() => 
      console.error('Error:', error.message)
    )
  )
).catch(console.error);