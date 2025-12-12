import { Effect } from "effect";

// Effect: Run different Effects on success or failure
const effect = Effect.fail("Oops!").pipe(
  Effect.matchEffect({
    onFailure: (err) => Effect.logError(`Error: ${err}`),
    onSuccess: (value) => Effect.log(`Success: ${value}`),
  })
); // Effect<void>