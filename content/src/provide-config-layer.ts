import { Effect, Layer } from "effect";

class ServerConfig extends Effect.Service<ServerConfig>()(
  "ServerConfig",
  {
    sync: () => ({
      port: process.env.PORT ? parseInt(process.env.PORT) : 8080
    })
  }
) {}

const program = Effect.gen(function* () {
  const config = yield* ServerConfig;
  yield* Effect.log(`Starting application on port ${config.port}...`);
});

Effect.runPromise(
  Effect.provide(program, ServerConfig.Default)
).catch(console.error);