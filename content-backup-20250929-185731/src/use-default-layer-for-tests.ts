import { Effect } from "effect";

// Define MyService using Effect.Service pattern
class MyService extends Effect.Service<MyService>()(
  "MyService",
  {
    sync: () => ({
      doSomething: () => 
        Effect.succeed("done").pipe(
          Effect.tap(() => Effect.log("MyService did something!"))
        )
    })
  }
) {}

// Create a program that uses MyService
const program = Effect.gen(function* () {
  yield* Effect.log("Getting MyService...");
  const service = yield* MyService;
  
  yield* Effect.log("Calling doSomething()...");
  const result = yield* service.doSomething();
  
  yield* Effect.log(`Result: ${result}`);
});

// Run the program with default service implementation
Effect.runPromise(
  Effect.provide(program, MyService.Default)
);