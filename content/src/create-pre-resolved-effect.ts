import { Effect, Data } from "effect";

const successEffect = Effect.succeed(42);

class MyError extends Data.TaggedError("MyError") {}
const failureEffect = Effect.fail(new MyError());