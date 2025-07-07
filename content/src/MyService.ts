import { Effect } from "effect";

// Define MyService using Effect.Service pattern
export class MyService extends Effect.Service<MyService>()("MyService", {
  sync: () => ({
    doSomething: () => Effect.succeed("done"),
  }),
}) {}

// Demonstrate using the service
const program = Effect.gen(function* () {
  const myService = yield* MyService;
  const result = yield* myService.doSomething();
  yield* Effect.logInfo(`MyService result: ${result}`);
});

Effect.runPromise(Effect.provide(program, MyService.Default));
