import { Effect } from "effect";

// Define MyService using Effect.Service pattern
export class MyService extends Effect.Service<MyService>()(
  "MyService",
  {
    sync: () => ({
      doSomething: () => Effect.succeed("done")
    })
  }
) {}
