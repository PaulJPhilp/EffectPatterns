import { Effect, Data } from "effect";

// Define error type using Data.TaggedError
class HttpError extends Data.TaggedError("HttpError") {}

// Define HTTP client service
export class HttpClient extends Effect.Service<HttpClient>()(
  "HttpClient",
  {
    // Provide default implementation
    sync: () => ({
      getUrl: (url: string) =>
        Effect.tryPromise({
          try: () => fetch(url),
          catch: (error) => new HttpError()
        })
    })
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const client = yield* HttpClient;
  const response = yield* client.getUrl("https://api.example.com");
  return response;
});

// Run with default implementation
Effect.runPromise(
  Effect.provide(
    program,
    HttpClient.Default
  )
);