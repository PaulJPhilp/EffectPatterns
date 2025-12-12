import { Effect } from "effect";

// Trace a database query with a custom span
const fetchUser = Effect.withSpan(
  "db.fetchUser",
  Effect.sync(() => {
    // ...fetch user from database
    return { id: 1, name: "Alice" };
  })
);

// Trace an HTTP request with additional attributes
const fetchData = Effect.withSpan(
  "http.fetchData",
  Effect.tryPromise({
    try: () => fetch("https://api.example.com/data").then((res) => res.json()),
    catch: (err) => `Network error: ${String(err)}`,
  }),
  { attributes: { url: "https://api.example.com/data" } }
);

// Use spans in a workflow
const program = Effect.gen(function* () {
  yield* Effect.withSpan("workflow.start", Effect.log("Starting workflow"));
  const user = yield* fetchUser;
  yield* Effect.withSpan(
    "workflow.end",
    Effect.log(`Fetched user: ${user.name}`)
  );
});