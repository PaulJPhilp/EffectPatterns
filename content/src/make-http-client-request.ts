import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import * as HttpRouter from '@effect/platform/HttpRouter'
import * as HttpServer from '@effect/platform/HttpServer'
import * as HttpResponse from '@effect/platform/HttpServerResponse'
import { Console, Data, Effect, Layer } from 'effect'

class UserNotFoundError extends Data.TaggedError('UserNotFoundError')<{ id: string }> { }

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
) { }

const userHandler = Effect.flatMap(HttpRouter.params, (p) =>
  Effect.flatMap(Database, (db) => db.getUser(p["userId"] ?? "")).pipe(
    Effect.flatMap(HttpResponse.json)
  )
)

const app = HttpRouter.empty.pipe(
  HttpRouter.get("/users/:userId", userHandler)
)

const server = NodeHttpServer.layer(
  () => require('node:http').createServer(),
  { port: 3000 }
)

const serverLayer = HttpServer.serve(app)

const mainLayer = Layer.merge(
  Database.Default,
  server
)

const program = Effect.gen(function*(_) {
  yield* Console.log('Server started on http://localhost:3000')
  const layer = Layer.provide(serverLayer, mainLayer)
  yield* Layer.launch(layer)
})

NodeRuntime.runMain(program)
