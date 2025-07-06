import { Effect } from 'effect'
import * as HttpRouter from '@effect/platform/HttpRouter'
import * as HttpResponse from '@effect/platform/HttpServerResponse'
import * as HttpServer from '@effect/platform/HttpServer'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'

// handler for "/"
const rootHandler = HttpResponse.text('Welcome to the home page!')

// handler for "/hello"
const helloHandler = HttpResponse.text('Hello, Effect!')

// build router with two routes
const app = HttpRouter.empty.pipe(
  HttpRouter.get('/', Effect.succeed(rootHandler)),
  HttpRouter.get('/hello', Effect.succeed(helloHandler))
)

// program to serve
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
- GET http://localhost:3000/ -> "Welcome to the home page!"
- GET http://localhost:3000/hello -> "Hello, Effect!"
- GET http://localhost:3000/other -> 404 Not Found
*/