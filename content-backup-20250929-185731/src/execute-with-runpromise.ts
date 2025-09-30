import { Effect } from "effect";

const program = Effect.succeed("Hello, World!").pipe(
  Effect.delay("1 second"),
);

const promise = Effect.runPromise(program);

const programWithLogging = Effect.gen(function* () {
  const result = yield* program;
  yield* Effect.log(result); // Logs "Hello, World!" after 1 second.
  return result;
});

Effect.runPromise(programWithLogging);