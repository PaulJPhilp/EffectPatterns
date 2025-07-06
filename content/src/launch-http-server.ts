import { Effect } from 'effect';
import { Http, NodeHttpServer, NodeRuntime } from '@effect/platform-node';

// An Http.App is an Effect that takes a request and returns a response.
// For this basic server, we ignore the request and always return the same response.
const app = Http.response.text('Hello, World!');

// Http.server.serve takes our app and returns an Effect that will run the server.
// We provide the NodeHttpServer.layer to specify the port and the server implementation.
const program = Http.server.serve(app).pipe(
  Effect.provide(NodeHttpServer.layer({ port: 3000 }))
);

// NodeRuntime.runMain is used to execute a long-running application.
// It ensures the program runs forever and handles graceful shutdown.
NodeRuntime.runMain(program);

/*
To run this:
1. Save as index.ts
2. Run `npx tsx index.ts`
3. Open http://localhost:3000 in your browser.
*/