import { HttpServer, HttpServerResponse } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer, Effect, Duration } from "effect"
import { createServer } from "node:http"

// Create a server layer using Node's built-in HTTP server
const ServerLive = NodeHttpServer.layer(() => createServer(), { port: 3001 })

// Define your HTTP app (here responding "Hello World" to every request)
const HttpLive = HttpServer.serve(
  Effect.gen(function* (_) {
    yield* Effect.logInfo("Received HTTP request")
    return yield* HttpServerResponse.text("Hello World")
  })
).pipe(Layer.provide(ServerLive))

// Run the server with timeout
const program = Effect.gen(function* (_) {
  yield* Effect.logInfo("Starting HTTP server on port 3001...")
  const serverEffect = Layer.launch(HttpLive)
  yield* Effect.timeout(
    serverEffect,
    Duration.seconds(15)
  ).pipe(
    Effect.catchTag("TimeoutException", () => 
      Effect.logInfo("Server stopped after 15 seconds")
    )
  )
})

Effect.runPromise(program)