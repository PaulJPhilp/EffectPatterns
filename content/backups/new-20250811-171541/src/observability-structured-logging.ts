import { Effect } from 'effect';

const userId = 42;

const program = Effect.gen(function* () {
  yield* Effect.log('Starting the application');
  yield* Effect.logInfo('User signed in');
  yield* Effect.logError('Failed to connect to database');
  yield* Effect.logInfo(`Processing user: ${userId}`);
  yield* Effect.log('Beginning workflow');
  // ... do some work
  yield* Effect.logInfo('Workflow step completed');
  // ... handle errors
  yield* Effect.logError('Something went wrong');
});

Effect.runPromise(program);
