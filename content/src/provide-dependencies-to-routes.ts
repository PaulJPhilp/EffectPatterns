import * as HttpRouter from "@effect/platform/HttpRouter";
import * as HttpResponse from "@effect/platform/HttpServerResponse";
import * as HttpServer from "@effect/platform/HttpServer";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Effect, Duration, Fiber } from "effect/index";
import { Data } from "effect";

// 1. Define the service interface using Effect.Service
export class Database extends Effect.Service<Database>()("Database", {
  sync: () => ({
    getUser: (id: string) =>
      id === "123"
        ? Effect.succeed({ name: "Paul" })
        : Effect.fail(new UserNotFoundError({ id })),
  }),
}) {}

class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  id: string;
}> {}

// handler producing a `HttpServerResponse`
const userHandler = Effect.flatMap(HttpRouter.params, (p) =>
  Effect.flatMap(Database, (db) => db.getUser(p["userId"] ?? "")).pipe(
    Effect.flatMap(HttpResponse.json)
  )
);

// assemble router & server
const app = HttpRouter.empty.pipe(
  HttpRouter.get("/users/:userId", userHandler)
);

// Create the server effect with all dependencies
const serverEffect = HttpServer.serveEffect(app).pipe(
  Effect.provide(Database.Default),
  Effect.provide(
    NodeHttpServer.layer(
      () => require("node:http").createServer(),
      { port: 3458 }
    )
  )
);

// Create program that manages server lifecycle
const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting server on port 3458...");

  const serverFiber = yield* Effect.scoped(serverEffect).pipe(Effect.fork);

  yield* Effect.logInfo("Server started successfully on http://localhost:3458");
  yield* Effect.logInfo("Try: curl http://localhost:3458/users/123");
  yield* Effect.logInfo("Try: curl http://localhost:3458/users/456");

  // Run for a short time to demonstrate
  yield* Effect.sleep(Duration.seconds(3));

  yield* Effect.logInfo("Shutting down server...");
  yield* Fiber.interrupt(serverFiber);
  yield* Effect.logInfo("Server shutdown complete");
});

// Run the program
NodeRuntime.runMain(program);
