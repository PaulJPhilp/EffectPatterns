import { BigDecimal, Effect } from 'effect';

const aOpt = BigDecimal.fromString('0.1');
const bOpt = BigDecimal.fromString('0.2');

const program = Effect.gen(function* () {
  if (aOpt._tag === 'Some' && bOpt._tag === 'Some') {
    const a = aOpt.value;
    const b = bOpt.value;
    const sum = BigDecimal.sum(a, b);
    const product = BigDecimal.multiply(a, b);
    // To represent 0.3, use make(3n, 1) for 0.3 (3 * 10^-1)
    const expected = BigDecimal.make(3n, 1);
    const isEqual = BigDecimal.equals(sum, expected);
    const asString = sum.toString();
    const asNumber = BigDecimal.unsafeToNumber(sum);
    yield* Effect.log(`a: ${a.toString()}`);
    yield* Effect.log(`b: ${b.toString()}`);
    yield* Effect.log(`sum: ${sum.toString()}`);
    yield* Effect.log(`product: ${product.toString()}`);
    yield* Effect.log(`sum equals 0.3: ${isEqual}`);
    yield* Effect.log(`sum as string: ${asString}`);
    yield* Effect.log(`sum as number: ${asNumber}`);
  } else {
    yield* Effect.log('Failed to parse one or both BigDecimal values.');
  }
});

Effect.runPromise(
  program.pipe(Effect.catchAll(() => Effect.succeed(undefined)))
);
