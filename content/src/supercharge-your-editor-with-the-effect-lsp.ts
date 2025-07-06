import { Effect } from "effect";

// Define Logger service using Effect.Service pattern
class Logger extends Effect.Service<Logger>()(
  "Logger",
  {
    sync: () => ({
      log: (msg: string) => Effect.sync(() => console.log(`LOG: ${msg}`))
    })
  }
) {}

const program = Effect.succeed(42).pipe(
  Effect.map((n) => n.toString()),
  Effect.flatMap((s) => Effect.log(s)),
  Effect.provide(Logger.Default)
);

// Run the program
Effect.runPromise(program);