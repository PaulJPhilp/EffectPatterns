import { Effect, Data } from "effect";

interface HttpErrorType {
  readonly _tag: "HttpError";
  readonly error: unknown;
}

const HttpError = Data.tagged<HttpErrorType>("HttpError");

class HttpClient extends Effect.Service<HttpClient>()(
  "HttpClient",
  {
    sync: () => ({
      get: <T>(url: string): Effect.Effect<T, HttpErrorType> =>
        Effect.tryPromise({
          try: () => fetch(url).then((res) => res.json()),
          catch: (error) => HttpError({ error })
        })
    })
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const client = yield* HttpClient;
  const data = yield* client.get<{ title: string }>("https://api.example.com/data");
  return data;
});