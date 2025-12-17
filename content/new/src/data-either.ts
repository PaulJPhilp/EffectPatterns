import { Either } from "effect";

// Create a Right (success) or Left (failure)
const success = Either.right(42); // Either<string, number>
const failure = Either.left("Something went wrong"); // Either<string, number>

// Pattern match on Either
const result = success.pipe(
  Either.match({
    onLeft: (err) => `Error: ${err}`,
    onRight: (value) => `Value: ${value}`,
  })
); // string

// Combine multiple Eithers and accumulate errors
const e1: Either.Either<string, number> = Either.right(1);
const e2: Either.Either<string, number> = Either.left("fail1");
const e3: Either.Either<string, number> = Either.left("fail2");

const all = [e1, e2, e3].filter(Either.isRight); // Either<string, number>[]
const errors = [e1, e2, e3].filter(Either.isLeft); // Either<string, number>[]