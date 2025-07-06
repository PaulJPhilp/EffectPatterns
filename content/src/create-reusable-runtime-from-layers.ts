import { Effect, Layer, Runtime } from "effect";

class GreeterService extends Effect.Tag("Greeter")<GreeterService, any> {}
const GreeterLive = Layer.succeed(GreeterService, {});

const runtime = Layer.toRuntime(GreeterLive);
const run = Runtime.runPromise(runtime);

// In a server, you would reuse `run` for every request.
run(Effect.log("Hello"));