import { Effect } from 'effect';

const effect = Effect.fail('Oops!').pipe(
  Effect.matchEffect({
    onFailure: (err) => Effect.logError(`Error: ${err}`),
    onSuccess: (value) => Effect.log(`Success: ${value}`),
  })
);

const program = effect;

Effect.runPromise(program);
