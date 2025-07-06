// OLD
// import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

// NEW
import * as HttpRouter from '@effect/platform/HttpRouter'
import * as HttpResponse from '@effect/platform/HttpServerResponse'
import * as HttpServer from '@effect/platform/HttpServer'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Effect } from 'effect/index'
import { Data } from 'effect'

// 1. Define the service interface using Effect.Service
export class Database extends Effect.Service<Database>()(
  "Database",
  {
    sync: () => ({
      getUser: (id: string) =>
        id === "123"
          ? Effect.succeed({ name: "Paul" })
          : Effect.fail(new UserNotFoundError({ id }))
    })
  }
) {}

class UserNotFoundError extends Data.TaggedError('UserNotFoundError')<{ id: string }> {}

// handler producing a `HttpServerResponse`
const userHandler = Effect.flatMap(HttpRouter.params, (p) =>
  Effect.flatMap(Database, (db) => db.getUser(p["userId"] ?? "")).pipe(
    Effect.flatMap(HttpResponse.json)
  )
)

// assemble router & server
const app = HttpRouter.empty.pipe(
  HttpRouter.get("/users/:userId", userHandler)
)

const program = Effect.scoped(
  HttpServer.serveEffect(app).pipe(
  Effect.provide(Database.Default),
  // Node adapter that actually listens on port 3000
  Effect.provide(NodeHttpServer.layer(
    () => require('node:http').createServer(), // factory
    { port: 3000 }                            // options
  ))
)
)

NodeRuntime.runMain(program)