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