import { Effect, Schema } from "effect";
import { createServer, IncomingMessage, ServerResponse } from "http";

// Define the expected structure of the request body using Schema
const CreateUser = Schema.Struct({
  name: Schema.String,
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
});

type User = Schema.Schema.Type<typeof CreateUser>;

// Helper to read request body
const readBody = (request: IncomingMessage) =>
  Effect.promise(() => new Promise<unknown>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", chunk => chunks.push(chunk));
    request.on("end", () => {
      try {
        const rawBody = Buffer.concat(chunks).toString();
        resolve(JSON.parse(rawBody));
      } catch (e) {
        reject(new Error("Failed to parse request body"));
      }
    });
    request.on("error", reject);
  }));

// Create a request handler
const handleRequest = (request: IncomingMessage, response: ServerResponse) =>
  Effect.gen(function* (_) {
    // Only handle POST /users
    if (request.method !== "POST" || request.url !== "/users") {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Not Found" }));
      return;
    }

    try {
      // Read and validate request body
      const body = yield* readBody(request);
      const validationResult = yield* Effect.try({
        try: () => Schema.decodeUnknown(CreateUser)(body),
        catch: (e) => new Error(`Invalid request body: ${String(e)}`)
      });

      const user = yield* validationResult;

      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ message: `Successfully created user: ${user.name}` }));
    } catch (error) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: String(error) }));
    }
  });

// Create and start the server
const server = createServer((req, res) => {
  Effect.runPromise(handleRequest(req, res));
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});

/*
To run this:
- POST http://localhost:3000/users with body {"name": "Paul", "email": "paul@effect.com"}
  -> 200 OK "Successfully created user: Paul"

- POST http://localhost:3000/users with body {"name": "Paul"}
  -> 400 Bad Request with a JSON body explaining the 'email' field is missing.
*/