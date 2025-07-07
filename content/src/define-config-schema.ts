import { Config, Effect, ConfigProvider, Layer } from "effect"

const ServerConfig = Config.nested("SERVER")(
  Config.all({
    host: Config.string("HOST"),
    port: Config.number("PORT"),
  })
)

// Example program that uses the config
const program = Effect.gen(function* () {
  const config = yield* ServerConfig
  yield* Effect.logInfo(`Server config loaded: ${JSON.stringify(config)}`)
})

// Create a config provider with test values
const TestConfig = ConfigProvider.fromMap(
  new Map([
    ["SERVER.HOST", "localhost"],
    ["SERVER.PORT", "3000"]
  ])
)

// Run with test config
Effect.runPromise(
  Effect.provide(
    program,
    Layer.setConfigProvider(TestConfig)
  )
)