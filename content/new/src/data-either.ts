import { Either } from "effect";

// Create a Right (success) or Left (failure)
const success = Either.right(42); // Either<never, number>
const failure = Either.left("Something went wrong"); // Either<string, never>

// Pattern match on Either
const result = success.pipe(
  Either.match({
    onLeft: (err) => `Error: ${err}`,
    onRight: (value) => `Value: ${value}`,
  })
); // string

// Combine multiple Eithers and accumulate errors
const e1 = Either.right(1);
const e2 = Either.left("fail1");
const e3 = Either.left("fail2");

const all = Either.all([e1, e2, e3]); // Either<string, [number, never, never]>
const rights = [e1, e2, e3].filter(Either.isRight); // Right values only
const lefts = [e1, e2, e3].filter(Either.isLeft); // Left values only
