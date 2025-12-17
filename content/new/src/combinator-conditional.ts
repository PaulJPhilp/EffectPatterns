import { Effect, Option, Either } from "effect";

// Effect: Branch based on a condition
const effect = Effect.if(
  { onTrue: () => Effect.succeed("yes"), onFalse: () => Effect.succeed("no") },
  true
); // Effect<string>

// Option: Conditionally create an Option
const option = true ? Option.some("yes") : Option.none(); // Option<string> (Some("yes"))

// Either: Conditionally create an Either
const either = true ? Either.right("yes") : Either.left("error"); // Either<string, string> (Right("yes"))

// Using conditional logic
const conditional = 5 > 3 ? "greater" : "less"; // conditional evaluation