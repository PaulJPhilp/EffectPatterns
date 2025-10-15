import { Effect, Either, Option } from 'effect';

const option = Option.some(42);

const either = Either.left('error');

const options = [Option.some(1), Option.none(), Option.some(3)];
const presentValues = options.filter(Option.isSome).map((o) => o.value);

const program = Effect.gen(function* () {
  if (Option.isSome(option)) {
    yield* Effect.log(`We have a value: ${option.value}`);
  } else if (Option.isNone(option)) {
    yield* Effect.log('No value present');
  }

  if (Either.isRight(either)) {
    yield* Effect.log(`Success: ${either.right}`);
  } else if (Either.isLeft(either)) {
    yield* Effect.log(`Failure: ${either.left}`);
  }

  yield* Effect.log(`Present values: [${presentValues.join(', ')}]`);
});

Effect.runPromise(program);
