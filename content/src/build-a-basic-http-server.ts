import { HttpServer, HttpServerResponse } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { createServer } from "node:http"

// Create a server layer using Node's createServer and specify the port
const ServerLive = NodeHttpServer.layer(() => createServer(), { port: 3000 })

// Define your HTTP app (here responding "Hello World" to every request)
const HttpLive = HttpServer.serve(HttpServerResponse.text("Hello World"))
  .pipe(Layer.provide(ServerLive))

// Run the server
NodeRuntime.runMain(Layer.launch(HttpLive))