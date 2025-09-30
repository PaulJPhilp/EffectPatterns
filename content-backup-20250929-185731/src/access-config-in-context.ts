import { Config, Effect, Layer } from "effect";

// Define config service
class AppConfig extends Effect.Service<AppConfig>()(
  "AppConfig",
  {
    sync: () => ({
      host: "localhost",
      port: 3000
    })
  }
) {}

// Create program that uses config
const program = Effect.gen(function* () {
  const config = yield* AppConfig;
  yield* Effect.log(`Starting server on http://${config.host}:${config.port}`);
});

// Run the program with default config
Effect.runPromise(
  Effect.provide(program, AppConfig.Default)
);