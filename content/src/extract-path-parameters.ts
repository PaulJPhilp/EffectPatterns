import { Effect } from 'effect'
import * as HttpRouter from '@effect/platform/HttpRouter'
import * as HttpResponse from '@effect/platform/HttpServerResponse'
import * as HttpServer from '@effect/platform/HttpServer'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'

// handler: greets user using path param
const greetUser = Effect.flatMap(HttpRouter.params, (p) =>
  HttpResponse.text(`Hello, user ${p['userId'] ?? ''}!`)
)

// build router
const app = HttpRouter.empty.pipe(
  HttpRouter.get('/users/:userId', greetUser)
)

const program = Effect.scoped(
  HttpServer.serveEffect(app).pipe(
    Effect.provide(
      NodeHttpServer.layer(
        () => require('node:http').createServer(),
        { port: 3000 }
      )
    )
  )
)

NodeRuntime.runMain(program)

/*
To run this:
- GET http://localhost:3000/users/123 -> "Hello, user 123!"
- GET http://localhost:3000/users/abc -> "Hello, user abc!"
- GET http://localhost:3000/users/ -> 404 Not Found
*/