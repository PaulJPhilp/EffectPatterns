import { Effect, Duration } from "effect";
import { NodeContext, NodeHttpServer } from "@effect/platform-node";
import { createServer } from "node:http";

const PORT = 3459; // Changed port to avoid conflicts

// Define HTTP Server service
class JsonServer extends Effect.Service<JsonServer>()("JsonServer", {
  sync: () => ({
    handleRequest: () =>
      Effect.succeed({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Hello, JSON!",
          timestamp: new Date().toISOString(),
        }),
      }),
  }),
}) {}

// Create and run the server
const program = Effect.gen(function* (_) {
  const jsonServer = yield* JsonServer;

  // Create and start HTTP server
  const server = createServer((req, res) => {
    Effect.runPromise(jsonServer.handleRequest()).then(
      (response) => {
        res.writeHead(response.status, response.headers);
        res.end(response.body);
        // Log the response for demonstration
        Effect.runPromise(
          Effect.logInfo(`Sent JSON response: ${response.body}`)
        );
      },
      (error) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
        Effect.runPromise(Effect.logError(`Request error: ${error.message}`));
      }
    );
  });

  // Start server with error handling
  yield* Effect.async<void, Error>((resume) => {
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        resume(Effect.fail(new Error(`Port ${PORT} is already in use`)));
      } else {
        resume(Effect.fail(error));
      }
    });

    server.listen(PORT, () => {
      resume(Effect.succeed(void 0));
    });
  });

  yield* Effect.logInfo(`Server running at http://localhost:${PORT}`);
  yield* Effect.logInfo("Try: curl http://localhost:3459");

  // Run for a short time to demonstrate
  yield* Effect.sleep(Duration.seconds(3));

  // Shutdown gracefully
  yield* Effect.sync(() => server.close());
  yield* Effect.logInfo("Server shutdown complete");
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* (_) {
      yield* Effect.logError(`Server error: ${error.message}`);
      return error;
    })
  ),
  Effect.provide(JsonServer.Default),
  Effect.provide(NodeContext.layer)
);

// Run the program
Effect.runPromise(program);
